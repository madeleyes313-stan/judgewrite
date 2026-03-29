import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteArchiveCase,
  extractCase,
  getArchiveCase,
  generateDocument,
  getCaseStatus,
  getSettings,
  listArchive,
  listStyles,
  saveArchiveReview,
  toggleArchiveTraining,
  updateSettings,
  uploadCase,
} from "../lib/api";
import type {
  AppSettings,
  ArchiveCase,
  CaseStatusResponse,
  GenerateResponse,
  ReviewState,
  StructuredCase,
  StyleProfile,
  UploadResponse,
  WorkflowStage,
} from "../types";

export type View = "upload" | "generate" | "styles" | "archive" | "settings";

export const stageLabels: Record<string, string> = {
  parse: "案件解析",
  reasoning: "裁判推理",
  style: "风格重写",
  enhance: "引用增强",
  validate: "合规校验",
};

type ActiveJob = { caseId: string; phase: "extract" | "generate" } | null;
type FeedbackTone = "success" | "warning" | "error" | "info";

export function useJudgewriteApp() {
  const [view, setView] = useState<View>("upload");
  const [styles, setStyles] = useState<StyleProfile[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState("judge_zhang");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [structuredCase, setStructuredCase] = useState<StructuredCase | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [issueStates, setIssueStates] = useState<Record<string, "pending" | "resolved" | "ignored">>({});
  const [citationStates, setCitationStates] = useState<Record<string, "pending" | "inserted" | "ignored">>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("请先上传卷宗材料并开始生成。");
  const [archiveCases, setArchiveCases] = useState<ArchiveCase[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob>(null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [reviewSyncStatus, setReviewSyncStatus] = useState<{ state: "idle" | "saving" | "saved" | "error"; text: string }>({
    state: "idle",
    text: "待保存",
  });
  const lastSavedReviewRef = useRef("");

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (!activeJob) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const payload = await getCaseStatus(activeJob.caseId);
        applyStatusPayload(payload);

        const completed =
          payload.workflow_status === "failed" ||
          payload.workflow_status === "generated" ||
          (activeJob.phase === "extract" && payload.workflow_status === "extracted");

        if (completed) {
          setBusy(false);
          setActiveJob(null);
          setFeedback({
            tone: payload.workflow_status === "failed" ? "error" : payload.workflow_status === "generated" ? "success" : "info",
            text:
              payload.workflow_status === "failed"
                ? activeJob.phase === "generate"
                  ? "文书生成失败，请检查后重试。"
                  : "要素抽取失败，请检查材料后重试。"
                : payload.workflow_status === "generated"
                  ? "文书生成完成，可继续审阅与导出。"
                  : "案件要素抽取完成。",
          });
          void loadArchiveCases();
        }
      } catch (error) {
        setBusy(false);
        setActiveJob(null);
        setMessage(`状态同步失败：${String(error)}`);
        setFeedback({ tone: "error", text: "后台状态同步失败，请刷新后重试。" });
      }
    }, 700);

    return () => window.clearInterval(timer);
  }, [activeJob]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!settings?.auto_save || !activeCaseId || !generationResult) {
      return;
    }
    const snapshot = serializeReviewSnapshot(draft, issueStates, citationStates);
    if (snapshot === lastSavedReviewRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      void persistReview(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeCaseId, citationStates, draft, generationResult, issueStates, settings?.auto_save]);

  const selectedStyle = useMemo(
    () => styles.find((item) => item.style_id === selectedStyleId) ?? null,
    [selectedStyleId, styles],
  );

  const stageResults = generationResult?.stage_results ?? [];
  const processingFiles = uploadResult?.files?.length ? uploadResult.files : selectedFiles;
  const stylePreviewInput =
    "被告关于驳回起诉的主张，因证据基础不足且未能形成完整抗辩链条，不应得到支持。";
  const stylePreviewOutput = selectedStyle
    ? `本院经审查认为，结合${selectedStyle.common_terms[0] ?? "在案材料"}与既有裁判习惯，当前争议更适合采用“${selectedStyle.logic_structure}”展开说理，并保持${selectedStyle.tone}的行文基调。常见表达可参考“${selectedStyle.signature_phrases[0] ?? "本院认为"}”。`
    : "系统将根据法官历史文书自动生成风格预览。";
  const caseTitle = structuredCase?.parties?.length
    ? `${structuredCase.parties[0] ?? "原告"} 诉 ${structuredCase.parties[1] ?? "被告"}`
    : "新案件文书生成";
  const docketLabel = uploadResult?.case_id ? `案号：${uploadResult.case_id}` : "案号：待生成";
  const processingCount = processingFiles.length;
  const selectedTone = selectedStyle?.tone ?? "逻辑严密";
  const uploadProgressBase = uploadResult ? 100 : busy ? 76 : 0;
  const workflowProgress = generationResult
    ? 100
    : structuredCase
      ? 58
      : uploadResult
        ? 28
        : 0;
  const queueStatusLabel = busy
    ? view === "generate"
      ? "正在生成中"
      : "智能处理中"
    : workflowStages.some((stage) => stage.status === "failed")
      ? "处理失败"
    : uploadResult
      ? "材料已就绪"
      : "等待上传";
  const exportFormat = settings?.default_export_format ?? "Word";

  async function initialize() {
    try {
      const [stylesPayload, archivePayload, settingsPayload] = await Promise.all([
        listStyles(),
        listArchive(),
        getSettings(),
      ]);
      setStyles(stylesPayload);
      setArchiveCases(archivePayload);
      setSettings(settingsPayload);
      if (stylesPayload[0]) {
        const defaultStyle = stylesPayload.find((item) => item.style_id === settingsPayload.default_style_id) ?? stylesPayload[0];
        setSelectedStyleId(defaultStyle.style_id);
      }
    } catch {
      setMessage("尚未连接到 API，请先启动 FastAPI 服务。");
      setFeedback({ tone: "error", text: "API 未连接，请确认本地服务已启动。" });
    }
  }

  function applyStatusPayload(payload: CaseStatusResponse) {
    const nextUploadResult: UploadResponse = {
      case_id: payload.case_id,
      parsed_text: "",
      files: payload.files,
      workflow_status: payload.workflow_status,
      workflow_stages: payload.workflow_stages,
    };
    setActiveCaseId(payload.case_id);
    setUploadResult(nextUploadResult);
    setWorkflowStages(payload.workflow_stages);
    if (payload.structured_case) {
      setStructuredCase(payload.structured_case);
    }
    if (payload.generation_result) {
      setGenerationResult(payload.generation_result);
      setSelectedStyleId(payload.generation_result.style_profile.style_id);
    }
    const nextReviewState = payload.review_state ?? buildDefaultReviewState(payload.generation_result);
    setReviewState(nextReviewState);
    const nextDraft = nextReviewState?.draft ?? payload.generation_result?.draft ?? "";
    const nextIssueStates = normalizeIssueStates(nextReviewState?.issue_states);
    const nextCitationStates = normalizeCitationStates(nextReviewState?.citation_states, payload.generation_result);
    setDraft(nextDraft);
    setIssueStates(nextIssueStates);
    setCitationStates(nextCitationStates);
    lastSavedReviewRef.current = serializeReviewSnapshot(nextDraft, nextIssueStates, nextCitationStates);
    setReviewSyncStatus(
      nextReviewState?.updated_at
        ? { state: "saved", text: `已保存到归档 ${nextReviewState.updated_at}` }
        : { state: "idle", text: "待保存" },
    );
    const activeStage = payload.workflow_stages.find((stage) => stage.status === "in_progress");
    if (activeStage?.detail) {
      setMessage(activeStage.detail);
    } else if (payload.workflow_status === "failed") {
      setMessage("当前任务执行失败，可在对应页面重新尝试。");
    } else if (payload.workflow_status === "generated") {
      setMessage("文书生成完成，可继续编辑、导出或归档。");
    } else if (payload.workflow_status === "extracted") {
      setMessage("要素抽取完成，可以开始生成裁判文书。");
    }
  }

  async function loadArchiveCases() {
    const items = await listArchive();
    setArchiveCases(items);
  }

  async function handleUpload() {
    if (!selectedFiles.length) {
      setMessage("请至少选择一个卷宗文件。");
      return;
    }
    setBusy(true);
    setMessage("正在上传并整理卷宗材料...");
    try {
      const response = await uploadCase(selectedFiles);
      setActiveCaseId(response.case_id);
      setUploadResult(response);
      setStructuredCase(null);
      setGenerationResult(null);
      setReviewState(null);
      setDraft("");
      setIssueStates({});
      setCitationStates({});
      setReviewSyncStatus({ state: "idle", text: "待保存" });
      lastSavedReviewRef.current = "";
      setWorkflowStages(response.workflow_stages);
      setMessage("卷宗上传完成，可继续进行要素抽取和文书生成。");
      setFeedback({ tone: "success", text: "卷宗上传成功，已进入待抽取状态。" });
      setView("upload");
      await loadArchiveCases();
    } catch (error) {
      setMessage(`上传失败：${String(error)}`);
      setFeedback({ tone: "error", text: "卷宗上传失败，请检查材料格式后重试。" });
    } finally {
      setBusy(false);
    }
  }

  async function handleExtract() {
    if (!uploadResult) {
      setMessage("请先上传卷宗材料。");
      return;
    }
    setBusy(true);
    setMessage("正在进行案件要素抽取...");
    try {
      await extractCase(uploadResult.case_id);
      setFeedback({ tone: "info", text: "已发起要素抽取任务，正在后台处理中。" });
      setActiveJob({ caseId: uploadResult.case_id, phase: "extract" });
      setView("generate");
    } catch (error) {
      setBusy(false);
      setMessage(`抽取失败：${String(error)}`);
      setFeedback({ tone: "error", text: "要素抽取失败，请稍后重试。" });
    }
  }

  async function handleGenerate() {
    if (!uploadResult) {
      setMessage("请先上传卷宗材料。");
      return;
    }
    setBusy(true);
    setMessage("正在串联解析、推理、风格化与校验阶段...");
    try {
      await generateDocument(uploadResult.case_id, selectedStyleId);
      setReviewSyncStatus({ state: "idle", text: "待保存" });
      setFeedback({ tone: "info", text: "已发起文书生成任务，请稍候查看结果。" });
      setActiveJob({ caseId: uploadResult.case_id, phase: "generate" });
      setView("generate");
    } catch (error) {
      setBusy(false);
      setMessage(`生成失败：${String(error)}`);
      setFeedback({ tone: "error", text: "文书生成失败，请稍后重试。" });
    }
  }

  async function handleExport() {
    if (!draft.trim()) {
      setFeedback({ tone: "warning", text: "当前暂无可导出的文书内容。" });
      return;
    }
    try {
      const { exportDraft } = await import("../lib/export");
      await exportDraft({
        format: exportFormat === "PDF" || exportFormat === "Word" || exportFormat === "Markdown" ? exportFormat : "txt",
        draft,
        caseId: activeCaseId ?? "judgewrite-draft",
        title: caseTitle,
        selectedStyleName: selectedStyle?.judge_name ?? "待选择画像",
        structuredCase,
      });
      setFeedback({ tone: "success", text: `已按 ${exportFormat} 格式导出文书。` });
    } catch (error) {
      setFeedback({ tone: "error", text: `导出失败：${String(error)}` });
    }
  }

  async function handleToggleTraining(caseId: string, enabled: boolean) {
    const updated = await toggleArchiveTraining(caseId, enabled);
    setArchiveCases((current) => current.map((item) => (item.case_id === caseId ? updated : item)));
    setFeedback({ tone: "success", text: enabled ? "案件已加入训练样本。" : "案件已暂停参与训练。" });
  }

  async function handleDeleteArchive(caseId: string) {
    await deleteArchiveCase(caseId);
    setArchiveCases((current) => current.filter((item) => item.case_id !== caseId));
    if (activeCaseId === caseId) {
      setActiveCaseId(null);
      setUploadResult(null);
      setStructuredCase(null);
      setGenerationResult(null);
      setReviewState(null);
      setDraft("");
      setIssueStates({});
      setCitationStates({});
      setWorkflowStages([]);
      setReviewSyncStatus({ state: "idle", text: "待保存" });
      lastSavedReviewRef.current = "";
    }
    setFeedback({ tone: "warning", text: "归档记录已删除。" });
  }

  async function handleSaveSettings() {
    if (!settings) {
      return;
    }
    setBusy(true);
    setMessage("正在保存系统设置...");
    try {
      const saved = await updateSettings(settings);
      setSettings(saved);
      setMessage("系统设置已保存。");
      setFeedback({ tone: "success", text: "系统设置保存成功。" });
    } catch (error) {
      setMessage(`设置保存失败：${String(error)}`);
      setFeedback({ tone: "error", text: "系统设置保存失败，请稍后重试。" });
    } finally {
      setBusy(false);
    }
  }

  function handleFilesSelected(files: File[] | FileList | null | undefined) {
    setSelectedFiles(Array.from(files ?? []));
    if (files && Array.from(files).length > 0) {
      setMessage(`已选择 ${Array.from(files).length} 份材料，确认后可直接上传。`);
      setFeedback({ tone: "info", text: `已接收 ${Array.from(files).length} 份待上传材料。` });
      setView("upload");
    }
  }

  function updateIssueState(key: string, nextState: "resolved" | "ignored") {
    setIssueStates((current) => ({ ...current, [key]: nextState }));
  }

  function updateCitationState(caseId: string, nextState: "inserted" | "ignored" | "pending") {
    setCitationStates((current) => ({ ...current, [caseId]: nextState }));
  }

  async function loadArchiveCase(caseId: string, targetView: View = "generate") {
    setBusy(true);
    setMessage("正在读取归档案件详情...");
    try {
      const payload = await getArchiveCase(caseId);
      applyStatusPayload(payload);
      setSelectedFiles([]);
      setView(payload.generation_result ? targetView : "upload");
      setFeedback({ tone: "success", text: "已加载归档案件，可继续查看或审阅。" });
    } catch (error) {
      setMessage(`读取归档详情失败：${String(error)}`);
      setFeedback({ tone: "error", text: "该案件暂无可回读详情，可能仅保留摘要记录。" });
    } finally {
      setBusy(false);
    }
  }

  async function persistReview(manual: boolean) {
    if (!activeCaseId || !generationResult) {
      if (manual) {
        setFeedback({ tone: "warning", text: "当前还没有可保存的生成结果。" });
      }
      return;
    }
    setReviewSyncStatus({ state: "saving", text: "正在同步归档..." });
    try {
      const payload = await saveArchiveReview(activeCaseId, {
        draft,
        issue_states: issueStates,
        citation_states: citationStates,
      });
      setReviewState(payload.review_state);
      const nextDraft = payload.review_state?.draft ?? draft;
      const nextIssueStates = normalizeIssueStates(payload.review_state?.issue_states);
      const nextCitationStates = normalizeCitationStates(payload.review_state?.citation_states, payload.generation_result);
      lastSavedReviewRef.current = serializeReviewSnapshot(nextDraft, nextIssueStates, nextCitationStates);
      setReviewSyncStatus({
        state: "saved",
        text: payload.review_state?.updated_at ? `已保存到归档 ${payload.review_state.updated_at}` : "已保存到归档",
      });
      if (manual) {
        setFeedback({ tone: "success", text: "审阅结果已保存并回写案件库。" });
      }
      void loadArchiveCases();
    } catch (error) {
      setReviewSyncStatus({ state: "error", text: "归档同步失败，请重试。" });
      if (manual) {
        setFeedback({ tone: "error", text: "保存审阅结果失败，请稍后重试。" });
      }
      if (!manual) {
        setMessage(`自动保存失败：${String(error)}`);
      }
    }
  }

  return {
    view,
    setView,
    styles,
    selectedStyleId,
    setSelectedStyleId,
    selectedFiles,
    setSelectedFiles,
    uploadResult,
    structuredCase,
    generationResult,
    draft,
    setDraft,
    activeCaseId,
    reviewState,
    issueStates,
    citationStates,
    busy,
    message,
    archiveCases,
    settings,
    setSettings,
    workflowStages,
    selectedStyle,
    stageResults,
    processingFiles,
    stylePreviewInput,
    stylePreviewOutput,
    caseTitle,
    docketLabel,
    processingCount,
    selectedTone,
    uploadProgressBase,
    workflowProgress,
    queueStatusLabel,
    feedback,
    reviewSyncStatus,
    exportFormat,
    handleFilesSelected,
    handleUpload,
    handleExtract,
    handleGenerate,
    handleExport,
    updateIssueState,
    updateCitationState,
    handleSaveReview: () => persistReview(true),
    loadArchiveCase,
    handleToggleTraining,
    handleDeleteArchive,
    handleSaveSettings,
  };
}

