import type { ReactNode } from "react";

import type { AppSettings, StyleProfile } from "../types";
import { MaterialIcon } from "../components/MaterialIcon";

export function SettingsPage({
  settings,
  styles,
  onChange,
  onSave,
}: {
  settings: AppSettings | null;
  styles: StyleProfile[];
  onChange: (updater: (current: AppSettings) => AppSettings) => void;
  onSave: () => void;
}) {
  if (!settings) {
    return (
      <div className="rounded-[32px] border border-outline/70 bg-surface p-8 text-sm text-on-surface/58 shadow-sm">
        <div className="empty-state-float mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
          <MaterialIcon className="text-[26px]">settings</MaterialIcon>
        </div>
        设置尚未加载完成。
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,0.82fr]">
      <section className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">Settings</p>
          <h3 className="mt-2 text-2xl font-semibold text-on-surface">系统配置</h3>
          <p className="mt-3 text-sm leading-7 text-on-surface/68">
            下列项目已接入后端持久化，修改后可直接保存到 `settings.json`。
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MiniSummary label="默认风格" value={styles.find((style) => style.style_id === settings.default_style_id)?.judge_name ?? "未选择"} />
          <MiniSummary label="导出格式" value={settings.default_export_format} />
          <MiniSummary label="日志留存" value={`${settings.audit_log_days} 天`} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="默认风格画像">
            <select
              value={settings.default_style_id}
              onChange={(event) => onChange((current) => ({ ...current, default_style_id: event.target.value }))}
              className="w-full rounded-2xl border border-outline/70 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              {styles.map((style) => (
                <option key={style.style_id} value={style.style_id}>
                  {style.judge_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="默认导出格式">
            <select
              value={settings.default_export_format}
              onChange={(event) => onChange((current) => ({ ...current, default_export_format: event.target.value }))}
              className="w-full rounded-2xl border border-outline/70 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="Word">Word</option>
              <option value="PDF">PDF</option>
              <option value="Markdown">Markdown</option>
            </select>
          </Field>

          <Field label="OCR 模式">
            <select
              value={settings.ocr_mode}
              onChange={(event) => onChange((current) => ({ ...current, ocr_mode: event.target.value }))}
              className="w-full rounded-2xl border border-outline/70 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="文本层优先">文本层优先</option>
              <option value="强制 OCR">强制 OCR</option>
              <option value="自动判断">自动判断</option>
            </select>
          </Field>

          <Field label="审计日志保留天数">
            <input
              type="number"
              min={7}
              value={settings.audit_log_days}
              onChange={(event) => onChange((current) => ({ ...current, audit_log_days: Number(event.target.value) || 0 }))}
              className="w-full rounded-2xl border border-outline/70 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Toggle
            label="自动保存草稿"
            description="生成与编辑内容自动同步保存"
            checked={settings.auto_save}
            onChange={(checked) => onChange((current) => ({ ...current, auto_save: checked }))}
          />
          <Toggle
            label="分段生成"
            description="按解析、推理、风格化阶段串行执行"
            checked={settings.segmented_generation}
            onChange={(checked) => onChange((current) => ({ ...current, segmented_generation: checked }))}
          />
          <Toggle
            label="启用加密存储"
            description="对卷宗与草稿使用加密存储策略"
            checked={settings.encryption_enabled}
            onChange={(checked) => onChange((current) => ({ ...current, encryption_enabled: checked }))}
          />
          <Toggle
            label="启用 RAG 检索"
            description="召回相似案件辅助生成与说理"
            checked={settings.rag_enabled}
            onChange={(checked) => onChange((current) => ({ ...current, rag_enabled: checked }))}
          />
          <Toggle
            label="启用 OpenAI 提供方"
            description="切换到在线模型提供方时生效"
            checked={settings.openai_enabled}
            onChange={(checked) => onChange((current) => ({ ...current, openai_enabled: checked }))}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface/55">修改会立即影响后续上传解析、生成链路与导出默认行为。</p>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-95"
          >
            保存系统设置
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <SummaryCard icon="policy" title="安全与合规" value={settings.encryption_enabled ? "已启用加密与审计" : "当前未启用加密"} />
        <SummaryCard icon="hub" title="推理链路" value={settings.segmented_generation ? "按阶段链路生成" : "单次直出"} />
        <SummaryCard icon="psychology_alt" title="智能检索" value={settings.rag_enabled ? "已启用相似案例召回" : "仅使用基础生成"} />
      </section>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-outline/60 bg-surface-container px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-sm font-medium text-on-surface/72">{label}</p>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-2xl border border-outline/70 bg-surface-container px-4 py-4 text-left"
    >
      <div className="pr-4">
        <span className="text-sm text-on-surface/72">{label}</span>
        <p className="mt-1 text-xs leading-6 text-on-surface/52">{description}</p>
      </div>
      <span className={`inline-flex h-7 w-12 items-center rounded-full px-1 transition ${checked ? "bg-primary" : "bg-outline"}`}>
        <span className={`h-5 w-5 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function SummaryCard({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-outline/70 bg-surface p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MaterialIcon className="text-[24px]">{icon}</MaterialIcon>
      </div>
      <p className="text-sm text-on-surface/55">{title}</p>
      <p className="mt-2 text-lg font-semibold leading-8 text-on-surface">{value}</p>
    </div>
  );
}
