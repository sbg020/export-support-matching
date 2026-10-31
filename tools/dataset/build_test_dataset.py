"""정답 세트 초안(xlsx)을 웹 테스트 데이터셋(JSON)으로 바꾼다. (docs/revisions/REVISION_02.md §3)

- 같은 입력이면 같은 바이트가 나오도록 ID순으로 정렬하고, 빌드 시각 대신 입력 파일의 SHA-256을 meta에 남긴다.
- 원문에 없는 값(쉬운 설명, 선정 후 의무, 원문 URL 등)은 만들지 않고 null로 둔다.
- 최종 평가용 test 공고(inventory_150의 split에 'test'가 들어간 공고)가 섞이면 변환을 멈춘다.

실행 예 (저장소 루트에서):
    tools/.venv/Scripts/python tools/dataset/build_test_dataset.py \
        --input "수출 지원사업 공고문/정답세트/EC_정답세트_초안_30건.xlsx" \
        --input "수출 지원사업 공고문/정답세트/EC_정답세트_초안_랜덤30건.xlsx" \
        --inventory-from "수출 지원사업 공고문/정답세트/EC_정답세트_초안_랜덤30건.xlsx" \
        --source-urls "수출 지원사업 공고문/정답세트/source_urls.csv" \
        --as-of 2026-10-30 \
        --out frontend/src/data/test-dataset.json \
        --report docs/data/test-dataset-report.md
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import sys
import warnings
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

# 정답 세트의 데이터 유효성 검사(드롭다운) 확장은 값과 무관하다
warnings.filterwarnings("ignore", message="Data Validation extension", module="openpyxl")

SCHEMA_VERSION = 1
SHEETS = ("programs", "rules", "bonuses", "documents")
EXCEL_EPOCH = dt.date(1899, 12, 30)

# ── 사전 (정답 세트 dictionary 시트와 같은 값) ──
RULE_FIELDS = {
    "company_type", "hq_region", "factory_region", "business_age_years", "industry",
    "revenue_krw", "export_usd", "employees", "certification", "product_hs", "intent", "manual_check",
}
RULE_OPS = {
    "in": "in", "not_in": "not_in", ">=": ">=", ">": ">", "<=": "<=", "<": "<",
    "between": "between", "has": "has", "not_has": "not_has", "제한없음": "no-limit", "-": "none",
}
KNOWN_UNITS = {"USD", "KRW", "명", "년", "KSIC", "KSIC 3자리", "HS 4단위"}
CATEGORY_CODES = {f"C{n:02d}" for n in range(1, 16)}
RULE_KIND = {"필수": "required", "제외": "exclusion"}
CERTAINTY = {"명확": "clear", "애매": "ambiguous"}
REQUIREMENT = {"필수": "required", "해당 시": "conditional", "선택": "optional"}
EXPORT_STAGE = {"내수": "domestic", "초보": "beginner", "유망": "promising", "성장": "growth", "강소": "strong"}
REVIEWED_STATUSES = {"확인", "수정", "추가"}

REGION_CODES = {
    "서울": ["seoul"], "부산": ["busan"], "대구": ["daegu"], "인천": ["incheon"], "광주": ["gwangju"],
    "대전": ["daejeon"], "울산": ["ulsan"], "세종": ["sejong"], "경기": ["gyeonggi"], "강원": ["gangwon"],
    "충북": ["chungbuk"], "충남": ["chungnam"], "전북": ["jeonbuk"], "전남": ["jeonnam"], "경북": ["gyeongbuk"],
    "경남": ["gyeongnam"], "제주": ["jeju"], "전남광주": ["gwangju", "jeonnam"], "전국": ["nationwide"],
}

# §3.4 지원방식 키워드 (띄어쓰기를 지우고 비교)
SUPPORT_TYPE_KEYWORDS = [
    ("voucher", ["바우처"]),
    ("grant", ["비용보조", "보조금", "현금지급", "직불금", "장려금", "사후지원", "실비"]),
    ("loan-guarantee", ["보험", "보증", "융자", "대출"]),
    ("consulting", ["컨설팅", "자문", "멘토링"]),
    ("training", ["교육", "아카데미"]),
    ("in-kind", ["부스", "참가비", "제공", "무료", "대행", "입점"]),
]

# §3.4 기관 유형 (첫 기관명 기준, 위에서부터)
ASSOCIATION_WORDS = ["협회", "조합", "상공회의소", "연합회"]
PUBLIC_AGENCY_WORDS = ["진흥원", "공단", "공사", "재단", "(재)", "테크노파크", "센터", "보호원"]
LOCAL_GOV_WORDS = ["특별시", "광역시", "특별자치시", "특별자치도", "특례시"]

# §6.6 공통 확인 키 (값의 괄호 밖, 띄어쓰기 제거 후 비교)
COMMON_CHECK_WORDS = {
    "closure": ["휴업", "폐업", "휴·폐업"],
    "tax-arrears": ["체납"],
    "credit": ["연체", "신용불량", "채무불이행", "부도", "회생", "파산", "불량거래", "법정관리", "회수의문"],
    "sanction": ["참여제한", "제재", "부정행위", "부정수급", "부정당"],
    "financial-health": ["부채비율", "자본잠식", "감사의견"],
}
DUPLICATE_WORDS = ["중복", "기수혜", "동일사업", "타기관"]

# §8.2 서류 유형
DOCUMENT_TYPES = {
    "사업자등록증": "business-registration",
    "사업자등록증명원": "business-registration",
    "재무제표": "financial-statements",
    "수출실적증명서": "export-performance",
    "사업계획서": "business-plan",
    "중소기업확인서": "sme-confirmation",
    "국세·지방세 납세증명서": "tax-certificate",
    "인증·시험 증빙": "certification-copy",
    "지식재산권 증빙": "ip-evidence",
    "통장 사본": "bank-account-copy",
    "4대보험 관련 증명": "insurance-certificate",
    "공장등록증": "factory-registration",
    "부가가치세 과세표준증명": "vat-base-certificate",
    "제품 소개 자료": "product-brochure",
}
PROGRAM_FORMS = {"사업신청서", "참가신청서", "서약서", "개인(신용)정보 동의서"}

# §8.3 정산 방식 (띄어쓰기를 지우고 비교)
REIMBURSEMENT_WORDS = [
    "사후정산", "사후지급", "사후지원", "후지급", "後정산", "선집행", "先집행",
    "선지출", "선결제", "완료후정산", "증빙후지급", "월별지급",
]
MIXED_WORDS = ["또는사후정산", "사후정산또는"]
SUPPLIER_ONLY = "공급기업에사후지급"

# §7.4 가점 항목 → 프로필 코드 (인증 §6.7 + 지식재산권)
BONUS_MATCH_WORDS = [
    ("venture", "벤처"), ("innobiz", "이노비즈"), ("mainbiz", "메인비즈"),
    ("export-promising", "수출유망중소기업"), ("women", "여성기업"), ("disabled", "장애인기업"),
    ("social", "사회적기업"), ("research-institute", "기업부설연구소"),
    ("patent", "특허"), ("utility-model", "실용신안"), ("trademark", "상표"), ("design", "디자인권"),
]

FIELD_LABELS = {
    "company_type": "기업 유형", "hq_region": "본사 소재지", "factory_region": "공장 소재지",
    "business_age_years": "업력", "industry": "업종·품목", "revenue_krw": "매출액", "export_usd": "수출액",
    "employees": "상시근로자 수", "certification": "보유 인증", "product_hs": "품목 HS코드",
    "intent": "수출 의향", "manual_check": "확인 사항",
}
OP_SUFFIX = {">=": "이상", ">": "초과", "<=": "이하", "<": "미만"}


class ConversionError(Exception):
    pass


# ── 공통 유틸 ──

def natural_key(value: str) -> list:
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", value)]


def compact(text: str) -> str:
    return re.sub(r"\s+", "", text)


def clean(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def to_iso_date(value, warn, where: str) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, (int, float)):
        warn(f"{where}: 날짜가 엑셀 일련번호({value})로 들어 있어 날짜로 바꿨습니다.")
        return (EXCEL_EPOCH + dt.timedelta(days=int(value))).isoformat()
    text = str(value).strip()
    match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", text)
    if match:
        return text
    warn(f"{where}: 날짜로 읽을 수 없는 값 '{text}'은 비워 둡니다.")
    return None


def to_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value) if float(value).is_integer() else float(value)
    text = str(value).strip().replace(",", "")
    if re.fullmatch(r"-?\d+(\.\d+)?", text):
        number = float(text)
        return int(number) if number.is_integer() else number
    return None


def page_locator(page) -> str | None:
    if page is None or page == "":
        return None
    if isinstance(page, float) and page.is_integer():
        page = int(page)
    return f"{page}쪽"


def source_ref(quote, page, url):
    quote = clean(quote)
    if quote is None:
        return None
    return {"quote": quote, "url": url, "locator": page_locator(page)}


def split_top_level(text: str, separators: str = ",") -> list[str]:
    """괄호·대괄호 밖의 구분자로만 나눈다."""
    parts, depth, current = [], 0, []
    for ch in text:
        if ch in "([（【":
            depth += 1
        elif ch in ")]）】":
            depth = max(0, depth - 1)
        if ch in separators and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return [part.strip() for part in parts if part.strip()]


PAREN_RE = re.compile(r"[(（]([^()（）]*)[)）]")


def strip_parens(text: str) -> tuple[str, list[str]]:
    """괄호와 그 안의 내용을 떼어 낸다. 중첩 괄호는 안쪽부터 반복해서 지운다."""
    notes: list[str] = []
    previous = None
    while previous != text:
        previous = text
        for match in PAREN_RE.finditer(text):
            inner = match.group(1).strip()
            if inner:
                notes.append(inner)
        text = PAREN_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip(), notes


def format_amount(value, unit: str | None) -> str:
    """20000000 USD → '2,000만 달러', 30000000000 KRW → '300억 원'"""
    suffix = {"USD": " 달러", "KRW": " 원"}.get(unit or "", "")
    number = float(value)
    for size, word in ((100_000_000, "억"), (10_000, "만")):
        if abs(number) >= size:
            scaled = number / size
            body = f"{int(scaled):,}" if scaled.is_integer() else f"{scaled:,.1f}"
            return f"{body}{word}{suffix}"
    body = f"{int(number):,}" if number.is_integer() else f"{number:,}"
    return f"{body}{suffix}"


# ── 시트 읽기 ──

def read_sheet(workbook, name: str, path: Path) -> list[dict]:
    if name not in workbook.sheetnames:
        raise ConversionError(f"{path.name}: '{name}' 시트가 없습니다.")
    rows = workbook[name].iter_rows(values_only=True)
    next(rows, None)  # 1행: 한글 열 이름
    keys = next(rows, None)  # 2행: 영문 키
    if not keys:
        raise ConversionError(f"{path.name} [{name}]: 2행(영문 키)이 없습니다.")
    keys = [clean(k) for k in keys]
    records = []
    for row_number, values in enumerate(rows, start=3):
        if not any(v not in (None, "") for v in values):
            continue
        record = {key: value for key, value in zip(keys, values) if key}
        record["_row"] = row_number
        record["_file"] = path.name
        records.append(record)
    return records


def load_workbook(path: Path):
    return openpyxl.load_workbook(path, read_only=True, data_only=True)


# ── 파생 값 ──

def reception_status(start: str | None, end: str | None, as_of: str) -> str | None:
    if start and start > as_of:
        return "upcoming"
    if end and end < as_of:
        return "closed"
    if start or end:
        return "open"
    return None


def agency_type(organizer: str | None) -> str | None:
    if not organizer:
        return None
    first = re.split(r"[,/]", organizer)[0].strip()
    if any(word in first for word in ASSOCIATION_WORDS):
        return "association"
    if any(word in first for word in PUBLIC_AGENCY_WORDS):
        return "public-agency"
    name, _ = strip_parens(first)
    if re.search(r"(부|처|청)$", name):
        return "central-ministry"
    if any(word in name for word in LOCAL_GOV_WORDS) or re.search(r"(도|시|군|구)$", name):
        return "local-government"
    return None


def support_types(text: str | None) -> list[str] | None:
    if not text:
        return None
    flat = compact(text)
    found = [value for value, words in SUPPORT_TYPE_KEYWORDS if any(word in flat for word in words)]
    return found or None


def parse_regions(scope: str | None, warn, where: str):
    if not scope:
        return None, [], None
    body, notes = strip_parens(scope)
    codes: list[str] = []
    districts: list[str] = []
    for token in split_top_level(body):
        words = token.split()
        if not words:
            continue
        mapped = REGION_CODES.get(words[0])
        if mapped is None:
            warn(f"{where}: 지역 범위 '{scope}'의 '{words[0]}'을(를) 지역 코드로 바꾸지 못했습니다.")
            return None, [], scope
        for code in mapped:
            if code not in codes:
                codes.append(code)
        if len(words) > 1:
            districts.append(" ".join(words[1:]))
    return codes or None, districts, "; ".join(notes) or None


def self_payment_ratio(text: str | None):
    """'자부담 30%'처럼 비율이 명시된 경우(문장 맨 앞 또는 '자부담' 바로 뒤)만 읽는다."""
    if not text:
        return None
    match = re.match(r"^\s*(?:자부담\s*)?(\d+(?:\.\d+)?)\s*%", text)
    if not match:
        return None
    number = float(match.group(1))
    return int(number) if number.is_integer() else number


def settlement(row: dict, source_url):
    for column in ("support_types", "self_burden", "amount_note"):
        text = clean(row.get(column))
        if not text:
            continue
        flat = compact(text)
        if any(word in flat for word in MIXED_WORDS):
            return {"type": "mixed", "source": {"quote": text, "url": source_url, "locator": None}}
    for column in ("support_types", "self_burden", "amount_note"):
        text = clean(row.get(column))
        if not text:
            continue
        flat = compact(text).replace(SUPPLIER_ONLY, "")
        if any(word in flat for word in REIMBURSEMENT_WORDS):
            return {"type": "reimbursement", "source": {"quote": text, "url": source_url, "locator": None}}
    return None


def common_check_keys(value: str) -> tuple[list[str] | None, list[str]]:
    body, _ = strip_parens(value)
    flat = compact(body).replace("부도덕", "")
    keys = [key for key, words in COMMON_CHECK_WORDS.items() if any(compact(w) in flat for w in words)]
    if not keys:
        return None, []
    text = re.sub(r"^\s*공통\s*결격\s*사유\s*[:：]\s*", "", body)
    items = [item.strip() for item in re.split(r"(?<!\d),|,(?!\d)", text) if item.strip()]
    all_words = [compact(w) for words in COMMON_CHECK_WORDS.values() for w in words]
    uncovered = []
    for item in items:
        flat_item = compact(item).replace("부도덕", "")
        if not any(word in flat_item for word in all_words):
            uncovered.append(item)
    return keys, uncovered


def exception_text(value: str | None, note: str | None) -> str | None:
    if value:
        for inner in PAREN_RE.findall(value):
            if "예외" in inner:
                return inner.strip()
    if note and "예외" in note:
        for sentence in re.split(r"(?<=[.。])\s+|;\s*", note):
            if "예외" in sentence:
                return sentence.strip()
    return None


def bonus_points(effect: str | None):
    if not effect:
        return None
    body, _ = strip_parens(effect)
    if any(mark in body for mark in ("~", "최대", "각", "%")):
        return None
    numbers = re.findall(r"([+\-−]?\d+(?:\.\d+)?)\s*점", body)
    if len(set(numbers)) != 1:
        return None
    raw = numbers[0].replace("−", "-").replace("+", "")
    number = float(raw)
    if "감점" in body and number > 0:
        number = -number
    return int(number) if number.is_integer() else number


def bonus_match_keys(item: str | None) -> list[str] | None:
    if not item:
        return None
    flat = compact(item).replace("중소벤처기업부", "")
    keys = [key for key, word in BONUS_MATCH_WORDS if word in flat]
    return keys or None


# ── 규칙 ──

def rule_value(op: str, raw, warn, where: str):
    """값과 값의 괄호 메모를 돌려준다."""
    if op in ("in", "not_in", "has", "not_has"):
        text = clean(raw)
        if text is None:
            warn(f"{where}: 값이 비어 있습니다.")
            return [], None
        tokens, notes = [], []
        for token in split_top_level(text):
            body, inner = strip_parens(token)
            notes.extend(inner)
            if body:
                tokens.append(body)
        return tokens, "; ".join(notes) or None
    if op in (">=", ">", "<=", "<"):
        number = to_number(raw)
        if number is None:
            warn(f"{where}: 숫자로 읽을 수 없는 값 '{raw}'은 비워 둡니다.")
        return number, None
    if op == "between":
        text = clean(raw) or ""
        parts = [to_number(p) for p in text.split("~")]
        if len(parts) == 2 and None not in parts:
            return parts, None
        warn(f"{where}: 범위로 읽을 수 없는 값 '{raw}'은 비워 둡니다.")
        return None, None
    text = clean(raw)
    return text, None


def rule_label(field: str, op: str, kind: str, raw, value, unit, basis, posted_year: int | None) -> str:
    name = FIELD_LABELS[field]
    if field in ("manual_check", "intent"):
        text = clean(raw) or name
        label = text if field == "manual_check" else f"{name}: {text}"
    elif op == "no-limit":
        label = f"{name}: 제한 없음"
    elif field == "export_usd" and op == ">" and value == 0:
        label = "수출 실적: 있음"
    elif op in OP_SUFFIX and value is not None:
        prefix = name
        if field in ("export_usd", "revenue_krw"):
            year_match = re.search(r"(\d{4})년", basis or "")
            if (basis and ("전년도" in basis or "직전" in basis)) or (
                year_match and posted_year and int(year_match.group(1)) == posted_year - 1
            ):
                prefix = f"직전 연도 {name}"
        if field in ("export_usd", "revenue_krw"):
            amount = format_amount(value, unit or ("USD" if field == "export_usd" else "KRW"))
        elif field == "business_age_years":
            amount = f"{value:g}년"
        elif field == "employees":
            amount = f"{value:g}명"
        else:
            amount = f"{value:,}" if isinstance(value, (int, float)) else str(value)
        label = f"{prefix}: {amount} {OP_SUFFIX[op]}"
    else:
        text = clean(raw) or ""
        label = f"{name}: {text}" if text else name
    return f"제외 — {label}" if kind == "exclusion" else label


def build_rule(row: dict, source_url, posted_year, warn) -> dict:
    where = f"{row['_file']} rules {row.get('rule_key')}"
    field = clean(row.get("field"))
    op_raw = clean(row.get("op"))
    kind = RULE_KIND.get(clean(row.get("kind")) or "")
    if field not in RULE_FIELDS:
        raise ConversionError(f"{where}: 사전에 없는 field '{field}'")
    if op_raw not in RULE_OPS:
        raise ConversionError(f"{where}: 사전에 없는 op '{op_raw}'")
    if kind is None:
        raise ConversionError(f"{where}: 구분(kind) '{row.get('kind')}'을 알 수 없습니다.")
    op = RULE_OPS[op_raw]
    raw_value = row.get("value")
    value, value_note = rule_value(op, raw_value, warn, where)
    unit = clean(row.get("unit"))
    if unit is not None and unit not in KNOWN_UNITS:
        warn(f"{where}: 알 수 없는 단위 '{unit}'를 그대로 둡니다.")
    basis_raw = row.get("basis")
    if isinstance(basis_raw, (int, float, dt.date, dt.datetime)):
        basis = to_iso_date(basis_raw, warn, f"{where} 기준 시점")
    else:
        basis = clean(basis_raw)
    certainty = CERTAINTY.get(clean(row.get("certainty")) or "")
    if certainty is None:
        warn(f"{where}: 확실성 값 '{row.get('certainty')}'을(를) 알 수 없어 '애매'로 둡니다.")
        certainty = "ambiguous"
    evidence = clean(row.get("evidence"))
    if evidence is None or row.get("page") in (None, ""):
        warn(f"{where}: 근거 문장이나 쪽 번호가 비어 있습니다.")
    group = clean(row.get("group"))
    if group == "-" or kind == "exclusion":
        group = None
    note = clean(row.get("note"))
    keys, uncovered = (None, [])
    if field == "manual_check" and isinstance(raw_value, str):
        keys, uncovered = common_check_keys(raw_value)
    return {
        "id": clean(row.get("rule_key")),
        "kind": kind,
        "group": group,
        "scope": clean(row.get("scope")),
        "field": field,
        "op": op,
        "value": value,
        "valueNote": value_note,
        "unit": unit,
        "basis": basis,
        "certainty": certainty,
        "label": rule_label(field, op, kind, raw_value, value, unit, basis, posted_year),
        "commonCheckKey": keys,
        "commonCheckUncovered": uncovered,
        "exceptionText": exception_text(clean(raw_value) if isinstance(raw_value, str) else None, note),
        "source": {"quote": evidence or "", "url": source_url, "locator": page_locator(row.get("page"))},
        "note": note,
        "review": {
            "author": clean(row.get("author")),
            "status": clean(row.get("review_status")),
            "source": clean(row.get("source")),
        },
    }


def build_document(row: dict, source_url) -> dict:
    name = clean(row.get("doc_name"))
    requirement = REQUIREMENT.get(clean(row.get("required")) or "")
    return {
        "id": clean(row.get("doc_key")),
        "name": name,
        "originalName": clean(row.get("original")),
        "requirement": requirement,
        "documentType": DOCUMENT_TYPES.get(name or ""),
        "isProgramForm": (name in PROGRAM_FORMS),
        "note": None,
        "source": source_ref(row.get("evidence"), row.get("page"), source_url),
    }


def build_bonus(row: dict, source_url) -> dict:
    return {
        "id": clean(row.get("bonus_key")),
        "item": clean(row.get("item")),
        "effectText": clean(row.get("effect")),
        "certainty": CERTAINTY.get(clean(row.get("certainty")) or "", "ambiguous"),
        "points": bonus_points(clean(row.get("effect"))),
        "matchKeys": bonus_match_keys(clean(row.get("item"))),
        "source": source_ref(row.get("evidence"), row.get("page"), source_url),
    }


# ── 변환 본체 ──

def read_source_urls(path: Path | None):
    if path is None or not path.exists():
        return {}, None
    urls = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            program_id = clean(row.get("program_id"))
            url = clean(row.get("source_url"))
            if program_id and url:
                urls[program_id] = {"url": url, "checkedAt": clean(row.get("checked_at"))}
    return urls, {"file": path.as_posix(), "sha256": sha256_of(path), "rows": len(urls)}


def convert(args) -> tuple[dict, dict]:
    warnings_list: list[str] = []
    warn = warnings_list.append
    excluded: list[str] = []

    sources_meta = []
    sheet_rows: dict[str, list[dict]] = {name: [] for name in SHEETS}
    for path in args.input:
        workbook = load_workbook(path)
        counts = {}
        for name in SHEETS:
            records = read_sheet(workbook, name, path)
            key = {"programs": "program_id", "rules": "rule_key", "bonuses": "bonus_key", "documents": "doc_key"}[name]
            records = [r for r in records if clean(r.get(key)) or clean(r.get("program_id"))]
            kept = []
            for record in records:
                if clean(record.get("review_status")) == "삭제":
                    excluded.append(f"{path.name} [{name}] {record.get(key)} (검수상태 '삭제')")
                    continue
                kept.append(record)
            counts[name] = len(records)
            sheet_rows[name].extend(kept)
        sources_meta.append({"file": path.as_posix(), "sha256": sha256_of(path), "rows": counts})

    inventory_book = load_workbook(args.inventory_from)
    inventory = {clean(r.get("pid")): r for r in read_sheet(inventory_book, "inventory_150", args.inventory_from)}
    source_urls, source_urls_meta = read_source_urls(args.source_urls)

    # programs
    programs_by_id: dict[str, dict] = {}
    for row in sheet_rows["programs"]:
        program_id = clean(row.get("program_id"))
        if program_id in programs_by_id:
            raise ConversionError(f"program_id '{program_id}'가 두 번 나옵니다 ({row['_file']}).")
        programs_by_id[program_id] = row
    parent_ids = {clean(r.get("parent_id")) or clean(r.get("program_id")) for r in programs_by_id.values()}

    for parent in sorted(parent_ids, key=natural_key):
        split = clean((inventory.get(parent) or {}).get("split"))
        if split is None:
            warn(f"{parent}: inventory_150에 없는 공고입니다.")
        elif "test" in split:
            raise ConversionError(f"{parent}: 최종 평가용 test 공고(split '{split}')는 사이트 데이터에 넣을 수 없습니다.")

    def targets_for(program_id: str, sheet: str) -> list[str]:
        if program_id in programs_by_id:
            return [program_id]
        children = [pid for pid, row in programs_by_id.items() if (clean(row.get("parent_id")) or pid) == program_id]
        if not children:
            raise ConversionError(f"[{sheet}] 없는 공고 '{program_id}'를 가리키는 행이 있습니다.")
        return children

    attached: dict[str, dict[str, list]] = defaultdict(lambda: {"rules": [], "documents": [], "bonuses": []})
    review_statuses: dict[str, list[str]] = defaultdict(list)
    for sheet in ("rules", "documents", "bonuses"):
        for row in sheet_rows[sheet]:
            program_id = clean(row.get("program_id"))
            for target in targets_for(program_id, sheet):
                attached[target][sheet].append(row)
            parent = clean(programs_by_id.get(program_id, {}).get("parent_id")) or program_id
            if sheet != "bonuses":
                review_statuses[parent].append(clean(row.get("review_status")) or "")
    for program_id, row in programs_by_id.items():
        parent = clean(row.get("parent_id")) or program_id
        review_statuses[parent].append(clean(row.get("review_status")) or "")

    as_of = args.as_of
    programs = []
    for program_id in sorted(programs_by_id, key=natural_key):
        row = programs_by_id[program_id]
        where = f"{row['_file']} programs {program_id}"
        parent_id = clean(row.get("parent_id")) or program_id
        url_entry = source_urls.get(program_id) or source_urls.get(parent_id)
        source_url = url_entry["url"] if url_entry else None

        posted = to_iso_date(row.get("posted_at"), warn, f"{where} 공고일")
        start = to_iso_date(row.get("apply_start"), warn, f"{where} 접수 시작")
        end = to_iso_date(row.get("apply_end"), warn, f"{where} 접수 마감")
        if posted is None:
            warn(f"{where}: 게시일(공고일)이 없습니다.")
        if start is None and end is None:
            warn(f"{where}: 접수기간이 없습니다 (기간 메모: {clean(row.get('period_note')) or '-'}).")

        regions, districts, region_note = parse_regions(clean(row.get("region_scope")), warn, where)

        max_total = to_number(row.get("max_amount_krw"))
        max_subsidy = to_number(row.get("subsidy_max_krw"))
        amount_note = clean(row.get("amount_note"))
        for column, number in (("max_amount_krw", max_total), ("subsidy_max_krw", max_subsidy)):
            raw = row.get(column)
            if raw not in (None, "") and number is None:
                warn(f"{where}: 금액 '{raw}'({column})을 숫자로 읽지 못해 비우고 메모에 남깁니다.")
                amount_note = f"{amount_note} / 원문 금액 표현: {raw}" if amount_note else f"원문 금액 표현: {raw}"

        categories_raw = clean(row.get("categories"))
        out_of_scope = {"Y": True, "N": False}.get(clean(row.get("out_of_scope")) or "")
        if categories_raw:
            categories = [c.strip() for c in categories_raw.split(",") if c.strip()]
            bad = [c for c in categories if c not in CATEGORY_CODES]
            if bad:
                raise ConversionError(f"{where}: C01~C15 밖의 분류 코드 {bad}")
            categories = list(dict.fromkeys(categories))
        elif out_of_scope:
            categories = []
        else:
            categories = None
            warn(f"{where}: 세부 분야(categories)가 비어 있습니다.")

        target_stage_raw = clean(row.get("target_stage"))
        target_stages = None
        if target_stage_raw:
            target_stages = []
            for token in re.split(r"[,·/]", target_stage_raw):
                token = token.strip()
                if token in EXPORT_STAGE:
                    target_stages.append(EXPORT_STAGE[token])
                elif token:
                    warn(f"{where}: 대상 수출단계 '{token}'을(를) 알 수 없습니다.")

        self_burden = clean(row.get("self_burden"))
        amount_source = source_ref(row.get("amount_evidence"), row.get("amount_page"), source_url)
        # 조건 문구의 '직전 연도' 판단용 (게시일 → 접수 시작 → 접수 마감 → 데이터 기준일 순)
        posted_year = int((posted or start or end or as_of)[:4])

        rules = sorted(
            (build_rule(r, source_url, posted_year, warn) for r in attached[program_id]["rules"]),
            key=lambda r: natural_key(r["id"]),
        )
        documents = sorted(
            (build_document(r, source_url) for r in attached[program_id]["documents"]),
            key=lambda d: natural_key(d["id"]),
        )
        bonuses = sorted(
            (build_bonus(r, source_url) for r in attached[program_id]["bonuses"]),
            key=lambda b: natural_key(b["id"]),
        )
        # §6.6: 중복수혜 관련 직접 확인 규칙의 근거 문장만 옮긴다 (중복 여부는 판정하지 않음)
        duplicate_notes = []
        for rule in rules:
            if rule["field"] != "manual_check" or not rule["source"]["quote"]:
                continue
            haystack = compact(str(rule["value"] or "") + rule["source"]["quote"])
            if any(word in haystack for word in DUPLICATE_WORDS):
                if all(n["quote"] != rule["source"]["quote"] for n in duplicate_notes):
                    duplicate_notes.append(dict(rule["source"]))

        statuses = review_statuses[parent_id]
        reviewed = bool(statuses) and all(s in REVIEWED_STATUSES for s in statuses)
        checked_at = url_entry.get("checkedAt") if url_entry else None
        data_state = "verified" if reviewed and source_url and checked_at else ("reviewed" if reviewed else "draft")
        group_key = clean((inventory.get(parent_id) or {}).get("group"))

        programs.append({
            "id": program_id,
            "parentId": parent_id,
            "subProgramName": clean(row.get("sub_program")) if parent_id != program_id else None,
            "title": clean(row.get("title")),
            "sourceTitle": clean(row.get("title")),
            "sourceFile": clean(row.get("file")),
            "sourceUrl": source_url,
            "sourcePublishedAt": posted,
            "verifiedAt": checked_at if data_state == "verified" else None,
            "applyStart": start,
            "applyEnd": end,
            "applyPeriodNote": clean(row.get("period_note")),
            "applyPeriodSource": source_ref(row.get("period_evidence"), row.get("period_page"), source_url),
            "receptionStatus": reception_status(start, end, as_of),
            "receptionStatusAsOf": as_of,
            "announcementDate": to_iso_date(row.get("result_at"), warn, f"{where} 결과 발표"),
            "agreementDate": None,
            "ministry": clean(row.get("organizer")),
            "agency": clean(row.get("operator")),
            "agencyType": agency_type(clean(row.get("organizer"))),
            "regions": regions,
            "regionDistricts": districts,
            "regionNote": region_note,
            "supportTypes": support_types(clean(row.get("support_types"))),
            "supportTypesNote": clean(row.get("support_types")),
            "maxAmountKrw": max_subsidy,
            "totalBudgetMaxKrw": max_total,
            "amountNote": amount_note,
            "amountSource": amount_source,
            "selfPayment": None if self_burden is None else {
                "ratioPercent": self_payment_ratio(self_burden),
                "note": self_burden,
                "source": amount_source,
            },
            "settlement": settlement(row, source_url),
            "selectionSize": clean(row.get("selection_size")),
            "targetExportStages": target_stages,
            "targetStageSource": source_ref(row.get("target_stage_evidence"), row.get("target_stage_page"), source_url),
            "supportCategories": categories,
            "categorySource": source_ref(row.get("category_evidence"), row.get("category_page"), source_url),
            "isVoucherMenu": {"Y": True, "N": False}.get(clean(row.get("voucher_type")) or ""),
            "outOfCategoryScope": out_of_scope,
            "summaryEasy": None,
            "targetDescription": None,
            "useExamples": None,
            "obligations": None,
            "prepEstimate": None,
            "eligibilityRules": rules,
            "requiredDocs": documents,
            "bonusItems": bonuses,
            "duplicateSupportNotes": duplicate_notes or None,
            "groupKey": group_key,
            "relatedProgramIds": [],
            "draftNotes": clean(row.get("notes")),
            "review": {
                "author": clean(row.get("author")),
                "status": clean(row.get("review_status")),
                "source": clean(row.get("source")),
                "reviewer": clean(row.get("reviewer")),
            },
            "dataState": data_state,
        })

    # 관련 공고: 같은 원공고의 다른 세부사업 + inventory 그룹이 같은 공고
    for program in programs:
        related = [
            other["id"] for other in programs
            if other["id"] != program["id"] and (
                other["parentId"] == program["parentId"]
                or (program["groupKey"] and other["groupKey"] == program["groupKey"])
            )
        ]
        program["relatedProgramIds"] = sorted(related, key=natural_key)

    states = {p["dataState"] for p in programs}
    overall_state = "draft" if "draft" in states else ("reviewed" if "reviewed" in states else "verified")
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "datasetVersion": f"test-{as_of}",
        "asOf": as_of,
        "dataState": overall_state,
        "sources": sources_meta,
        "inventory": {"file": args.inventory_from.as_posix(), "sha256": sha256_of(args.inventory_from)},
        "sourceUrls": source_urls_meta,
        "counts": {
            "announcements": len({p["parentId"] for p in programs}),
            "programs": len(programs),
            "rules": len(sheet_rows["rules"]),
            "bonuses": len(sheet_rows["bonuses"]),
            "documents": len(sheet_rows["documents"]),
        },
    }
    report_input = {"warnings": warnings_list, "excluded": excluded, "sheet_rows": sheet_rows}
    return {"meta": meta, "programs": programs}, report_input


# ── 출력 ──

def dump_dataset(dataset: dict) -> str:
    """meta는 들여쓰기, 공고는 한 줄에 하나 (같은 입력 → 같은 바이트, 공고 단위로 diff가 보이게)."""
    meta = json.dumps(dataset["meta"], ensure_ascii=False, indent=1)
    lines = [json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in dataset["programs"]]
    body = ",\n".join(f" {line}" for line in lines)
    return "{\n\"meta\": " + meta + ",\n\"programs\": [\n" + body + "\n]\n}\n"


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def table(headers: list[str], rows: list[list]) -> str:
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    for row in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|").replace("\n", " ") for c in row) + " |")
    return "\n".join(out)


def build_report(dataset: dict, report_input: dict) -> str:
    meta, programs = dataset["meta"], dataset["programs"]
    lines = [
        "# 테스트 데이터셋 변환 보고서",
        "",
        "> `tools/dataset/build_test_dataset.py`가 만든 파일이다. 손으로 고치지 말고 스크립트를 다시 실행한다.",
        f"> 데이터 버전 `{meta['datasetVersion']}` · 기준일 `{meta['asOf']}` · 데이터 상태 `{meta['dataState']}`",
        "",
        "## 1. 입력과 행 수",
        "",
        table(["파일", "SHA-256 (앞 16자)", "programs", "rules", "bonuses", "documents"], [
            [s["file"], s["sha256"][:16], s["rows"]["programs"], s["rows"]["rules"], s["rows"]["bonuses"], s["rows"]["documents"]]
            for s in meta["sources"]
        ]),
        "",
        f"- 공고 그룹·split: `{meta['inventory']['file']}`의 `inventory_150` 시트",
        f"- 원문 URL 목록: {('`' + meta['sourceUrls']['file'] + '` (' + str(meta['sourceUrls']['rows']) + '건)') if meta['sourceUrls'] else '없음 → 모든 `sourceUrl`은 null'}",
        "",
        table(["항목", "수"], [[k, v] for k, v in meta["counts"].items()]),
        "",
        "## 2. 제외한 행",
        "",
    ]
    lines += [f"- {item}" for item in report_input["excluded"]] or ["- 없음 (검수상태 '삭제' 행 없음, test 공고 없음)"]
    lines += ["", "## 3. 경고", ""]
    lines += [f"- {item}" for item in report_input["warnings"]] or ["- 없음"]

    def dist(label, values):
        counter = Counter(values)
        return [label, ", ".join(f"{k if k is not None else '없음'} {v}" for k, v in sorted(counter.items(), key=lambda kv: str(kv[0])))]

    lines += [
        "", "## 4. 파생 값 분포 (68행 기준)", "",
        table(["항목", "분포"], [
            dist("접수상태", [p["receptionStatus"] for p in programs]),
            dist("기관 유형", [p["agencyType"] for p in programs]),
            dist("데이터 상태", [p["dataState"] for p in programs]),
            dist("바우처형", [p["isVoucherMenu"] for p in programs]),
            dist("15개 분류 밖", [p["outOfCategoryScope"] for p in programs]),
            dist("지원방식", [t for p in programs for t in (p["supportTypes"] or [None])]),
            dist("세부 분야", [c for p in programs for c in (p["supportCategories"] if p["supportCategories"] is not None else [None])]),
            dist("대상 지역", [r for p in programs for r in (p["regions"] or [None])]),
            ["게시일 있는 행", sum(1 for p in programs if p["sourcePublishedAt"])],
            ["대상 수출단계가 적힌 행", sum(1 for p in programs if p["targetExportStages"])],
        ]),
    ]

    rules = [r for p in programs for r in p["eligibilityRules"]]
    unique_rules = {r["id"]: r for r in rules}
    by_key = defaultdict(set)
    by_key_programs = defaultdict(set)
    for p in programs:
        for r in p["eligibilityRules"]:
            for key in r["commonCheckKey"] or []:
                by_key[key].add(r["id"])
                by_key_programs[key].add(p["parentId"])
    keyed = {r["id"]: r for r in unique_rules.values() if r["commonCheckKey"]}
    keyed_programs = {p["parentId"] for p in programs for r in p["eligibilityRules"] if r["commonCheckKey"]}
    lines += [
        "", "## 5. 공통 확인 키 (§6.6)", "",
        table(["키", "규칙 수", "공고 수"], [
            [key, len(by_key[key]), len(by_key_programs[key])] for key in COMMON_CHECK_WORDS
        ]),
        "",
        f"- 키가 붙은 규칙 {len(keyed)}개 · 공고 {len(keyed_programs)}개 · 구분: "
        + ", ".join(f"{k} {v}" for k, v in sorted(Counter(r['kind'] for r in keyed.values()).items())),
        f"- P005-R11(무역보험공사 신용등급) 키: {unique_rules.get('P005-R11', {}).get('commonCheckKey')}",
        "",
        "공통 확인으로 다 덮이지 않는 규칙 (`commonCheckUncovered`):",
        "",
    ]
    uncovered = [r for r in unique_rules.values() if r["commonCheckUncovered"]]
    lines += [f"- {r['id']}: {', '.join(r['commonCheckUncovered'])}" for r in sorted(uncovered, key=lambda r: natural_key(r['id']))] or ["- 없음"]
    exceptions = sorted((r for r in unique_rules.values() if r["exceptionText"]), key=lambda r: natural_key(r["id"]))
    lines += [
        "",
        f"예외 문구가 있는 규칙 {len(exceptions)}개 · 공고 {len({r['id'].split('-R')[0] for r in exceptions})}개 "
        f"(그중 공통 확인 키가 붙은 규칙 {sum(1 for r in exceptions if r['commonCheckKey'])}개):",
        "",
    ]
    lines += [f"- {r['id']}: {r['exceptionText']}" for r in exceptions] or ["- 없음"]
    lines += [
        "", "규칙 필드·연산자·확실성 분포 (규칙 548개 기준):", "",
        table(["항목", "분포"], [
            dist("field", [r["field"] for r in unique_rules.values()]),
            dist("op", [r["op"] for r in unique_rules.values()]),
            dist("kind", [r["kind"] for r in unique_rules.values()]),
            dist("certainty", [r["certainty"] for r in unique_rules.values()]),
            ["일부 지원 항목 조건(scope)", sum(1 for r in unique_rules.values() if r["scope"])],
        ]),
    ]

    settlement_rows = [p for p in programs if p["settlement"]]
    self_max = [
        (p["id"], p["totalBudgetMaxKrw"] - p["maxAmountKrw"]) for p in programs
        if isinstance(p["totalBudgetMaxKrw"], (int, float)) and isinstance(p["maxAmountKrw"], (int, float))
        and p["totalBudgetMaxKrw"] - p["maxAmountKrw"] > 0
    ]
    zero_diff = [
        p["id"] for p in programs
        if isinstance(p["totalBudgetMaxKrw"], (int, float)) and isinstance(p["maxAmountKrw"], (int, float))
        and p["totalBudgetMaxKrw"] - p["maxAmountKrw"] == 0
    ]
    lines += [
        "", "## 6. 정산 방식·자기부담 (§8.3)", "",
        f"- 정산 방식이 나온 행 {len(settlement_rows)}개 · 공고 {len({p['parentId'] for p in settlement_rows})}개: "
        + ", ".join(f"{k} {v}" for k, v in sorted(Counter(p['settlement']['type'] for p in settlement_rows).items())),
        "- `mixed`: " + (", ".join(p["id"] for p in settlement_rows if p["settlement"]["type"] == "mixed") or "없음"),
        f"- 최대 자기부담 금액이 계산되는 행 {len(self_max)}개: " + ", ".join(f"{pid} {amount:,}원" for pid, amount in self_max),
        "- 총사업비 한도와 지원금 한도가 같아 금액을 계산하지 않는 행: " + (", ".join(zero_diff) or "없음"),
        "- 자부담 비율을 읽은 행: " + (", ".join(
            f"{p['id']} {p['selfPayment']['ratioPercent']}%" for p in programs
            if p["selfPayment"] and p["selfPayment"]["ratioPercent"] is not None
        ) or "없음"),
    ]

    bonuses = {b["id"]: b for p in programs for b in p["bonusItems"]}
    documents = {d["id"]: d for p in programs for d in p["requiredDocs"]}
    lines += [
        "", "## 7. 가점·서류", "",
        f"- 가점 {len(bonuses)}개: 점수를 읽은 항목 {sum(1 for b in bonuses.values() if b['points'] is not None)}개, "
        f"프로필로 확인할 수 있는 항목 {sum(1 for b in bonuses.values() if b['matchKeys'])}개, "
        f"둘 다 있는 항목 {sum(1 for b in bonuses.values() if b['matchKeys'] and b['points'] is not None)}개",
        "",
        table(["가점", "효과 원문", "점수", "프로필 코드"], [
            [b["id"], b["effectText"], b["points"] if b["points"] is not None else "-", ", ".join(b["matchKeys"] or []) or "-"]
            for b in sorted(bonuses.values(), key=lambda b: natural_key(b["id"]))
        ]),
        "",
        table(["항목", "분포"], [
            dist("제출 구분", [d["requirement"] for d in documents.values()]),
            dist("서류 유형", [d["documentType"] for d in documents.values()]),
            ["공고 전용 서식", sum(1 for d in documents.values() if d["isProgramForm"])],
        ]),
        "",
    ]
    return "\n".join(lines)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="정답 세트 초안 → 테스트 데이터셋 JSON")
    parser.add_argument("--input", action="append", type=Path, required=True, help="정답 세트 xlsx (여러 번)")
    parser.add_argument("--inventory-from", type=Path, required=True, help="inventory_150 시트를 읽을 xlsx")
    parser.add_argument("--source-urls", type=Path, default=None, help="검수자가 확인한 원문 URL CSV")
    parser.add_argument("--as-of", required=True, help="데이터 기준일 (YYYY-MM-DD)")
    parser.add_argument("--out", type=Path, required=True, help="출력 JSON")
    parser.add_argument("--report", type=Path, required=True, help="변환 보고서 (Markdown)")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.as_of):
        parser.error("--as-of는 YYYY-MM-DD 형식이어야 합니다.")
    return args


def meta_path_for(out: Path) -> Path:
    return out.with_name(out.stem + ".meta.json")


def main(argv=None) -> int:
    args = parse_args(argv)
    try:
        dataset, report_input = convert(args)
    except ConversionError as error:
        print(f"변환 중단: {error}", file=sys.stderr)
        return 1
    write_text(args.out, dump_dataset(dataset))
    write_text(meta_path_for(args.out), json.dumps(dataset["meta"], ensure_ascii=False, indent=1) + "\n")
    write_text(args.report, build_report(dataset, report_input))
    counts = dataset["meta"]["counts"]
    print(
        f"완료: 공고 {counts['announcements']} · 행 {counts['programs']} · 규칙 {counts['rules']} · "
        f"가점 {counts['bonuses']} · 서류 {counts['documents']} · 경고 {len(report_input['warnings'])}건"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
