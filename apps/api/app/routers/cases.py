from __future__ import annotations

import threading
import time
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from judgewrite_core import AppSettings, ArchiveCaseItem, CaseFile, GenerationRequest, JudgeWriteOrchestrator

from ..services.archive_store import archive_store
from ..services.document_parser import parse_uploaded_document
from ..services.settings_store import settings_store
from ..services.session_store import store

router = APIRouter(prefix="/api", tags=["judgewrite"])
orchestrator = JudgeWriteOrchestrator()


def _guess_category(filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return "PDF卷宗"
    if "起诉" in filename:
        return "起诉状"
    if "答辩" in filename:
        return "答辩状"
    if "证据" in filename:
        return "证据材料"
    if "庭审" in filename:
        return "庭审笔录"
    if name.endswith(".txt") or name.endswith(".md"):
        return "卷宗文本"
    return "待确认材料"


async def _read_upload(file: UploadFile) -> str:
    content = await file.read()
    try:
        return parse_uploaded_document(file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{file.filename} 解析失败：{exc}") from exc


class ExtractRequest(BaseModel):
    case_id: str


class GenerateRequest(BaseModel):
    case_id: str
    style_id: str = Field(default="judge_zhang")


class ToggleTrainingRequest(BaseModel):
    enabled: bool


class SaveReviewRequest(BaseModel):
    draft: str
    issue_states: dict[str, str] = Field(default_factory=dict)
    citation_states: dict[str, str] = Field(default_factory=dict)


def _build_archive_status(case_id: str) -> ArchiveCaseItem:
    session = store.get(case_id)
    case_type = session.structured_case.case_type if session.structured_case else "待解析"
    style_profile = (
        session.generation_result.style_profile.judge_name
        if session.generation_result
        else (session.selected_style_id or "待选择画像")
    )
    status_mapping = {
        "idle": "待处理",
        "uploaded": "已上传",
        "extracting": "要素抽取中",
        "extracted": "已抽取",
        "generating": "文书生成中",
        "generated": "已归档",
        "failed": "处理失败",
    }
    return ArchiveCaseItem(
        case_id=session.case_id,
        title=session.title or session.case_id,
        case_type=case_type,
        style_profile=style_profile,
        updated_at=session.updated_at,
        status=status_mapping.get(session.workflow_status, "处理中"),
        training_enabled=session.training_enabled,
    )


def _sync_archive(case_id: str) -> None:
    archive_store.upsert(_build_archive_status(case_id))


def _run_extract(case_id: str) -> None:
    try:
        store.set_workflow_status(case_id, "extracting")
        store.update_stage(case_id, "extract", status="in_progress", progress=15, detail="正在识别案由与当事人")
        time.sleep(0.25)
        store.update_stage(case_id, "extract", status="in_progress", progress=45, detail="正在抽取诉讼请求与事实陈述")
        time.sleep(0.25)
        session = store.get(case_id)
        structured_case = orchestrator.extract(session.parsed_text)
        store.save_extract_result(case_id, structured_case)
        store.update_stage(case_id, "extract", status="completed", progress=100, detail="案件要素抽取完成")
        _sync_archive(case_id)
    except Exception:
        store.set_workflow_status(case_id, "failed")
        store.update_stage(case_id, "extract", status="failed", progress=100, detail="案件要素抽取失败")
        _sync_archive(case_id)


def _run_generate(case_id: str, style_id: str) -> None:
    try:
        store.set_selected_style(case_id, style_id)
        store.set_workflow_status(case_id, "generating")
        store.update_stage(case_id, "generate", status="in_progress", progress=10, detail="正在构建生成任务")
        time.sleep(0.25)
        store.update_stage(case_id, "generate", status="in_progress", progress=30, detail="正在生成裁判逻辑")
        time.sleep(0.25)
        store.update_stage(case_id, "generate", status="in_progress", progress=55, detail="正在进行风格重写")
        time.sleep(0.25)
        store.update_stage(case_id, "generate", status="in_progress", progress=78, detail="正在进行引用增强与校验")
        session = store.get(case_id)
        style = orchestrator.get_style(style_id)
        history = orchestrator.repository.get_history_snippets(style_id)
        result = orchestrator.generate(
            GenerationRequest(
                parsed_text=session.parsed_text,
                style_profile=style,
                historical_cases=history,
            )
        )
        store.save_generation_result(case_id, style_id, result)
        store.update_stage(case_id, "generate", status="completed", progress=100, detail="裁判文书生成完成")
        _sync_archive(case_id)
    except Exception:
        store.set_workflow_status(case_id, "failed")
        store.update_stage(case_id, "generate", status="failed", progress=100, detail="裁判文书生成失败")
        _sync_archive(case_id)


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/styles")
def list_styles():
    return orchestrator.list_styles()


@router.get("/settings")
def get_settings():
    return settings_store.load()


@router.put("/settings")
def update_settings(payload: AppSettings):
    return settings_store.save(payload)


@router.get("/archive")
def list_archive():
    return archive_store.list_items()


@router.get("/archive/{case_id}")
def get_archive_case(case_id: str):
    try:
        return store.get_status_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="该案件暂无可回读的运行态详情。") from exc


@router.delete("/archive/{case_id}")
def delete_archive_case(case_id: str):
    archive_store.delete(case_id)
    try:
        store.delete_case(case_id)
    except KeyError:
        pass
    return {"deleted": True}


@router.patch("/archive/{case_id}/training")
def toggle_archive_training(case_id: str, payload: ToggleTrainingRequest):
    item = archive_store.set_training_enabled(case_id, payload.enabled)
    try:
        store.set_training_enabled(case_id, payload.enabled)
    except KeyError:
        pass
    return item


@router.put("/archive/{case_id}/review")
def save_archive_review(case_id: str, payload: SaveReviewRequest):
    try:
        session = store.get(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="案件不存在，无法保存审阅结果。") from exc
    if session.generation_result is None:
        raise HTTPException(status_code=409, detail="案件尚未生成文书，暂不能保存审阅结果。")
    store.save_review_state(
        case_id,
        draft=payload.draft,
        issue_states=payload.issue_states,
        citation_states=payload.citation_states,
    )
    _sync_archive(case_id)
    return store.get_status_payload(case_id)


@router.get("/cases/{case_id}/status")
def get_case_status(case_id: str):
    try:
        return store.get_status_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="案件不存在。") from exc


