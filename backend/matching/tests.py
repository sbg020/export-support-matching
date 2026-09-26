"""판정 엔진 테스트. DB가 필요 없다 (SimpleTestCase)."""

from django.test import SimpleTestCase

from .engine import diagnose_export_stage, evaluate_eligibility, evaluate_fit

SOURCE = {"quote": "테스트 근거 문구", "url": None, "locator": None}


def blank_program(**overrides):
    """테스트 전용 빈 공고. 실제 공고 데이터가 아니다."""
    program = {
        "id": "test-only",
        "sourceUrl": None,
        "verifiedAt": None,
        "sourcePublishedAt": None,
        "eligibilityRules": None,
    }
    program.update(overrides)
    return program


class EligibilityEngineTests(SimpleTestCase):
    def test_no_rules_returns_none(self):
        self.assertIsNone(evaluate_eligibility({}, blank_program()))
        self.assertIsNone(evaluate_eligibility({}, blank_program(eligibilityRules=[])))

    def test_missing_source_returns_none(self):
        rules = [{"id": "r1", "kind": "export-usd-min", "label": "수출액", "valueUsd": 1, "source": SOURCE}]
        self.assertIsNone(evaluate_eligibility({}, blank_program(eligibilityRules=rules)))

    def test_missing_input_needs_check(self):
        rules = [
            {"id": "r1", "kind": "export-usd-max", "label": "수출액", "valueUsd": 100, "source": SOURCE},
            {"id": "r2", "kind": "manual", "label": "기타", "source": SOURCE},
        ]
        program = blank_program(sourceUrl="test://source", verifiedAt="2000-01-01", eligibilityRules=rules)
        result = evaluate_eligibility({}, program)
        self.assertEqual(result["status"], "needs-check")
        self.assertEqual(result["basisDate"], "2000-01-01")

    def test_zero_export_is_valid_input(self):
        rules = [{"id": "r1", "kind": "export-usd-max", "label": "수출액", "valueUsd": 100, "source": SOURCE}]
        program = blank_program(sourceUrl="test://source", verifiedAt="2000-01-01", eligibilityRules=rules)
        self.assertEqual(evaluate_eligibility({"exportUsdLastYear": 0}, program)["status"], "eligible")
        self.assertEqual(evaluate_eligibility({"exportUsdLastYear": 1000}, program)["status"], "ineligible")

    def test_years_without_published_date_needs_check(self):
        rules = [{"id": "r1", "kind": "years-since-founded-max", "label": "업력", "years": 7, "source": SOURCE}]
        program = blank_program(sourceUrl="test://source", verifiedAt="2000-01-01", eligibilityRules=rules)
        result = evaluate_eligibility({"foundedAt": "1990-01-01"}, program)
        self.assertEqual(result["conditions"][0]["status"], "needs-check")


class CriteriaGuardTests(SimpleTestCase):
    def test_fit_and_stage_need_verified_criteria(self):
        self.assertIsNone(evaluate_fit({}, blank_program()))
        self.assertIsNone(diagnose_export_stage({"exportUsdLastYear": 0}))
