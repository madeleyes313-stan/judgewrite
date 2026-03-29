import type { ReactNode } from "react";

import { mobileNavItems, sideNavItems, topNavItems } from "../constants/ui";
import type { View } from "../hooks/useJudgewriteApp";
import { MaterialIcon } from "./MaterialIcon";

export function AppChrome({
  view,
  setView,
  message,
  queueStatusLabel,
  feedback,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  message: string;
  queueStatusLabel: string;
  feedback: { tone: "success" | "warning" | "error" | "info"; text: string } | null;
  children: ReactNode;
}) {
  const statusTone =
    queueStatusLabel === "正在生成中"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : queueStatusLabel === "智能处理中"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : queueStatusLabel === "处理失败"
          ? "border-rose-200 bg-rose-50 text-rose-700"
        : queueStatusLabel === "材料已就绪"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-outline/60 bg-surface-container text-on-surface/65";

  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[272px] flex-col border-r border-outline/70 bg-surface px-6 py-8 lg:flex">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <MaterialIcon className="text-[28px]">balance</MaterialIcon>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-on-surface/55">JudgeWrite</p>
              <h1 className="text-xl font-semibold text-on-surface">文书辅助生成助手</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {sideNavItems.map((item) => {
              const active = item.key === view;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                    active
                      ? "bg-primary text-on-primary shadow-[0_16px_40px_rgba(28,77,140,0.18)]"
                      : "text-on-surface hover:bg-surface-variant/70"
                  }`}
                >
                  <MaterialIcon className="text-[20px]">{item.icon}</MaterialIcon>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-outline/60 bg-surface-container px-5 py-5 text-sm text-on-surface/78">
            <div className="mb-2 flex items-center gap-2 text-on-surface">
              <MaterialIcon className="text-[18px] text-primary">pending_actions</MaterialIcon>
              <span className="font-medium">当前系统状态</span>
            </div>
            <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-on-surface/45">实时提示</p>
            <p className="mb-4 leading-6">{message}</p>
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusTone}`}>
              {queueStatusLabel}
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-outline/70 bg-surface/95 px-5 py-4 backdrop-blur md:px-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-on-surface/50">Judicial workspace</p>
                <h2 className="text-2xl font-semibold text-on-surface">文书辅助生成助手</h2>
              </div>
              <div className={`flex items-center gap-3 rounded-full border px-4 py-2 ${statusTone}`}>
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm text-on-surface/70">{queueStatusLabel}</span>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {topNavItems.map((item) => {
                const active = item.key === view;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setView(item.key)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface/72 hover:bg-surface-variant"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          {feedback ? (
            <div className="px-4 pt-4 md:px-8">
              <div className={`rounded-2xl border px-4 py-3 text-sm feedback-banner ${
                feedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : feedback.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : feedback.tone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
              }`}>
                {feedback.text}
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>

          <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-outline/70 bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
            {mobileNavItems.map((item) => {
              const active = item.key === view;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition ${
                    active ? "bg-primary/12 text-primary" : "text-on-surface/60"
                  }`}
                >
                  <MaterialIcon className="text-[20px]">{item.icon}</MaterialIcon>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
