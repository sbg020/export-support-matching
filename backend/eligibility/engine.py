"""신청 자격 판정 엔진 (REVISION_05 §2.3·§2.4).

- strict_verdict(): 정답세트 reference_eval.py 와 같은 규칙. 조건마다 True(충족/해당) · False · None(모름).
  결과는 '신청 가능' / '확인 필요' / '신청 불가' 와 불가·모름 조건 ID.
- classify_tabs(): strict 결과 위에 조건 중요도(주요/체크리스트)와 기업 체크 답을 얹어 3탭으로 나눈다.

프로필(dict)은 reference_eval.py 의 형식을 따른다:
  size, attrs[], hq, sites[], industry[], product_hs[], export_usd, revenue_krw, age, employees,
  certs[], debt_ratio, model, issues[], intent_export, intent_commit
실제 기업 화면에서 쓰기 위해 아래만 넓혔다 (정답세트 가상 프로필에서는 결과가 같다).
  - 값이 없는(None) 필드는 모름(None)으로 본다.
  - answered_flags 가 주어지면 그 안에 없는 결격 코드는 모름(None)이다 (미응답).
  - size '중소기업'(세부 규모 모름)이면 소기업·중기업·소상공인 조건은 모름이다.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterable

SIZE_EXPAND = {
    "소상공인": ["소상공인", "소기업", "중소기업"],
    "소기업": ["소기업", "중소기업"],
    "중기업": ["중기업", "중소기업"],
    "중견기업": ["중견기업"],
    "대기업": ["대기업"],
    "대기업(기업집단 소속)": ["대기업", "대기업(기업집단 소속)"],
    # 세부 규모를 모르는 중소기업 (실제 기업 입력용, 정답세트 프로필에는 없음)
    "중소기업": ["중소기업"],
}
SME_DETAIL = {"소기업", "중기업", "소상공인"}
TRACKED = {
    "중소기업", "소기업", "중기업", "소상공인", "중견기업", "대기업", "대기업(기업집단 소속)", "대기업 출자회사", "상장기업",
    "공공기관", "지자체 출자기업", "비영리·단체", "간이과세자", "개인사업자", "법인사업자", "창업기업", "벤처기업", "농어업 생산자",
}
REGION_ALIAS = {"전남광주": ["전남", "광주"]}

VERDICT_OK = "신청 가능"
VERDICT_CHECK = "확인 필요"
VERDICT_NO = "신청 불가"


def company_types(p: dict) -> set[str] | None:
    size = p.get("size")
    if size is None:
        return None
    s = set(SIZE_EXPAND.get(size, [size])) | set(p.get("attrs") or [])
    if p.get("age") is not None and p["age"] < 7:
        s.add("창업기업")
    if "벤처기업" in (p.get("certs") or []):
        s.add("벤처기업")
    return s


def region_match(loc: str, v: str) -> bool:
    if v == "전국":
        return True
    return any(loc == vv or loc.startswith(vv + " ") for vv in REGION_ALIAS.get(v, [v]))


def _num(p: dict, f: str):
    return {
        "export_usd": p.get("export_usd"),
        "revenue_krw": p.get("revenue_krw"),
        "business_age_years": p.get("age"),
        "employees": p.get("employees"),
        "debt_ratio": p.get("debt_ratio"),
    }.get(f)


def ev(e: dict, p: dict) -> bool | None:
    """판정식 1개를 3값 논리로 계산한다."""
    if "true" in e:
        return True
    if "check" in e:
        return None
    if "flag" in e:
        answered = p.get("answered_flags")
        if answered is not None and e["flag"] not in answered and e["flag"] not in (p.get("issues") or []):
            return None
        return e["flag"] in (p.get("issues") or [])
    if "intent" in e:
        return p.get("intent_export") if e["intent"] == "export" else p.get("intent_commit")
    if "distributor" in e:
        return False if p.get("model") == "제조" else None
    if "not" in e:
        x = ev(e["not"], p)
        return None if x is None else (not x)
    if "all" in e:
        xs = [ev(x, p) for x in e["all"]]
        return False if False in xs else (None if None in xs else True)
    if "any" in e:
        xs = [ev(x, p) for x in e["any"]]
        return True if True in xs else (None if None in xs else False)
    f, op, v = e["atom"], e["op"], e["value"]
    if f == "company_type":
        have, vals = company_types(p), set(v)
        if have is None:
            return None
        if have & vals:
            return op == "in"
        if p.get("size") == "중소기업" and vals & SME_DETAIL:
            return None
        return (op != "in") if vals <= TRACKED else None
    if f == "hq_region":
        if not p.get("hq"):
            return None
        m = any(region_match(p["hq"], x) for x in v)
        return m if op == "in" else not m
    if f == "site_region":
        locs = [s for s in (p.get("sites") or []) if s] + ([p["hq"]] if p.get("hq") else [])
        if not locs:
            return None
        m = any(region_match(s, x) for s in locs for x in v)
        return m if op == "in" else not m
    if f == "industry":
        if p.get("industry") is None:
            return None
        m = bool(set(p["industry"]) & set(v))
        return m if op == "in" else not m
    if f == "product_hs":
        if p.get("product_hs") is None:
            return None
        return bool(set(p.get("product_hs") or []) & set(v))
    if f == "certification":
        if p.get("certs") is None:
            return None
        certs = p.get("certs") or []
        return any(any(c.split("(")[0].strip() in x or x.split("(")[0].strip() in c for c in certs) for x in v)
    num = _num(p, f)
    if num is None:
        return None
    return {">": num > v, ">=": num >= v, "<": num < v, "<=": num <= v}[op]


def parse_expr(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    return json.loads(raw)


def _applies(cond: dict, program_id: str, parent_id: str) -> bool:
    return cond["program_id"] in (program_id, parent_id) and cond.get("affects_verdict") == "Y"


def strict_verdict(conds: Iterable[dict], p: dict, program_id: str, parent_id: str | None = None):
    """reference_eval.judge 와 같은 결과: (판정, 불가 조건 ID[], 모름 조건 ID[])"""
    parent_id = parent_id or program_id
    groups: dict[str, list[tuple[str, bool | None]]] = {}
    fails: list[str] = []
    unknown: list[str] = []
    for c in conds:
        if not _applies(c, program_id, parent_id):
            continue
        val = ev(parse_expr(c["expr"]), p)
        if c["kind"] == "제외":
            if val is True:
                fails.append(c["cond_id"])
            elif val is None:
                unknown.append(c["cond_id"])
        else:
            groups.setdefault(c["group"], []).append((c["cond_id"], val))
    for lst in groups.values():
        vals = [v for _, v in lst]
        if True in vals:
            continue
        if all(v is False for v in vals):
            fails += [k for k, _ in lst]
        else:
            unknown += [k for k, v in lst if v is None]
    verdict = VERDICT_NO if fails else (VERDICT_CHECK if unknown else VERDICT_OK)
    return verdict, fails, unknown


# ── 3탭 분류 (§2.4) ──

MAJOR_TYPES = {f"A{i:02d}" for i in range(1, 12)} | {"C01", "C05", "C09"}
DEFAULT_IMPORTANCE = {code: ("주요" if code in MAJOR_TYPES else "체크리스트") for code in
                      [f"A{i:02d}" for i in range(1, 12)] + [f"B{i:02d}" for i in range(1, 10)] + [f"C{i:02d}" for i in range(1, 10)]}

# A 유형 판정에 쓰는 프로필 필드. 값이 없으면 '미입력으로 모름' → 주요로 본다
A_FIELDS = {
    "A01": ["size"], "A02": ["hq"], "A03": ["hq"], "A04": ["industry"], "A05": ["product_hs"], "A06": ["export_usd"],
    "A07": ["revenue_krw"], "A08": ["age"], "A09": ["employees"], "A10": ["certs"], "A11": ["debt_ratio"],
}


def default_importance(cond_type: str | None) -> str:
    return DEFAULT_IMPORTANCE.get(cond_type or "", "주요")


def importance_of(cond: dict, p: dict) -> str:
    imp = cond.get("importance") or default_importance(cond.get("cond_type"))
    t = cond.get("cond_type") or ""
    if t.startswith("A") and imp != "주요":
        if any(p.get(f) is None for f in A_FIELDS.get(t, [])):
            return "주요"
    return imp


@dataclass
class TabResult:
    tab: str  # eligible | needs-check | ineligible
    strict: str
    fails: list[str] = field(default_factory=list)
    major_unknown: list[str] = field(default_factory=list)
    checklist: list[str] = field(default_factory=list)
    user_decided: list[str] = field(default_factory=list)


def classify_tabs(conds: list[dict], p: dict, program_id: str, parent_id: str | None = None,
                  answers: dict[str, str] | None = None) -> TabResult:
    """3탭 분류. answers: {cond_id: 'met' | 'unmet'} 기업 체크 (충족함·해당 없음 = met, 충족하지 않음·해당함 = unmet)."""
    answers = answers or {}
    parent_id = parent_id or program_id
    applicable = [c for c in conds if _applies(c, program_id, parent_id)]
    groups: dict[str, list[tuple[dict, bool | None]]] = {}
    fails: list[str] = []
    unknown: list[dict] = []
    decided: list[str] = []
    for c in applicable:
        ans = answers.get(c["cond_id"])
        if ans in ("met", "unmet"):
            decided.append(c["cond_id"])
            if c["kind"] == "제외":
                val: bool | None = ans == "unmet"
            else:
                val = ans == "met"
        else:
            val = ev(parse_expr(c["expr"]), p)
        if c["kind"] == "제외":
            if val is True:
                fails.append(c["cond_id"])
            elif val is None:
                unknown.append(c)
        else:
            groups.setdefault(c["group"], []).append((c, val))
    for lst in groups.values():
        vals = [v for _, v in lst]
        if True in vals:
            continue
        if all(v is False for v in vals):
            fails += [c["cond_id"] for c, _ in lst]
        else:
            unknown += [c for c, v in lst if v is None]
    strict = VERDICT_NO if fails else (VERDICT_CHECK if unknown else VERDICT_OK)
    major = [c["cond_id"] for c in unknown if importance_of(c, p) == "주요"]
    checklist = [c["cond_id"] for c in unknown if importance_of(c, p) != "주요"]
    if fails:
        tab = "ineligible"
    elif major:
        tab = "needs-check"
    else:
        tab = "eligible"
    return TabResult(tab=tab, strict=strict, fails=fails, major_unknown=major, checklist=checklist, user_decided=decided)
