"""
DB 없이 실행되는 테스트 (SimpleTestCase).
공고를 저장하는 통합 테스트는 PostgreSQL을 연결한 뒤 TestCase로 추가한다.
"""

from django.test import SimpleTestCase
from django.urls import reverse

from .models import Program
from .serializers import ProgramSerializer

FRONTEND_PROGRAM_FIELDS = {
    "id",
    "title",
    "sourceUrl",
    "sourceTitle",
    "sourcePublishedAt",
    "verifiedAt",
    "applyStart",
    "applyEnd",
    "receptionStatus",
    "announcementDate",
    "agreementDate",
    "ministry",
    "agency",
    "agencyType",
    "regions",
    "stage",
    "supportAreas",
    "supportTypes",
    "maxAmountKrw",
    "selfPayment",
    "summaryEasy",
    "targetDescription",
    "useExamples",
    "eligibilityRules",
    "requiredDocs",
    "obligations",
    "duplicateSupportNotes",
    "relatedProgramIds",
    "prepEstimate",
}


class ProgramSerializerTests(SimpleTestCase):
    def test_fields_match_frontend_contract(self):
        data = ProgramSerializer(Program(id="unsaved")).data
        self.assertEqual(set(data.keys()), FRONTEND_PROGRAM_FIELDS)

    def test_missing_values_stay_null(self):
        data = ProgramSerializer(Program(id="unsaved")).data
        for key, value in data.items():
            if key == "id":
                continue
            self.assertIsNone(value, key)

    def test_unverified_lists_are_null_not_empty(self):
        data = ProgramSerializer(Program(id="unsaved")).data
        self.assertIsNone(data["eligibilityRules"])
        self.assertIsNone(data["requiredDocs"])

    def test_prep_estimate_requires_basis(self):
        data = ProgramSerializer(Program(id="unsaved", prep_estimate_hours=10)).data
        self.assertIsNone(data["prepEstimate"])


class HealthTests(SimpleTestCase):
    def test_health(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
