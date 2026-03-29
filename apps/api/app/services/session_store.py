from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from judgewrite_core.models import (
    ArchiveCaseItem,
    CaseFile,
    CaseSession,
    GenerationResult,
    ReviewState,
    StructuredCase,
    WorkflowStage,
)

from ..config import get_data_file


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")


def _default_workflow_stages() -> list[WorkflowStage]:
    return [
        WorkflowStage(key="upload", label="上传归集", status="pending", progress=0, detail="等待上传卷宗"),
        WorkflowStage(key="extract", label="要素抽取", status="pending", progress=0, detail="等待解析案件要素"),
        WorkflowStage(key="generate", label="文书生成", status="pending", progress=0, detail="等待生成裁判文书"),
    ]


def _build_title(parsed_text: str) -> str:
    lines = [line.strip() for line in parsed_text.splitlines() if line.strip()]
    if len(lines) >= 3:
        return f"{lines[1][:16]} · {lines[2][:16]}"
    if lines:
        return lines[0][:24]
    return "未命名案件"


class SessionStore:
    def __init__(self, file_path: Path | None = None) -> None:
        self.file_path = file_path or get_data_file("runtime_cases.json")
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self.file_path.write_text("[]", encoding="utf-8")
        self._sessions: dict[str, CaseSession] = self._load_sessions()

    def _load_sessions(self) -> dict[str, CaseSession]:
        payload = json.loads(self.file_path.read_text(encoding="utf-8"))
        sessions = [CaseSession.model_validate(item) for item in payload]
        return {session.case_id: session for session in sessions}

    def _persist(self) -> None:
        ordered = sorted(self._sessions.values(), key=lambda item: item.updated_at, reverse=True)
        self.file_path.write_text(
            json.dumps([session.model_dump() for session in ordered], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _replace(self, session: CaseSession) -> CaseSession:
        self._sessions[session.case_id] = session
        self._persist()
        return session

    def create(self, parsed_text: str, files: list[CaseFile]) -> CaseSession:
        case_id = f"case-{uuid4().hex[:8]}"
        stages = _default_workflow_stages()
        stages[0] = stages[0].model_copy(update={"status": "completed", "progress": 100, "detail": "卷宗材料上传并完成文本归集"})
        session = CaseSession(
            case_id=case_id,
            parsed_text=parsed_text,
            files=files,
            title=_build_title(parsed_text),
            workflow_status="uploaded",
            workflow_stages=stages,
            updated_at=_now_iso(),
        )
        return self._replace(session)

    def get(self, case_id: str) -> CaseSession:
        if case_id not in self._sessions:
            raise KeyError(case_id)
        return self._sessions[case_id]

    def list_cases(self) -> list[ArchiveCaseItem]:
        items: list[ArchiveCaseItem] = []
        for session in self._sessions.values():
            case_type = session.structured_case.case_type if session.structured_case else "待解析"
            style_name = (
                session.generation_result.style_profile.judge_name
                if session.generation_result
                else (session.selected_style_id or "待选择画像")
            )
            status = "已归档" if session.generation_result else ("分析中" if session.structured_case else "已上传")
            items.append(
                ArchiveCaseItem(
                    case_id=session.case_id,
                    title=session.title or _build_title(session.parsed_text),
                    case_type=case_type,
                    style_profile=style_name,
                    updated_at=session.updated_at or _now_iso(),
                    status=status,
                    training_enabled=session.training_enabled,
                )
            )
        return sorted(items, key=lambda item: item.updated_at, reverse=True)

    def update_stage(self, case_id: str, stage_key: str, *, status: str, progress: int, detail: str) -> CaseSession:
        session = self.get(case_id)
        updated_stages: list[WorkflowStage] = []
        for stage in session.workflow_stages:
            if stage.key == stage_key:
                updated_stages.append(stage.model_copy(update={"status": status, "progress": progress, "detail": detail}))
            else:
                updated_stages.append(stage)
        updated = session.model_copy(update={"workflow_stages": updated_stages, "updated_at": _now_iso()})
        return self._replace(updated)

    def set_workflow_status(self, case_id: str, workflow_status: str) -> CaseSession:
        session = self.get(case_id)
        updated = session.model_copy(update={"workflow_status": workflow_status, "updated_at": _now_iso()})
        return self._replace(updated)

    def save_extract_result(self, case_id: str, structured_case: StructuredCase) -> CaseSession:
        session = self.get(case_id)
        updated = session.model_copy(update={"structured_case": structured_case, "workflow_status": "extracted", "updated_at": _now_iso()})
        return self._replace(updated)

    def save_generation_result(self, case_id: str, style_id: str, result: GenerationResult) -> CaseSession:
        session = self.get(case_id)
        updated = session.model_copy(
            update={
                "generation_result": result,
                "selected_style_id": style_id,
                "workflow_status": "generated",
                "archived": True,
                "updated_at": _now_iso(),
                "review_state": ReviewState(
                    draft=result.draft,
                    issue_states={},
                    citation_states={case.case_id: "pending" for case in result.similar_cases},
                    updated_at=_now_iso(),
                ),
            }
        )
        return self._replace(updated)

    def set_selected_style(self, case_id: str, style_id: str) -> CaseSession:
        session = self.get(case_id)
        updated = session.model_copy(update={"selected_style_id": style_id, "updated_at": _now_iso()})
        return self._replace(updated)

    def save_review_state(
        self,
        case_id: str,
        *,
        draft: str,
        issue_states: dict[str, str],
        citation_states: dict[str, str],
    ) -> CaseSession:
        session = self.get(case_id)
        review_state = ReviewState(
            draft=draft,
            issue_states=issue_states,
            citation_states=citation_states,
            updated_at=_now_iso(),
        )
        updated = session.model_copy(update={"review_state": review_state, "updated_at": review_state.updated_at})
        return self._replace(updated)

    def get_status_payload(self, case_id: str) -> dict:
        session = self.get(case_id)
        return {
            "case_id": session.case_id,
            "title": session.title,
            "files": [file.model_dump() for file in session.files],
            "workflow_status": session.workflow_status,
            "workflow_stages": [stage.model_dump() for stage in session.workflow_stages],
            "structured_case": session.structured_case.model_dump() if session.structured_case else None,
            "generation_result": session.generation_result.model_dump() if session.generation_result else None,
            "review_state": session.review_state.model_dump() if session.review_state else None,
            "updated_at": session.updated_at,
        }

    def set_training_enabled(self, case_id: str, enabled: bool) -> CaseSession:
        session = self.get(case_id)
        updated = session.model_copy(update={"training_enabled": enabled, "updated_at": _now_iso()})
        return self._replace(updated)

    def delete_case(self, case_id: str) -> None:
        if case_id not in self._sessions:
            raise KeyError(case_id)
        del self._sessions[case_id]
        self._persist()


store = SessionStore()
