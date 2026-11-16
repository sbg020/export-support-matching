"""완성된 정답세트 엑셀 읽기 (REVISION_05 §2.2).

- 신청자격 엑셀: 조건유형 · 공고별_자격요약 · 자격조건 · 문장라벨 · 기업프로필 시트
- 지원분류 엑셀: programs · rules · bonuses · documents · inventory_150 (tools/dataset/build_test_dataset.py 변환을 그대로 쓴다)
엑셀 1행은 한글 머리글, 2행은 영문 머리글, 3행부터 값이다. 검수상태가 '삭제'인 행은 읽지 않는다.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_TOOL_DIR = REPO_ROOT / "tools" / "dataset"


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    return text or None


def sheet_records(workbook, name: str) -> list[dict]:
    rows = list(workbook[name].iter_rows(values_only=True))
    if len(rows) < 3:
        return []
    keys = [clean(k) for k in rows[1]]
    out = []
    for row in rows[2:]:
        if not row or all(v is None for v in row):
            continue
        rec = {k: v for k, v in zip(keys, row) if k}
        if clean(rec.get("review_status")) == "삭제":
            continue
        out.append(rec)
    return out


def split_list(value) -> list[str]:
    text = clean(value)
    if not text or text in {"해당 없음", "-", "없음"}:
        return []
    return [part.strip() for part in text.replace(";", ",").split(",") if part.strip()]


def to_number(value):
    if value is None or value == "":
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return int(num) if num.is_integer() else num


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_eligibility_workbook(path: Path) -> dict:
    wb = load_workbook(path, read_only=True, data_only=True)
    types = sheet_records(wb, "조건유형")
    summaries = sheet_records(wb, "공고별_자격요약")
    parent_of = {clean(s["program_id"]): clean(s.get("parent_id")) or clean(s["program_id"]) for s in summaries}
    conditions = []
    for c in sheet_records(wb, "자격조건"):
        cond_id = clean(c.get("cond_id"))
        program_id = clean(c.get("program_id"))
        if not cond_id or not program_id:
            continue
        expr_raw = clean(c.get("expr")) or '{"check": ""}'
        conditions.append({
            "cond_id": cond_id,
            "program_id": program_id,
            "parent_id": parent_of.get(program_id, program_id),
            "scope": clean(c.get("scope")) or "",
            "kind": clean(c.get("kind")) or "필수",
            "group": clean(c.get("group")) or "",
            "cond_type": clean(c.get("cond_type")) or "",
            "cond_type_name": clean(c.get("cond_type_name")) or "",
            "cond_types": clean(c.get("cond_types")) or "",
            "check_mode": clean(c.get("check_mode")) or "",
            "affects_verdict": clean(c.get("affects_verdict")) or "Y",
            "field": clean(c.get("field")) or "",
            "op": clean(c.get("op")) or "",
            "value_raw": clean(c.get("value_raw")) or "",
            "value_norm": clean(c.get("value_norm")) or "",
            "unit": clean(c.get("unit")) or "",
            "basis": clean(c.get("basis")) or "",
            "expr": json.loads(expr_raw),
            "expr_text": clean(c.get("expr_text")) or "",
            "certainty": clean(c.get("certainty")) or "",
            "evidence": clean(c.get("evidence")) or "",
            "page": to_number(c.get("page")),
            "source": clean(c.get("source")) or "",
            "note": clean(c.get("note")) or "",
            "split": clean(c.get("split")) or "",
            "review_status": clean(c.get("review_status")) or "",
            "reviewer": clean(c.get("reviewer")) or "",
        })
    profiles = []
    for r in sheet_records(wb, "기업프로필"):
        if not clean(r.get("profile_id")):
            continue
        issues_text = clean(r.get("issues")) or ""
        issues = [] if issues_text in ("", "해당 없음") else [tok.split()[0] for tok in split_list(issues_text)]
        profiles.append({
            "profile_id": clean(r["profile_id"]),
            "name": clean(r.get("name")),
            "size": clean(r.get("size")),
            "attrs": split_list(r.get("attrs")),
            "hq": clean(r.get("hq")),
            "sites": split_list(r.get("sites")),
            "industry": split_list(r.get("industry")),
            "product": clean(r.get("product")),
            "product_hs": split_list(r.get("product_hs")),
            "export_usd": to_number(r.get("export_usd")),
            "stage": clean(r.get("stage")),
            "revenue_krw": to_number(r.get("revenue_krw")),
            "age": to_number(r.get("age")),
            "employees": to_number(r.get("employees")),
            "certs": split_list(r.get("certs")),
            "debt_ratio": to_number(r.get("debt_ratio")),
            "model": clean(r.get("model")),
            "issues": issues,
            "intent_export": clean(r.get("intent_export")) == "Y",
            "intent_commit": clean(r.get("intent_commit")) == "Y",
        })
    sentences = [
        {
            "sent_id": clean(s.get("sent_id")),
            "parent_id": clean(s.get("parent_id")),
            "page": to_number(s.get("page")),
            "text": clean(s.get("text")) or "",
            "label": clean(s.get("review_label")) or clean(s.get("label")) or "",
            "cond_types": clean(s.get("cond_types")) or "",
            "split": clean(s.get("split")) or "",
        }
        for s in sheet_records(wb, "문장라벨")
        if clean(s.get("sent_id"))
    ]
    return {"types": types, "summaries": summaries, "conditions": conditions, "profiles": profiles, "sentences": sentences}


def convert_classification_workbook(path: Path, source_urls: Path | None, as_of: str) -> dict:
    """지원분류 엑셀 → 화면용 Program 목록 (기존 변환 도구 재사용, 평가용 공고 포함)."""
    sys.path.insert(0, str(DATASET_TOOL_DIR))
    try:
        import build_test_dataset as tool  # type: ignore
    finally:
        sys.path.pop(0)
    args = argparse.Namespace(input=[path], inventory_from=path, source_urls=source_urls, as_of=as_of, allow_test=True)
    dataset, report_input = tool.convert(args)
    return {"dataset": dataset, "warnings": report_input.get("warnings", [])}
