import { useMemo, useRef, useState } from "react";

import { stageLabels } from "../hooks/useJudgewriteApp";
import type { GenerateResponse, SimilarCase, StructuredCase, ValidationIssue, WorkflowStage } from "../types";
import { MaterialIcon } from "../components/MaterialIcon";

export function DraftingPage({
  structuredCase,
  generationResult,
  workflowStages,
  draft,
  setDraft,
  issueStates,
  citationStates,
  busy,
  workflowProgress,
  selectedStyleName,
  reviewSyncStatus,
  exportFormat,
  onGenerate,
  onExport,
  onSaveReview,
  onIssueStateChange,
  onCitationStateChange,
}: {
  structuredCase: StructuredCase | null;
  generationResult: GenerateResponse | null;
  workflowStages: WorkflowStage[];
  draft: string;
  setDraft: (value: string) => void;
  issueStates: Record<string, "pending" | "resolved" | "ignored">;
  citationStates: Record<string, "pending" | "inserted" | "ignored">;
  busy: boolean;
  workflowProgress: number;
  selectedStyleName: string;
  reviewSyncStatus: { state: "idle" | "saving" | "saved" | "error"; text: string };
  exportFormat: string;
  onGenerate: () => void;
  onExport: () => void;
  onSaveReview: () => void;
  onIssueStateChange: (key: string, nextState: "resolved" | "ignored") => void;
  onCitationStateChange: (caseId: string, nextState: "inserted" | "ignored" | "pending") => void;
}) {
  const completedCount = workflowStages.filter((item) => item.status === "completed").length;
  const draftLength = draft.replace(/\s+/g, "").length;
  const hasDraft = draft.trim().length > 0;
  const issueCount = structuredCase?.issues.length ?? 0;
  const evidenceCount = structuredCase?.evidence.length ?? 0;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [expandedCaseIds, setExpandedCaseIds] = useState<string[]>([]);
  const [activeNote, setActiveNote] = useState<{ title: string; excerpt: string } | null>(null);
  const paragraphs = useMemo(
    () => draft.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    [draft],
  );

  function handleInsertCitation(item: SimilarCase) {
    const citationIndex = (draft.match(/【引用依据\d+】/g) ?? []).length + 1;
    const citationText = `\n\n【引用依据${citationIndex}】${item.title}\n引文摘要：${item.quote}\n引用说明：可结合本案争议焦点酌情采纳其中说理结构。\n`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraft(`${draft}${citationText}`);
      setActiveNote({ title: "已插入引用", excerpt: item.title });
      return;
    }

    const start = textarea.selectionStart ?? draft.length;
    const end = textarea.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${citationText}${draft.slice(end)}`;
    setDraft(nextDraft);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + citationText.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });

    setActiveNote({ title: "已插入引用", excerpt: item.title });
    onCitationStateChange(item.case_id, "inserted");
  }

  function handleLocateIssue(issue: ValidationIssue) {
    const result = locateIssueInDraft(draft, paragraphs, issue);
    const textarea = textareaRef.current;

    if (textarea && result.selection) {
      textarea.focus();
      textarea.setSelectionRange(result.selection.start, result.selection.end);
    }

    setActiveNote({
      title: `已定位：${issue.message}`,
      excerpt: result.excerpt,
    });
  }

  function toggleCaseExpanded(caseId: string) {
    setExpandedCaseIds((current) =>
      current.includes(caseId) ? current.filter((item) => item !== caseId) : [...current, caseId],
    );
  }

  function setIssueState(issue: ValidationIssue, nextState: "resolved" | "ignored") {
    const key = buildIssueKey(issue);
    onIssueStateChange(key, nextState);
    setActiveNote({
      title: nextState === "resolved" ? `已标记处理：${issue.message}` : `已忽略：${issue.message}`,
      excerpt: issue.suggestion,
    });
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[0.9fr,1.3fr]">
      <section className="space-y-6">
        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">生成流程</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">分步骤状态机</h3>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
              {workflowProgress}%
            </span>
          </div>
          <div className="mb-5 h-3 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#1c4d8c,#6495d6)] transition-all duration-500"
              style={{ width: `${workflowProgress}%` }}
            />
          </div>
          <div className="space-y-3">
            {(workflowStages.length ? workflowStages : defaultStages).map((stage) => (
              <div key={stage.key} className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.status === "in_progress" ? "animate-pulse bg-primary" : stage.status === "completed" ? "bg-emerald-500" : "bg-outline"}`} />
                    <div>
                      <span className="text-sm font-medium text-on-surface">{stage.label}</span>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-on-surface/40">{stageStateText(stage.status)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface/55">{stage.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/70">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stage.status === "completed"
                        ? "bg-emerald-500"
                        : stage.status === "in_progress"
                          ? "bg-[linear-gradient(90deg,#1c4d8c,#6495d6)]"
                          : stage.status === "failed"
                            ? "bg-rose-500"
                            : "bg-outline"
                    }`}
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-6 text-on-surface/58">{stage.detail || "等待执行。"}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-primary/8 px-4 py-4 text-sm text-on-surface/72">
            当前已完成 {completedCount} / {Math.max(workflowStages.length, defaultStages.length)} 个阶段，采用风格画像：
            <span className="font-medium text-on-surface"> {selectedStyleName}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={busy || !structuredCase}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workflowStages.some((stage) => stage.key === "generate" && stage.status === "failed") ? "重新生成文书" : "开始生成文书"}
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={!draft}
              className="rounded-full border border-outline bg-surface px-6 py-3 text-sm font-medium text-on-surface transition hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-45"
            >
              导出 {exportFormat}
            </button>
            <button
              type="button"
              onClick={onSaveReview}
              disabled={!generationResult || reviewSyncStatus.state === "saving"}
              className="rounded-full border border-primary/25 bg-primary/8 px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {reviewSyncStatus.state === "saving" ? "正在保存" : "保存审阅结果"}
            </button>
          </div>
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            reviewSyncStatus.state === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : reviewSyncStatus.state === "saved"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-outline/60 bg-surface-container text-on-surface/62"
          }`}>
            {reviewSyncStatus.text}
          </div>
        </div>

        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <MaterialIcon className="text-[20px] text-primary">fact_check</MaterialIcon>
            <h3 className="text-lg font-semibold text-on-surface">法官审阅面板</h3>
          </div>
          {structuredCase ? (
            <div className="space-y-4 text-sm text-on-surface/72">
              <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/75">案件概览</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InfoRow label="案件类型" value={structuredCase.case_type || "待识别"} compact />
                  <InfoRow label="当事人" value={structuredCase.parties.join("；") || "暂无"} compact />
                </div>
              </div>
              <InfoRow label="诉讼请求" value={structuredCase.claims || "暂无"} />
              <InfoRow label="事实摘要" value={structuredCase.facts_summary || "暂无"} />
              <BulletCard label="争议焦点" items={structuredCase.issues} emptyText="暂无争议焦点" />
              <BulletCard label="证据目录" items={structuredCase.evidence} emptyText="暂无证据目录" />
              <BulletCard label="适用法条" items={structuredCase.legal_basis_candidates} emptyText="暂无法条候选" />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
              尚未完成要素抽取，完成后这里会显示案件结构化结果。
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <MiniChip label="争议焦点" value={`${issueCount} 项`} />
            <MiniChip label="证据材料" value={`${evidenceCount} 组`} />
            <MiniChip label="当前画像" value={selectedStyleName} />
          </div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">文书草稿</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">实时可编辑生成结果</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-outline/60 bg-surface-container px-4 py-2 text-xs text-on-surface/62">
                {generationResult ? "已完成 AI 生成" : "待生成"}
              </div>
              <div className="rounded-full border border-outline/60 bg-surface-container px-4 py-2 text-xs text-on-surface/62">
                正文约 {draftLength} 字
              </div>
            </div>
          </div>
          <div className="rounded-[30px] border border-outline/60 bg-[#eef2f6] p-5">
            <div className="editorial-shadow mx-auto max-w-4xl rounded-[18px] border border-[#e2e7ee] bg-white px-6 py-7 md:px-10 md:py-10">
              <div className="mb-6 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-on-surface/45">Judicial Draft</p>
                <h4 className="mt-3 text-2xl font-semibold text-on-surface">裁判文书草稿</h4>
                <p className="mt-2 text-sm text-on-surface/55">已按法官风格画像与案件要素生成，可直接继续编辑润色。</p>
              </div>
              <div className="mb-6 grid gap-3 border-y border-dashed border-outline/70 py-4 text-sm text-on-surface/62 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">风格画像</p>
                  <p className="mt-1 font-medium text-on-surface">{selectedStyleName}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">草稿状态</p>
                  <p className="mt-1 font-medium text-on-surface">{generationResult ? "已生成，可继续编辑" : "待生成"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">字数统计</p>
                  <p className="mt-1 font-medium text-on-surface">约 {draftLength} 字</p>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="系统生成的裁判文书草稿将显示在这里，支持继续人工润色。"
                className="min-h-[540px] w-full border-none bg-transparent p-0 text-sm leading-8 text-on-surface outline-none transition"
              />
            </div>
          </div>
          {activeNote ? (
            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4 text-sm text-on-surface/72">
              <p className="font-medium text-on-surface">{activeNote.title}</p>
              <p className="mt-2 line-clamp-1">{activeNote.excerpt}</p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface/55">
            <span>建议在生成完成后继续人工核验法条适用、金额数字与当事人信息。</span>
            <span>{hasDraft ? "已进入可编辑状态" : "等待生成正文"}</span>
          </div>
        </div>

        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <MaterialIcon className="text-[20px] text-primary">track_changes</MaterialIcon>
            <h3 className="text-lg font-semibold text-on-surface">阶段结果摘要</h3>
          </div>
          <div className="space-y-4">
            {generationResult?.stage_results?.length ? (
              generationResult.stage_results.map((result) => (
                <div key={result.stage ?? result.name ?? "stage"} className="rounded-2xl bg-surface-container px-4 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-on-surface">{stageLabels[result.stage ?? result.name ?? ""] ?? result.stage ?? result.name}</span>
                    {typeof result.elapsed_ms === "number" ? (
                      <span className="text-xs text-on-surface/55">{result.elapsed_ms} ms</span>
                    ) : (
                      <span className="text-xs text-on-surface/55">{result.status}</span>
                    )}
                  </div>
                  <p className="text-sm leading-7 text-on-surface/68">{result.summary ?? result.output ?? "暂无阶段摘要。"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
                生成完成后，这里会展示解析、推理、风格化、增强与校验各阶段的摘要。
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <MaterialIcon className="text-[20px] text-primary">bookmarks</MaterialIcon>
              <h3 className="text-lg font-semibold text-on-surface">引用命中卡片</h3>
            </div>
            <div className="space-y-4">
              {generationResult?.similar_cases?.length ? (
                generationResult.similar_cases.map((item) => (
                  <div key={item.case_id} className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                        <p className="mt-1 text-xs text-on-surface/52">{item.case_id} · {item.case_type}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                          匹配度 {Math.round(item.score * 100)}%
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] ${
                          citationStates[item.case_id] === "inserted"
                            ? "bg-emerald-100 text-emerald-700"
                            : citationStates[item.case_id] === "ignored"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-white/80 text-on-surface/55"
                        }`}>
                          {citationStates[item.case_id] === "inserted" ? "已采用" : citationStates[item.case_id] === "ignored" ? "已忽略" : "待处理"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-on-surface/68">{item.summary}</p>
                    <blockquote className="mt-3 rounded-2xl border-l-2 border-primary/20 bg-white/70 px-4 py-3 text-sm leading-7 text-on-surface/62">
                      {expandedCaseIds.includes(item.case_id) ? item.quote : truncateText(item.quote, 72)}
                    </blockquote>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleInsertCitation(item)}
                        className="rounded-full bg-primary px-4 py-2 text-xs text-on-primary transition hover:opacity-95"
                      >
                        插入引用
                      </button>
                      <button
                        type="button"
                        onClick={() => onCitationStateChange(item.case_id, "ignored")}
                        className="rounded-full border border-outline/60 bg-white/80 px-4 py-2 text-xs text-on-surface/68 transition hover:bg-surface"
                      >
                        忽略引用
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCaseExpanded(item.case_id)}
                        className="rounded-full border border-outline/60 bg-white/80 px-4 py-2 text-xs text-on-surface/68 transition hover:bg-surface"
                      >
                        {expandedCaseIds.includes(item.case_id) ? "收起全文" : "展开全文"}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.match_reasons.map((reason) => (
                        <span key={reason} className="rounded-full border border-outline/60 px-3 py-1 text-xs text-on-surface/62">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
                  生成完成后，这里会展示可供援引或参照的相似案例命中结果。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <MaterialIcon className="text-[20px] text-primary">sticky_note_2</MaterialIcon>
              <h3 className="text-lg font-semibold text-on-surface">校验问题侧注</h3>
            </div>
            <div className="space-y-4">
              {generationResult?.issues?.length ? (
                generationResult.issues.map((issue, index) => (
                  (() => {
                    const currentState = issueStates[buildIssueKey(issue)] ?? "pending";
                    return (
                  <button
                    key={`${issue.message}-${index}`}
                    type="button"
                    onClick={() => handleLocateIssue(issue)}
                    className={`w-full rounded-[24px] border-l-4 px-4 py-4 text-left shadow-sm transition hover:-translate-y-[1px] ${
                      issue.severity === "high"
                        ? "border-rose-400 bg-rose-50"
                        : issue.severity === "medium"
                          ? "border-amber-400 bg-amber-50"
                          : "border-sky-400 bg-sky-50"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-on-surface">{issue.message}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-on-surface/55">
                          {severityLabel(issue.severity)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                          currentState === "resolved"
                            ? "bg-emerald-100 text-emerald-700"
                            : currentState === "ignored"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-white/80 text-on-surface/55"
                        }`}>
                          {currentState === "resolved" ? "已处理" : currentState === "ignored" ? "已忽略" : "待处理"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-on-surface/68">{issue.suggestion}</p>
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setIssueState(issue, "resolved")}
                        className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs text-emerald-700 transition hover:bg-white"
                      >
                        标记已处理
                      </button>
                      <button
                        type="button"
                        onClick={() => setIssueState(issue, "ignored")}
                        className="rounded-full border border-outline/60 bg-white/80 px-3 py-1.5 text-xs text-on-surface/62 transition hover:bg-white"
                      >
                        忽略
                      </button>
                    </div>
                  </button>
                    );
                  })()
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
                  当前没有发现明显校验问题，生成后如有风险项会以侧注形式列在这里。
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl bg-surface-container px-4 ${compact ? "py-3" : "py-4"}`}>
      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-on-surface/45">{label}</p>
      <p className="leading-7 text-on-surface">{value}</p>
    </div>
  );
}

function BulletCard({ label, items, emptyText }: { label: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-2xl bg-surface-container px-4 py-4">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-on-surface/45">{label}</p>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item} className="flex gap-3 text-sm leading-7 text-on-surface">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-7 text-on-surface/58">{emptyText}</p>
      )}
    </div>
  );
}

function MiniChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function stageStateText(status: string) {
  if (status === "completed") return "已完成";
  if (status === "in_progress") return "处理中";
  if (status === "failed") return "失败";
  return "待执行";
}

function severityLabel(severity: string) {
  if (severity === "high") return "高";
  if (severity === "medium") return "中";
  if (severity === "low") return "低";
  return "提示";
}

function buildIssueKey(issue: ValidationIssue) {
  return `${issue.severity}:${issue.message}:${issue.suggestion}`;
}

export { buildIssueKey };

function truncateText(text: string, length: number) {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

function locateIssueInDraft(
  draft: string,
  paragraphs: string[],
  issue: ValidationIssue,
): { excerpt: string; selection?: { start: number; end: number } } {
  const keywords = Array.from(
    new Set(
      `${issue.message} ${issue.suggestion}`
        .split(/[，。；：、\s（）()]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  );

  for (const keyword of keywords) {
    const index = draft.indexOf(keyword);
    if (index >= 0) {
      return {
        excerpt: buildExcerptFromIndex(draft, index),
        selection: { start: index, end: index + keyword.length },
      };
    }
  }

  const paragraph =
    paragraphs.find((item) => item.includes("本院认为")) ??
    paragraphs.find((item) => item.includes("判决")) ??
    paragraphs[0] ??
    "未找到可直接定位的正文段落，请结合侧注内容人工复核。";

  const fallbackIndex = draft.indexOf(paragraph);
  return {
    excerpt: paragraph,
    selection: fallbackIndex >= 0 ? { start: fallbackIndex, end: fallbackIndex + Math.min(paragraph.length, 18) } : undefined,
  };
}

function buildExcerptFromIndex(draft: string, index: number) {
  const start = Math.max(0, draft.lastIndexOf("\n", index - 1) + 1);
  const nextBreak = draft.indexOf("\n", index);
  const end = nextBreak >= 0 ? nextBreak : Math.min(draft.length, start + 120);
  return draft.slice(start, Math.max(end, start + 1)).trim();
}

const defaultStages: WorkflowStage[] = Object.entries(stageLabels).map(([key, label]) => ({
  key,
  label,
  status: "pending",
  progress: 0,
  detail: "等待执行。",
}));
