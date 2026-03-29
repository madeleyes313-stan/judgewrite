import type { ExportPayload } from "./exportShared";
import { downloadBlob, sanitizeFileName } from "./exportShared";

export async function exportDraft(payload: ExportPayload) {
  const fileBaseName = sanitizeFileName(payload.caseId || "judgewrite-draft");

  if (payload.format === "Word") {
    const { exportWord } = await import("./exportWord");
    const blob = await exportWord(payload);
    downloadBlob(blob, `${fileBaseName}.docx`);
    return;
  }

  if (payload.format === "PDF") {
    const { exportPdf } = await import("./exportPdf");
    const blob = await exportPdf(payload);
    downloadBlob(blob, `${fileBaseName}.pdf`);
    return;
  }

  const extension = payload.format === "Markdown" ? "md" : "txt";
  const blob = new Blob([payload.draft], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${fileBaseName}.${extension}`);
}
