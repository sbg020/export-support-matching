"""
판정 엔진 (순수 함수).

프론트엔드 frontend/src/lib/engine/ 와 같은 계약을 따른다.
- 공고에 원문 근거가 있는 자격 규칙이 없으면 판정하지 않고 None을 반환한다.
- 원문 URL 또는 검증일이 없으면 판정하지 않는다.
- 기업 입력값이 없으면 해당 조건은 'needs-check'(확인 필요)로 둔다.
- 적합도·수출단계는 검증된 기준(criteria)이 없으면 None을 반환한다. 이전 기획의 가중치·임계치 초안은 쓰지 않는다.

입력은 API 직렬화 형태(camelCase dict)다.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date
from typing import Any

ELIGIBILITY_ENGINE_VERSION = "eligibility-0.1.0"


def _full_years_between(start: str, end: str) -> int | None:
    try:
        a = date.fromisoformat(start[:10])
        b = date.fromisoformat(end[:10])
    except ValueError:
        return None
    years = b.year - a.year
    if (b.month, b.day) < (a.month, a.day):
        years -= 1
    return years


def _needs_input(field_label: str) -> dict[str, Any]:
    return {
        "status": "needs-check",
        "reason": f"기업정보에 {field_label}이(가) 입력되지 않아 확인이 필요합니다.",
        "companyValue": None,
    }


def _compare(value: float, limit: float, kind: str) -> bool:
    return value <= limit if kind.endswith("-max") else value >= limit


def _evaluate_rule(rule: Mapping[str, Any], profile: Mapping[str, Any], program: Mapping[str, Any]) -> dict[str, Any]:
    kind = rule.get("kind")

    if kind == "company-type-in":
        value = profile.get("companyType")
        if value is None:
            return _needs_input("기업 형태")
        ok = value in rule.get("values", [])
        return {"status": "met" if ok else "unmet", "reason": "기업 형태를 공고 대상과 비교했습니다.", "companyValue": value}

    if kind == "hq-region-in":
        value = profile.get("hqRegion")
        if value is None:
            return _needs_input("본사 소재지")
        ok = value in rule.get("values", [])
        return {"status": "met" if ok else "unmet", "reason": "본사 소재지를 공고 대상 지역과 비교했습니다.", "companyValue": value}

    if kind in ("revenue-krw-max", "revenue-krw-min"):
        value = profile.get("revenueKrw")
        if value is None:
            return _needs_input("최근 매출액")
        ok = _compare(value, rule["valueKrw"], kind)
        return {"status": "met" if ok else "unmet", "reason": "최근 매출액을 공고 기준과 비교했습니다.", "companyValue": str(value)}

    if kind in ("export-usd-max", "export-usd-min"):
        value = profile.get("exportUsdLastYear")
        if value is None:
            return _needs_input("최근 1년 수출액")
        ok = _compare(value, rule["valueUsd"], kind)
        return {"status": "met" if ok else "unmet", "reason": "최근 1년 수출액을 공고 기준과 비교했습니다.", "companyValue": f"{value} USD"}

    if kind in ("years-since-founded-max", "years-since-founded-min"):
        founded = profile.get("foundedAt")
        if founded is None:
            return _needs_input("설립일")
        published = program.get("sourcePublishedAt")
        # 업력 기준일은 공고일이다. 공고일이 없으면 오늘 날짜로 대신하지 않는다.
        if published is None:
            return {"status": "needs-check", "reason": "공고일이 확인되지 않아 업력을 계산하지 않았습니다.", "companyValue": None}
        years = _full_years_between(founded, published)
        if years is None:
            return _needs_input("설립일")
        ok = _compare(years, rule["years"], kind)
        return {"status": "met" if ok else "unmet", "reason": "공고일 기준 업력을 공고 기준과 비교했습니다.", "companyValue": f"업력 {years}년"}

    # 'manual' 또는 알 수 없는 규칙은 자동 판정하지 않는다.
    return {
        "status": "needs-check",
        "reason": "자동으로 판정할 수 없는 조건입니다. 공고 원문을 보고 직접 확인해 주세요.",
        "companyValue": None,
    }


def evaluate_eligibility(profile: Mapping[str, Any], program: Mapping[str, Any]) -> dict[str, Any] | None:
    rules = program.get("eligibilityRules")
    if not rules:
        return None
    if not program.get("sourceUrl") or not program.get("verifiedAt"):
        return None

    conditions = []
    for rule in rules:
        outcome = _evaluate_rule(rule, profile, program)
        conditions.append({"ruleId": rule.get("id"), "label": rule.get("label"), "source": rule.get("source"), **outcome})

    statuses = {c["status"] for c in conditions}
    if "unmet" in statuses:
        status = "ineligible"
    elif "needs-check" in statuses:
        status = "needs-check"
    else:
        status = "eligible"

    return {
        "programId": program.get("id"),
        "status": status,
        "conditions": conditions,
        "reasons": [f"{c['label']}: {c['reason']}" for c in conditions if c["status"] != "met"],
        "basisDate": program["verifiedAt"],
        "sourceUrl": program["sourceUrl"],
        "engineVersion": ELIGIBILITY_ENGINE_VERSION,
    }


def evaluate_fit(profile: Mapping[str, Any], program: Mapping[str, Any], criteria: Mapping[str, Any] | None = None):
    """적합도. 검증된 기준이 없으면 계산하지 않는다."""
    if criteria is None:
        return None
    raise NotImplementedError("검증된 적합도 기준이 마련되면 구현한다.")


def diagnose_export_stage(profile: Mapping[str, Any], criteria: Mapping[str, Any] | None = None):
    """수출단계 진단. 검증된 기준이 없으면 판정하지 않는다."""
    if criteria is None:
        return None
    raise NotImplementedError("검증된 진단 기준이 마련되면 구현한다.")
