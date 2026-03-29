import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import type { ExportPayload } from "./exportShared";
import { buildMetadataLines } from "./exportShared";

export async function exportPdf(payload: ExportPayload) {
  const container = buildPrintableContainer(payload);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 36;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const sliceHeight = Math.floor((usableHeight / usableWidth) * canvas.width);

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      const currentSliceHeight = Math.min(sliceHeight, canvas.height - offsetY);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = currentSliceHeight;
      const context = pageCanvas.getContext("2d");
      if (!context) {
        throw new Error("PDF 渲染上下文初始化失败。");
      }
      context.drawImage(
        canvas,
        0,
        offsetY,
        canvas.width,
        currentSliceHeight,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height,
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const imageData = pageCanvas.toDataURL("image/png");
      const renderedHeight = usableWidth * (currentSliceHeight / canvas.width);
      pdf.addImage(imageData, "PNG", margin, margin, usableWidth, renderedHeight, undefined, "FAST");

      offsetY += currentSliceHeight;
      pageIndex += 1;
    }

    return pdf.output("blob");
  } finally {
    container.remove();
  }
}

function buildPrintableContainer(payload: ExportPayload) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.padding = "56px 64px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#1f2937";
  wrapper.style.fontFamily = '"Inter","PingFang SC","Microsoft YaHei",sans-serif';
  wrapper.style.lineHeight = "1.9";
  wrapper.style.whiteSpace = "pre-wrap";

  const title = document.createElement("h1");
  title.textContent = "裁判文书草稿";
  title.style.margin = "0 0 24px";
  title.style.fontSize = "28px";
  wrapper.appendChild(title);

  for (const line of buildMetadataLines(payload)) {
    const metaLine = document.createElement("div");
    metaLine.textContent = line;
    metaLine.style.fontSize = "14px";
    metaLine.style.color = "#4b5563";
    metaLine.style.marginBottom = "6px";
    wrapper.appendChild(metaLine);
  }

  const divider = document.createElement("div");
  divider.style.height = "1px";
  divider.style.background = "#d1d5db";
  divider.style.margin = "20px 0 28px";
  wrapper.appendChild(divider);

  const body = document.createElement("div");
  body.textContent = payload.draft;
  body.style.fontSize = "15px";
  wrapper.appendChild(body);

  return wrapper;
}
