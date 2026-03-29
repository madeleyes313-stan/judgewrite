import { tuneActions } from "../constants/ui";
import type { StyleProfile } from "../types";
import { MaterialIcon } from "../components/MaterialIcon";

export function StyleLabPage({
  styles,
  selectedStyleId,
  selectedStyle,
  stylePreviewInput,
  stylePreviewOutput,
  onSelectStyle,
}: {
  styles: StyleProfile[];
  selectedStyleId: string;
  selectedStyle: StyleProfile | null;
  stylePreviewInput: string;
  stylePreviewOutput: string;
  onSelectStyle: (styleId: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <section className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-on-surface/45">Style Lab</p>
          <h3 className="mt-2 text-2xl font-semibold text-on-surface">法官风格画像库</h3>
          <p className="mt-3 text-sm leading-7 text-on-surface/68">系统会结合历史文书、相似案由和常用措辞，自动为每位法官形成可调用的写作画像。</p>
        </div>

        <div className="space-y-4">
          {styles.map((style) => {
            const active = style.style_id === selectedStyleId;
            return (
              <button
                key={style.style_id}
                type="button"
                onClick={() => onSelectStyle(style.style_id)}
                className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                  active
                    ? "border-primary bg-primary/6 shadow-[0_20px_40px_rgba(28,77,140,0.12)]"
                    : "border-outline/70 bg-surface-container hover:border-primary/30"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-on-surface">{style.judge_name}</h4>
                    <p className="mt-1 text-sm text-on-surface/58">{style.tone} / {style.logic_structure}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {active ? <MaterialIcon className="text-[18px] text-primary">check_circle</MaterialIcon> : null}
                    <span className="rounded-full border border-outline/60 px-3 py-1 text-xs text-on-surface/58">
                      置信度 {(style.style_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-7 text-on-surface/68">{style.writing_habit || "系统已根据历史文书自动抽取写作习惯。"}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-on-surface/52">
                  <span>历史样本 {style.source_case_count} 份</span>
                  <span>{style.dominant_case_types[0] ?? "待归类"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {style.common_terms.slice(0, 4).map((term) => (
                    <span key={term} className="rounded-full bg-surface px-3 py-1 text-xs text-on-surface/68">
                      {term}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <MaterialIcon className="text-[20px] text-primary">psychology</MaterialIcon>
            <h3 className="text-lg font-semibold text-on-surface">风格拆解</h3>
          </div>
          {selectedStyle ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-primary/75">当前使用画像</p>
                    <h4 className="mt-1 text-lg font-semibold text-on-surface">{selectedStyle.judge_name}</h4>
                  </div>
                  <div className="rounded-full bg-white/80 px-3 py-1 text-xs text-primary">
                    主案由：{selectedStyle.dominant_case_types[0] ?? "待分析"}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              <Card label="行文基调" value={selectedStyle.tone} />
              <Card label="逻辑结构" value={selectedStyle.logic_structure} />
              <Card label="句式长度" value={selectedStyle.sentence_length} />
              <Card label="常见收束语" value={selectedStyle.signature_phrases.join("；") || "暂无"} />
              <Card label="主案由分布" value={selectedStyle.dominant_case_types.join("；") || "暂无"} />
              <Card label="常用术语" value={selectedStyle.common_terms.join("；") || "暂无"} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline/70 px-4 py-6 text-sm text-on-surface/58">
              当前暂无可用风格画像。
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-outline/70 bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <MaterialIcon className="text-[20px] text-primary">auto_awesome</MaterialIcon>
            <h3 className="text-lg font-semibold text-on-surface">风格迁移预览</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-surface-container px-4 py-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-on-surface/45">原始表达</p>
              <p className="text-sm leading-7 text-on-surface/72">{stylePreviewInput}</p>
            </div>
            <div className="rounded-2xl bg-primary/8 px-4 py-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-primary/80">风格化结果</p>
              <p className="text-sm leading-7 text-on-surface/78">{stylePreviewOutput}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {tuneActions.map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-full border border-outline bg-surface px-4 py-2 text-sm text-on-surface/72 transition hover:border-primary/30 hover:bg-surface-variant"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container px-4 py-4">
      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-on-surface/45">{label}</p>
      <p className="text-sm leading-7 text-on-surface">{value}</p>
    </div>
  );
}
