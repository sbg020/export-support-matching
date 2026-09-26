"""
공고 직렬화. 프론트엔드의 Program 타입(frontend/src/types/program.ts)과 같은 camelCase JSON을 만든다.
값이 없으면 null을 그대로 내보낸다.
"""

from rest_framework import serializers

from .models import EligibilityRule, Program, RequiredDocument


def source_reference(quote, url, locator):
    if not quote:
        return None
    return {"quote": quote, "url": url, "locator": locator}


class EligibilityRuleSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="rule_id")
    source = serializers.SerializerMethodField()

    class Meta:
        model = EligibilityRule
        fields = ["id", "kind", "label", "source"]

    def get_source(self, obj):
        return source_reference(obj.source_quote, obj.source_url, obj.source_locator)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # 규칙 종류별 비교 값(values, valueKrw, valueUsd, years)을 최상위에 펼친다.
        data.update(instance.params or {})
        return data


class RequiredDocumentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="doc_id")
    documentType = serializers.CharField(source="document_type", allow_null=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = RequiredDocument
        fields = ["id", "name", "documentType", "note", "source"]

    def get_source(self, obj):
        return source_reference(obj.source_quote, obj.source_url, obj.source_locator)


class ProgramSerializer(serializers.ModelSerializer):
    sourceUrl = serializers.CharField(source="source_url", allow_null=True)
    sourceTitle = serializers.CharField(source="source_title", allow_null=True)
    sourcePublishedAt = serializers.DateField(source="source_published_at", allow_null=True)
    verifiedAt = serializers.DateField(source="verified_at", allow_null=True)
    applyStart = serializers.DateTimeField(source="apply_start", allow_null=True)
    applyEnd = serializers.DateTimeField(source="apply_end", allow_null=True)
    receptionStatus = serializers.CharField(source="reception_status", allow_null=True)
    announcementDate = serializers.DateField(source="announcement_date", allow_null=True)
    agreementDate = serializers.DateField(source="agreement_date", allow_null=True)
    agencyType = serializers.CharField(source="agency_type", allow_null=True)
    supportAreas = serializers.JSONField(source="support_areas", allow_null=True)
    supportTypes = serializers.JSONField(source="support_types", allow_null=True)
    maxAmountKrw = serializers.IntegerField(source="max_amount_krw", allow_null=True)
    summaryEasy = serializers.CharField(source="summary_easy", allow_null=True)
    targetDescription = serializers.CharField(source="target_description", allow_null=True)
    useExamples = serializers.JSONField(source="use_examples", allow_null=True)
    duplicateSupportNotes = serializers.JSONField(source="duplicate_support_notes", allow_null=True)
    relatedProgramIds = serializers.JSONField(source="related_program_ids", allow_null=True)
    selfPayment = serializers.SerializerMethodField()
    prepEstimate = serializers.SerializerMethodField()
    eligibilityRules = serializers.SerializerMethodField()
    requiredDocs = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = [
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
        ]

    def get_selfPayment(self, obj):
        if obj.self_payment_ratio_percent is None and not obj.self_payment_note:
            return None
        return {
            "ratioPercent": float(obj.self_payment_ratio_percent) if obj.self_payment_ratio_percent is not None else None,
            "note": obj.self_payment_note,
            "source": obj.self_payment_source,
        }

    def get_prepEstimate(self, obj):
        # 근거 없는 추정치는 내보내지 않는다.
        if obj.prep_estimate_hours is None or not obj.prep_estimate_basis:
            return None
        return {"hours": float(obj.prep_estimate_hours), "basis": obj.prep_estimate_basis}

    def get_eligibilityRules(self, obj):
        if not obj.eligibility_rules_verified:
            return None
        return EligibilityRuleSerializer(obj.eligibility_rules.all(), many=True).data

    def get_requiredDocs(self, obj):
        if not obj.required_docs_verified:
            return None
        return RequiredDocumentSerializer(obj.required_docs.all(), many=True).data
