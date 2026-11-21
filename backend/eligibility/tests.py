"""판정 엔진 테스트 (REVISION_05 §2.6). DB 없이 실행된다.

- 엄격 판정 회귀: 정답세트 가상 기업 16곳 × 세부사업 전체를 strict_verdict()와 reference_eval.judge()로 각각 판정해
  불일치 0건이어야 한다.
- 3탭 분류: 미충족 → 신청 불가 / 주요 모름 → 확인 필요 / 체크리스트만 모름 → 신청 가능 + N개 /
  주요 조건 충족 체크 → 신청 가능 / 미충족 체크 → 신청 불가 / 체크 취소 → 원래 분류.
"""
import csv
import importlib.util
import json
from pathlib import Path

from django.test import SimpleTestCase

from eligibility.engine import classify_tabs, strict_verdict

GOLD = Path(__file__).resolve().parents[1] / "data" / "eligibility_goldset"


def load_reference():
    spec = importlib.util.spec_from_file_location("reference_eval", GOLD / "reference_eval.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StrictVerdictRegressionTest(SimpleTestCase):
    def test_matches_reference_eval_for_all_profiles_and_programs(self):
        reference = load_reference()
        conds = list(csv.DictReader((GOLD / "conditions.csv").open(encoding="utf-8-sig")))
        profiles = json.loads((GOLD / "profiles.json").read_text(encoding="utf-8"))
        programs = list(csv.DictReader((GOLD / "programs_summary.csv").open(encoding="utf-8-sig")))
        self.assertEqual(len(profiles), 16)
        self.assertGreater(len(programs), 150)
        mismatches = []
        for p in profiles:
            for pr in programs:
                expected = reference.judge(conds, p, pr["program_id"], pr["parent_id"])
                actual = strict_verdict(conds, p, pr["program_id"], pr["parent_id"])
                if (actual[0], sorted(actual[1]), sorted(actual[2])) != (expected[0], sorted(expected[1]), sorted(expected[2])):
                    mismatches.append((p["profile_id"], pr["program_id"], expected[0], actual[0]))
        self.assertEqual(mismatches, [])


def cond(cond_id, kind="필수", group="A", cond_type="A02", expr=None):
    return {"cond_id": cond_id, "program_id": "X1", "parent_id": "X1", "kind": kind, "group": group,
            "cond_type": cond_type, "affects_verdict": "Y", "expr": expr or {"check": ""}}


BASE_PROFILE = {"size": "소기업", "attrs": [], "hq": "경기 화성시", "sites": [], "industry": ["제조업"], "issues": []}


class ThreeTabClassificationTest(SimpleTestCase):
    def test_unmet_condition_is_ineligible(self):
        conds = [cond("R1", expr={"atom": "hq_region", "op": "in", "value": ["부산"]})]
        self.assertEqual(classify_tabs(conds, BASE_PROFILE, "X1").tab, "ineligible")

    def test_major_unknown_is_needs_check(self):
        conds = [cond("R1", cond_type="C01")]  # 기관 회원·입주(주요) 확인 필요
        result = classify_tabs(conds, BASE_PROFILE, "X1")
        self.assertEqual(result.tab, "needs-check")
        self.assertEqual(result.major_unknown, ["R1"])

    def test_checklist_unknown_only_is_eligible_with_checklist(self):
        conds = [
            cond("R1", expr={"atom": "hq_region", "op": "in", "value": ["경기"]}),
            cond("R2", kind="제외", group="", cond_type="B06", expr={"check": ""}),
            cond("R3", group="B", cond_type="C04", expr={"check": ""}),
        ]
        result = classify_tabs(conds, BASE_PROFILE, "X1")
        self.assertEqual(result.tab, "eligible")
        self.assertEqual(sorted(result.checklist), ["R2", "R3"])

    def test_checking_major_conditions_met_moves_to_eligible_and_cancel_restores(self):
        conds = [cond("R1", cond_type="C01"), cond("R2", group="B", cond_type="C05")]
        self.assertEqual(classify_tabs(conds, BASE_PROFILE, "X1").tab, "needs-check")
        moved = classify_tabs(conds, BASE_PROFILE, "X1", answers={"R1": "met", "R2": "met"})
        self.assertEqual(moved.tab, "eligible")
        self.assertEqual(sorted(moved.user_decided), ["R1", "R2"])
        # 체크 취소 → 원래 분류
        self.assertEqual(classify_tabs(conds, BASE_PROFILE, "X1", answers={}).tab, "needs-check")

    def test_checking_unmet_moves_to_ineligible(self):
        conds = [cond("R1", cond_type="C01")]
        self.assertEqual(classify_tabs(conds, BASE_PROFILE, "X1", answers={"R1": "unmet"}).tab, "ineligible")
        exclusion = [cond("E1", kind="제외", group="", cond_type="B06")]
        self.assertEqual(classify_tabs(exclusion, BASE_PROFILE, "X1", answers={"E1": "unmet"}).tab, "ineligible")
        self.assertEqual(classify_tabs(exclusion, BASE_PROFILE, "X1", answers={"E1": "met"}).tab, "eligible")

    def test_missing_profile_input_for_a_type_counts_as_major(self):
        conds = [{**cond("R1", cond_type="A06", expr={"atom": "export_usd", "op": ">=", "value": 1000}), "importance": "체크리스트"}]
        result = classify_tabs(conds, {**BASE_PROFILE, "export_usd": None}, "X1")
        self.assertEqual(result.tab, "needs-check")


class NoticeSourceLinksTableTest(SimpleTestCase):
    """공고 원문 링크·제목 보정표 (backend/data/notice_source_links.csv, 2026-11-22)"""

    def test_table_is_valid(self):
        from eligibility.management.commands.apply_notice_source_links import load_table

        rows = load_table()
        ids = [r["program_id"] for r in rows]
        self.assertEqual(len(rows), 324)
        self.assertEqual(len(set(ids)), len(ids))
        self.assertTrue(all(r["source_url"].startswith("https://") for r in rows))
        # 원문 대조 제목을 유지한 1건 (엑셀 제안은 suggested_title에 보존)
        n003 = next(r for r in rows if r["program_id"] == "N003")
        self.assertEqual(n003["title"], "수출24 글로벌 대행 (해외시장조사) 서비스")
        self.assertEqual(n003["suggested_title"], "(수출24) 거래 교신 지원")
