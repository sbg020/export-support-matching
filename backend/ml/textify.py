"""공고문 텍스트화 (REVISION_05 §7.5).

- PDF: pdfplumber. 굵은 글씨로 겹친 문자(dedupe_chars), 비슷하게 생긴 기호, \\x00, 사용자 정의 영역(PUA) 문자를 정규화한다.
- HWPX: ZIP 안의 Contents/section*.xml 을 직접 파싱한다.
- HWP: 변환 도구가 없으므로 '텍스트 추출 불가'로 둔다 (관리자가 본문을 붙여 넣는다).
- 이미지(PNG·JPG)와 글자가 거의 없는 PDF(이미지형)도 '텍스트 추출 불가'다. OCR은 하지 않는다.
결과: {"status": "ok" | "text-failed", "reason": str, "pages": [쪽별 텍스트]}
"""
from __future__ import annotations

import hashlib
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree

# 비슷하게 생긴 기호 → 표준 기호
SYMBOL_MAP = str.maketrans({
    "｢": "「", "｣": "」", "〔": "(", "〕": ")", "（": "(", "）": ")", "：": ":", "～": "~", "∼": "~",
    "‧": "·", "∙": "·", "ㆍ": "·", "•": "·", "‘": "'", "’": "'", "“": '"', "”": '"', "－": "-", "–": "-", "—": "-",
    " ": " ", "　": " ",
})
PUA = re.compile("[-\x00]")
MIN_CHARS_PER_DOC = 200


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text or "")
    text = PUA.sub("", text).translate(SYMBOL_MAP)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _pdf_pages(path: Path) -> list[str]:
    import pdfplumber

    pages = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            try:
                text = page.dedupe_chars(tolerance=1).extract_text() or ""
            except Exception:  # 손상된 쪽은 빈 쪽으로 둔다
                text = ""
            pages.append(normalize_text(text))
    return pages


def _hwpx_pages(path: Path) -> list[str]:
    pages = []
    with zipfile.ZipFile(path) as archive:
        sections = sorted(n for n in archive.namelist() if re.match(r"Contents/section\d+\.xml$", n))
        for name in sections:
            root = ElementTree.fromstring(archive.read(name))
            paragraphs = []
            for para in root.iter():
                if para.tag.endswith("}p"):
                    texts = [t.text or "" for t in para.iter() if t.tag.endswith("}t")]
                    if texts:
                        paragraphs.append("".join(texts))
            pages.append(normalize_text("\n".join(paragraphs)))
    return pages


def textify(path: Path) -> dict:
    suffix = path.suffix.lower()
    try:
        if suffix == ".pdf":
            pages = _pdf_pages(path)
        elif suffix == ".hwpx":
            pages = _hwpx_pages(path)
        elif suffix == ".hwp":
            return {"status": "text-failed", "reason": "HWP 변환 도구 없음", "pages": []}
        elif suffix in {".png", ".jpg", ".jpeg", ".gif", ".bmp"}:
            return {"status": "text-failed", "reason": "이미지형 공고 (OCR 미지원)", "pages": []}
        else:
            return {"status": "text-failed", "reason": f"지원하지 않는 형식 ({suffix})", "pages": []}
    except Exception as error:  # 파일 손상 등
        return {"status": "text-failed", "reason": f"읽기 오류: {type(error).__name__}", "pages": []}
    total = sum(len(p) for p in pages)
    if total < MIN_CHARS_PER_DOC:
        return {"status": "text-failed", "reason": "글자가 거의 없음 (이미지형 PDF)", "pages": pages}
    return {"status": "ok", "reason": "", "pages": pages}


def split_sentences(pages: list[str]) -> list[tuple[int, str]]:
    """쪽 번호(1부터)와 줄 단위 문장. 정답세트 '문장라벨'도 줄 단위다."""
    out = []
    for index, page in enumerate(pages, start=1):
        for line in page.split("\n"):
            line = line.strip()
            if len(line) >= 4:
                out.append((index, line))
    return out
