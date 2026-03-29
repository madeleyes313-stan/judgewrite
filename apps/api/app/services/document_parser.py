from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader


def guess_text_extension(filename: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        return "pdf"
    if lower_name.endswith(".md"):
        return "md"
    return "txt"


def parse_uploaded_document(filename: str, content: bytes) -> str:
    file_kind = guess_text_extension(filename)
    if file_kind == "pdf":
        return extract_text_from_pdf(content)
    return decode_text_content(content)


def decode_text_content(content: bytes) -> str:
    for encoding in ("utf-8", "gb18030", "gbk"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("当前文件编码无法识别，请上传 UTF-8/GBK 文本或 PDF 材料。")


def extract_text_from_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    page_blocks: list[str] = []
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            page_blocks.append(f"## 第{index}页\n{text}")
    if not page_blocks:
        raise ValueError("PDF 未提取到可识别文本，请先执行 OCR 后再上传。")
    return "\n\n".join(page_blocks)