function buildDefaultReviewState(result: GenerateResponse | null): ReviewState | null {
  if (!result) {
    return null;
  }
  return {
    draft: result.draft,
    issue_states: {},
    citation_states: Object.fromEntries(result.similar_cases.map((item) => [item.case_id, "pending"])),
    updated_at: "",
  };
}

function normalizeIssueStates(
  input: Record<string, string> | undefined,
): Record<string, "pending" | "resolved" | "ignored"> {
  const entries = Object.entries(input ?? {}).filter(([, value]) => value === "resolved" || value === "ignored" || value === "pending");
  return Object.fromEntries(entries) as Record<string, "pending" | "resolved" | "ignored">;
}

function normalizeCitationStates(
  input: Record<string, string> | undefined,
  result: GenerateResponse | null,
): Record<string, "pending" | "inserted" | "ignored"> {
  const base = Object.fromEntries((result?.similar_cases ?? []).map((item) => [item.case_id, "pending"] as const));
  const entries = Object.entries(input ?? {}).filter(
    ([, value]) => value === "pending" || value === "inserted" || value === "ignored",
  );
  return { ...base, ...Object.fromEntries(entries) } as Record<string, "pending" | "inserted" | "ignored">;
}

function serializeReviewSnapshot(
  draft: string,
  issueStates: Record<string, "pending" | "resolved" | "ignored">,
  citationStates: Record<string, "pending" | "inserted" | "ignored">,
) {
  return JSON.stringify({ draft, issueStates, citationStates });
}