@router.post("/upload")
async def upload_case(files: Annotated[list[UploadFile], File(...)]) -> dict:
    parsed_chunks = []
    case_files: list[CaseFile] = []
    for item in files:
        text = await _read_upload(item)
        parsed_chunks.append(f"【{item.filename}】\n{text.strip()}")
        case_files.append(CaseFile(name=item.filename, category=_guess_category(item.filename), content=text.strip()))
    session = store.create("\n\n".join(parsed_chunks).strip(), case_files)
    _sync_archive(session.case_id)
    return {
        "case_id": session.case_id,
        "parsed_text": session.parsed_text,
        "files": [file.model_dump() for file in session.files],
        "workflow_status": session.workflow_status,
        "workflow_stages": [stage.model_dump() for stage in session.workflow_stages],
    }


@router.post("/extract")
def extract_case(payload: ExtractRequest):
    try:
        store.get(payload.case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="案件不存在，请先上传材料。") from exc
    threading.Thread(target=_run_extract, args=(payload.case_id,), daemon=True).start()
    return {"accepted": True, "case_id": payload.case_id}


@router.post("/generate")
def generate_document(payload: GenerateRequest):
    try:
        store.get(payload.case_id)
        orchestrator.get_style(payload.style_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="案件或风格不存在。") from exc
    threading.Thread(target=_run_generate, args=(payload.case_id, payload.style_id), daemon=True).start()
    return {"accepted": True, "case_id": payload.case_id}
