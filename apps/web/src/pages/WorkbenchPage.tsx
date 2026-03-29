import { useEffect, useRef, useState } from "react";

import type { WorkflowStage } from "../types";
import { MaterialIcon } from "../components/MaterialIcon";

export function WorkbenchPage({
  selectedFiles,
  uploadResult,
  processingFiles,
  workflowStages,
  uploadProgressBase,
  message,
  busy,
  onOpenFileDialog,
  onFilesSelected,
  onUpload,
  onExtract,
}: {
  selectedFiles: File[];
  uploadResult: { case_id: string } | null;
  processingFiles: Array<{ name: string }>;
  workflowStages: WorkflowStage[];
  uploadProgressBase: number;
  message: string;
  busy: boolean;
  onOpenFileDialog: () => void;
  onFilesSelected: (files: File[] | FileList | null | undefined) => void;
  onUpload: () => void;
  onExtract: () => void;
}) {
  const selectedCount = selectedFiles.length;
  const [dragActive, setDragActive] = useState(false);
  const [queueFocused, setQueueFocused] = useState(false);
  const queueRef = useRef<HTMLDivElement | null>(null);
  const extractFailed = workflowStages.some((stage) => stage.key === "extract" && stage.status === "failed");

  useEffect(() => {
    if (!uploadResult) {
      return;
    }
    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setQueueFocused(true);
    const timer = window.setTimeout(() => setQueueFocused(false), 1800);
    return () => window.clearTimeout(timer);
  }, [uploadResult]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
      <section className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">卷宗接入</p>
            <h3 className="mt-2 text-3xl font-semibold text-on-surface">一键上传待审案件材料</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface/68">
              支持 `PDF / TXT / MD`，PDF 会自动抽取文本层内容。上传后即可进入要素抽取与文书生成流程。
            </p>
          </div>
          <div className="hidden rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary md:inline-flex">
            {uploadResult ? "已创建案件任务" : "等待上传"}
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="已选择材料" value={`${selectedCount} 份`} hint="支持批量上传" />
          <StatCard label="当前案件编号" value={uploadResult?.case_id ?? "待创建"} hint="上传后自动生成" />
          <StatCard label="流程阶段" value={uploadResult ? "可开始抽取" : "等待材料"} hint="上传 -> 抽取 -> 生成" />
        </div>

        <button
          type="button"
          onClick={onOpenFileDialog}
          onDragEnter={() => setDragActive(true)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            onFilesSelected(event.dataTransfer.files);
          }}
          className={`group relative flex min-h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed px-6 text-center transition ${
            dragActive
              ? "drag-surface-active border-primary bg-primary/8 shadow-[0_20px_50px_rgba(28,77,140,0.12)]"
              : "border-primary/35 bg-surface-container hover:border-primary hover:bg-primary/5"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,77,140,0.12),transparent_55%)]" />
          {dragActive ? (
            <div className="absolute inset-4 rounded-[24px] border border-primary/20 bg-white/35 backdrop-blur-sm" />
          ) : null}
          <div className={`relative flex h-20 w-20 items-center justify-center rounded-[28px] text-primary shadow-[0_0_0_10px_rgba(28,77,140,0.04)] ${dragActive ? "bg-primary/18" : "bg-primary/12"}`}>
            <MaterialIcon className="text-[40px]">upload_file</MaterialIcon>
          </div>
          <h4 className="relative mt-6 text-xl font-semibold text-on-surface">{dragActive ? "松开鼠标即可导入材料" : "点击选择卷宗材料"}</h4>
          <p className="relative mt-3 max-w-xl text-sm leading-7 text-on-surface/62">
            {dragActive ? "当前处于拖拽接收状态，支持一次性拖入多个卷宗文件。" : "建议按起诉状、答辩状、证据目录、庭审笔录等上传，系统会自动合并解析。"}
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-outline/60 bg-surface px-4 py-2 text-sm text-on-surface/70">
              <MaterialIcon className="text-[18px]">picture_as_pdf</MaterialIcon>
              <span>支持 PDF / TXT / MD</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-outline/60 bg-surface px-4 py-2 text-sm text-on-surface/70">
              <MaterialIcon className="text-[18px]">layers</MaterialIcon>
              <span>支持多文件批量上传</span>
            </div>
          </div>
        </button>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onUpload}
            disabled={busy}
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            上传卷宗
          </button>
          <button
            type="button"
            onClick={onExtract}
            disabled={!uploadResult || busy}
            className="rounded-full border border-outline bg-surface px-6 py-3 text-sm font-medium text-on-surface transition hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-45"
          >
            {extractFailed ? "重新执行抽取" : "开始要素抽取"}
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <div
          ref={queueRef}
          className={`rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm transition md:p-8 ${
            queueFocused ? "queue-focus-ring" : ""
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">处理队列</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">当前任务状态</h3>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
              {uploadProgressBase}%
            </span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#1c4d8c,#6495d6)] transition-all duration-500"
              style={{ width: `${uploadProgressBase}%` }}
            />
          </div>
          <p className="text-sm leading-7 text-on-surface/68">{message}</p>

          <div className="mt-6 space-y-3">
            {(workflowStages.length ? workflowStages : fallbackStages).map((stage) => (
              <div key={stage.key} className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass(stage.status)}`} />
                    <div>
                      <span className="text-sm font-medium text-on-surface">{stage.label}</span>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-on-surface/40">{stageStatusLabel(stage.status)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface/55">{stage.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/70">
                  <div className={`h-full rounded-full transition-all duration-500 ${barClass(stage.status)}`} style={{ width: `${stage.progress}%` }} />
                </div>
                <p className="mt-2 text-xs leading-6 text-on-surface/58">{stage.detail || statusText(stage.status)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-on-surface">上传文件清单</h3>
            <span className="text-sm text-on-surface/55">{processingFiles.length} 份材料</span>
          </div>
          <div className="space-y-3">
            {processingFiles.length ? (
              processingFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-2xl bg-surface-container px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <MaterialIcon className="text-[18px] text-primary">draft</MaterialIcon>
                    <div>
                      <span className="text-on-surface">{file.name}</span>
                      <p className="mt-0.5 text-[12px] text-on-surface/50">{fileKind(file.name)}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface px-3 py-1 text-xs text-on-surface/55">{uploadResult ? "已接收" : "待上传"}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
                当前还没有选择文件。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
      <p className="mt-1 text-xs text-on-surface/55">{hint}</p>
    </div>
  );
}

const fallbackStages: WorkflowStage[] = [
  { key: "upload", label: "材料接收", status: "pending", progress: 0, detail: "等待上传卷宗。" },
  { key: "extract", label: "要素抽取", status: "pending", progress: 0, detail: "上传后自动激活。" },
  { key: "generate", label: "文书生成", status: "pending", progress: 0, detail: "抽取完成后可启动。" },
];

function dotClass(status: string) {
  if (status === "completed") return "bg-emerald-500";
  if (status === "in_progress") return "animate-pulse bg-primary";
  if (status === "failed") return "bg-rose-500";
  return "bg-outline";
}

function barClass(status: string) {
  if (status === "completed") return "bg-emerald-500";
  if (status === "in_progress") return "bg-[linear-gradient(90deg,#1c4d8c,#6495d6)]";
  if (status === "failed") return "bg-rose-500";
  return "bg-outline";
}

function statusText(status: string) {
  if (status === "completed") return "该阶段已完成。";
  if (status === "in_progress") return "该阶段正在执行。";
  if (status === "failed") return "该阶段执行失败。";
  return "等待执行。";
}

function stageStatusLabel(status: string) {
  if (status === "completed") return "已完成";
  if (status === "in_progress") return "处理中";
  if (status === "failed") return "失败";
  return "待开始";
}

function fileKind(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF 卷宗";
  if (lower.endsWith(".md")) return "Markdown 文本";
  if (lower.endsWith(".txt")) return "TXT 文本";
  return "待识别格式";
}
