import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { ExportPayload } from "./exportShared";
import { buildMetadataLines } from "./exportShared";

export async function exportWord(payload: ExportPayload) {
  const document = new Document({
    sections: [
      {
        properties: {},
        children: buildWordParagraphs(payload),
      },
    ],
  });
  return Packer.toBlob(document);
}

function buildWordParagraphs(payload: ExportPayload) {
  const metadata = buildMetadataLines(payload);
  const draftParagraphs = payload.draft.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: "裁判文书草稿", bold: true, size: 32 })],
      spacing: { after: 240 },
    }),
    ...metadata.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 90 },
        }),
    ),
    new Paragraph({
      children: [],
      spacing: { after: 140 },
    }),
    ...draftParagraphs.map(
      (paragraph) =>
        new Paragraph({
          children: [new TextRun({ text: paragraph, size: 24 })],
          spacing: { line: 420, after: 180 },
        }),
    ),
  ];
}
