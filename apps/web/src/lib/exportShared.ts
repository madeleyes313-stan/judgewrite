import type { StructuredCase } from "../types";

export type ExportFormat = "Word" | "PDF" | "Markdown" | "txt";

export type ExportPayload = {
  format: ExportFormat;
  draft: string;
  caseId: string;
  title: string;
  selectedStyleName: string;
  structuredCase: StructuredCase | null;
};

export function buildMetadataLines(payload: ExportPayload) {
  return [
    `案件编号：${payload.caseId || "未生成"}`,
    `案件标题：${payload.title || "裁判文书草稿"}`,
    `风格画像：${payload.selectedStyleName}`,
    `案件类型：${payload.structuredCase?.case_type || "待识别"}`,
    `导出时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
  ];
}

export function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").slice(0, 80);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
