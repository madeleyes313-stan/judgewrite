import { useEffect, useMemo, useState } from "react";

import type { ArchiveCase, GenerateResponse, ReviewState, StructuredCase } from "../types";
import { MaterialIcon } from "../components/MaterialIcon";

export function ArchivePage({
  archiveCases,
  activeCaseId,
  reviewState,
  structuredCase,
  generationResult,
  onToggleTraining,
  onDelete,
  onOpenCase,
}: {
  archiveCases: ArchiveCase[];
  activeCaseId: string | null;
  reviewState: ReviewState | null;
  structuredCase: StructuredCase | null;
  generationResult: GenerateResponse | null;
  onToggleTraining: (caseId: string, enabled: boolean) => void;
  onDelete: (caseId: string) => void;
  onOpenCase: (caseId: string, targetView?: "archive" | "generate") => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "training" | "runtime" | "completed">("all");
  const [sortBy, setSortBy] = useState<"updated_desc" | "updated_asc" | "title_asc">("updated_desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filteredCases = useMemo(() => {
    const items = archiveCases.filter((item) => {
      const matchesQuery =
        !query ||
        [item.title, item.case_id, item.case_type, item.style_profile]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "training" && item.training_enabled) ||
        (filter === "runtime" && item.source === "runtime") ||
        (filter === "completed" && item.status.includes("已"));

      return matchesQuery && matchesFilter;
    });

    const sorted = [...items].sort((left, right) => {
      if (sortBy === "updated_asc") {
        return left.updated_at.localeCompare(right.updated_at);
      }
      if (sortBy === "title_asc") {
        return left.title.localeCompare(right.title, "zh-Hans-CN");
      }
      return right.updated_at.localeCompare(left.updated_at);
    });

    return sorted;
  }, [archiveCases, filter, query, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const pagedCases = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const activeArchiveCase = archiveCases.find((item) => item.case_id === activeCaseId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
      <div className="space-y-6">
      <section className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">Case Archive</p>
            <h3 className="mt-2 text-2xl font-semibold text-on-surface">可操作案件库</h3>
            <p className="mt-3 text-sm leading-7 text-on-surface/68">
              这里展示后端实时返回的历史案件，可直接控制是否参与风格训练，也支持删除归档记录。
            </p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
            共 {archiveCases.length} 条记录
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <QuickBadge title="参与训练" value={`${archiveCases.filter((item) => item.training_enabled).length} 条`} tone="primary" />
          <QuickBadge title="最近更新" value={archiveCases[0]?.updated_at ?? "暂无"} tone="neutral" />
          <QuickBadge title="运行态案件" value={`${archiveCases.filter((item) => item.source === "runtime").length} 条`} tone="neutral" />
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "全部案件" },
              { key: "training", label: "参与训练" },
              { key: "runtime", label: "运行生成" },
              { key: "completed", label: "已完成" },
            ].map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key as typeof filter)}
                  className={`rounded-full px-4 py-2 text-xs transition ${
                    active ? "bg-primary text-on-primary" : "border border-outline/60 bg-surface-container text-on-surface/65 hover:bg-surface-variant"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-3 rounded-full border border-outline/60 bg-surface-container px-4 py-3 text-sm text-on-surface/65">
            <MaterialIcon className="text-[18px]">search</MaterialIcon>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按案号、标题、案由或风格搜索"
              className="w-[260px] border-none bg-transparent p-0 outline-none"
            />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface/55">当前结果 {filteredCases.length} 条，按当前条件分页展示。</p>
          <label className="flex items-center gap-3 rounded-full border border-outline/60 bg-surface-container px-4 py-2 text-sm text-on-surface/65">
            <MaterialIcon className="text-[18px]">swap_vert</MaterialIcon>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as typeof sortBy);
                setPage(1);
              }}
              className="border-none bg-transparent p-0 outline-none"
            >
              <option value="updated_desc">按更新时间倒序</option>
              <option value="updated_asc">按更新时间正序</option>
              <option value="title_asc">按标题排序</option>
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-outline/70">
          <div className="hidden grid-cols-[1.1fr,1fr,1fr,0.9fr,0.9fr,1.1fr] gap-4 bg-surface-container px-5 py-4 text-xs uppercase tracking-[0.2em] text-on-surface/45 md:grid">
            <span>案件标题</span>
            <span>案由类型</span>
            <span>风格画像</span>
            <span>更新时间</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          <div className="divide-y divide-outline/70 bg-surface">
            {pagedCases.length ? (
              pagedCases.map((item) => (
                <div
                  key={item.case_id}
                  data-testid={`archive-row-${item.case_id}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-surface-container/40 md:grid-cols-[1.1fr,1fr,1fr,0.9fr,0.9fr,1.1fr] md:items-center"
                >
                  <div>
                    <p className="font-medium text-on-surface">{item.title}</p>
                    <p className="mt-1 text-sm text-on-surface/55">{item.case_id}</p>
                  </div>
                  <p className="text-sm text-on-surface/72">{item.case_type}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface/72">{item.style_profile}</span>
                    <span className="rounded-full border border-outline/60 px-3 py-1 text-xs text-on-surface/58">
                      {item.source === "seed" ? "种子数据" : "运行生成"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface/58">{item.updated_at}</p>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs ${statusTone(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid={`archive-open-${item.case_id}`}
                      onClick={() => onOpenCase(item.case_id, "archive")}
                      disabled={item.source !== "runtime"}
                      className="rounded-full border border-outline/60 px-4 py-2 text-xs font-medium text-on-surface/72 transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {item.source === "runtime" ? "查看详情" : "仅摘要可见"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleTraining(item.case_id, !item.training_enabled)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                        item.training_enabled
                          ? "bg-primary text-on-primary"
                          : "border border-outline bg-surface text-on-surface/72"
                      }`}
                    >
                      {item.training_enabled ? "参与训练中" : "已暂停训练"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.case_id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-on-surface/58">
                <div className="empty-state-float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
                  <MaterialIcon className="text-[26px]">inventory_2</MaterialIcon>
                </div>
                {archiveCases.length ? "没有符合当前筛选条件的案件。" : "当前暂无归档案件。"}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface/55">
            第 {Math.min(page, totalPages)} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-full border border-outline/60 bg-surface-container px-4 py-2 text-sm text-on-surface transition hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-45"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-outline/60 bg-surface-container px-4 py-2 text-sm text-on-surface transition hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-45"
            >
              下一页
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <MetricCard icon="library_books" label="可训练案件" value={`${archiveCases.filter((item) => item.training_enabled).length}`} />
        <MetricCard icon="verified" label="已完成案件" value={`${archiveCases.filter((item) => item.status.includes("已")).length}`} />
        <MetricCard icon="deployed_code" label="种子案例" value={`${archiveCases.filter((item) => item.source === "seed").length}`} />
      </section>
      </div>

      <section className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">Archive Detail</p>
          <h3 className="mt-2 text-2xl font-semibold text-on-surface">案件库详情</h3>
          <p className="mt-3 text-sm leading-7 text-on-surface/68">
            可查看运行态案件的结构化要素、生成结果与最近一次审阅保存状态。
          </p>
        </div>

        {activeArchiveCase ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary/75">当前案件</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">{activeArchiveCase.title}</p>
              <p className="mt-1 text-sm text-on-surface/58">{activeArchiveCase.case_id}</p>
            </div>

            <DetailRow label="案由类型" value={activeArchiveCase.case_type} />
            <DetailRow label="风格画像" value={activeArchiveCase.style_profile} />
            <DetailRow label="归档状态" value={activeArchiveCase.status} />
            <DetailRow label="最近更新" value={activeArchiveCase.updated_at} />
            <DetailRow label="审阅保存" value={reviewState?.updated_at ? reviewState.updated_at : "尚未保存人工审阅结果"} />

            <div className="rounded-2xl bg-surface-container px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">案件结构化摘要</p>
              <p className="mt-3 text-sm text-on-surface/72">
                {structuredCase
                  ? `${structuredCase.case_type || "待识别"} · 当事人 ${structuredCase.parties.join("、") || "暂无"}`
                  : "当前暂无结构化详情，可先回到工作台继续处理。"}
              </p>
              <p className="mt-2 text-sm leading-7 text-on-surface/62">
                {structuredCase?.facts_summary || "未读取到事实摘要。"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <QuickBadge title="争议焦点" value={`${structuredCase?.issues.length ?? 0} 项`} tone="neutral" />
              <QuickBadge title="引用命中" value={`${generationResult?.similar_cases.length ?? 0} 条`} tone="neutral" />
              <QuickBadge title="校验问题" value={`${generationResult?.issues.length ?? 0} 条`} tone="primary" />
            </div>

            <button
              type="button"
              onClick={() => onOpenCase(activeArchiveCase.case_id, "generate")}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-95"
            >
              继续审阅该案件
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-10 text-center text-sm text-on-surface/58">
            <div className="empty-state-float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
              <MaterialIcon className="text-[26px]">folder_open</MaterialIcon>
            </div>
            选择一条运行态案件后，这里会显示可回看的详情。
          </div>
        )}
      </section>
    </div>
  );
}

function QuickBadge({ title, value, tone }: { title: string; value: string; tone: "primary" | "neutral" }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        tone === "primary" ? "border-primary/20 bg-primary/8" : "border-outline/60 bg-surface-container"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface/45">{title}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-outline/70 bg-surface p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MaterialIcon className="text-[24px]">{icon}</MaterialIcon>
      </div>
      <p className="text-sm text-on-surface/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/40">{label}</p>
      <p className="mt-2 text-sm text-on-surface/72">{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  if (status.includes("失败")) return "bg-rose-50 text-rose-700";
  if (status.includes("生成") || status.includes("分析")) return "bg-amber-50 text-amber-700";
  if (status.includes("已")) return "bg-emerald-50 text-emerald-700";
  return "bg-surface-container text-on-surface/72";
}
