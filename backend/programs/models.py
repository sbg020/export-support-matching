"""
지원사업 공고 모델.

- 아직 수집·검증되지 않은 값은 NULL로 둔다. 빈 문자열, 0, 오늘 날짜, 임의 URL을 결측 대신 저장하지 않는다.
- 목록형 값(JSON)의 NULL은 '확인 전', 빈 배열은 '원문상 해당 없음이 확인됨'을 뜻한다.
- 자격 규칙·필요서류는 *_verified 플래그가 켜져 있을 때만 API에서 목록으로 내보낸다.
- 금액 필드에는 단위를 붙인다 (max_amount_krw).
"""

from django.db import models


class ReceptionStatus(models.TextChoices):
    OPEN = "open", "접수중"
    UPCOMING = "upcoming", "접수예정"
    CLOSED = "closed", "마감"


class SupportStage(models.TextChoices):
    PREPARATION = "preparation", "수출준비"
    MARKET_ENTRY = "market-entry", "시장진출"
    EXECUTION = "execution", "수출이행"
    LOCALIZATION = "localization", "사후관리·현지화"


class AgencyType(models.TextChoices):
    CENTRAL_MINISTRY = "central-ministry", "중앙부처"
    PUBLIC_AGENCY = "public-agency", "공공기관·수출지원기관"
    LOCAL_GOVERNMENT = "local-government", "지방자치단체"
    ASSOCIATION = "association", "협회·단체"


class EligibilityRuleKind(models.TextChoices):
    COMPANY_TYPE_IN = "company-type-in", "기업 형태 포함"
    HQ_REGION_IN = "hq-region-in", "본사 소재지 포함"
    REVENUE_KRW_MAX = "revenue-krw-max", "매출액 상한"
    REVENUE_KRW_MIN = "revenue-krw-min", "매출액 하한"
    EXPORT_USD_MAX = "export-usd-max", "수출액 상한"
    EXPORT_USD_MIN = "export-usd-min", "수출액 하한"
    YEARS_SINCE_FOUNDED_MAX = "years-since-founded-max", "업력 상한"
    YEARS_SINCE_FOUNDED_MIN = "years-since-founded-min", "업력 하한"
    MANUAL = "manual", "수동 확인"


class DocumentType(models.TextChoices):
    BUSINESS_REGISTRATION = "business-registration", "사업자등록증"
    FINANCIAL_STATEMENTS = "financial-statements", "재무제표"
    EXPORT_PERFORMANCE = "export-performance", "수출실적증명서"
    BUSINESS_PLAN = "business-plan", "사업계획서"
    SME_CONFIRMATION = "sme-confirmation", "중소·중견기업 확인서"
    TAX_CERTIFICATE = "tax-certificate", "납세증명서"
    CERTIFICATION_COPY = "certification-copy", "기업 인증서 사본"
    IP_EVIDENCE = "ip-evidence", "지식재산권 증빙"
    OTHER = "other", "기타 서류"


class Program(models.Model):
    """수집·검증된 지원사업 공고 한 건."""

    id = models.CharField("공고 ID", primary_key=True, max_length=64)
    title = models.CharField("공고명", max_length=300, null=True, blank=True)

    source_url = models.URLField("원문 URL", max_length=1000, null=True, blank=True)
    source_title = models.CharField("원문 제목", max_length=300, null=True, blank=True)
    source_published_at = models.DateField("원문 게시일", null=True, blank=True)
    verified_at = models.DateField("검증일", null=True, blank=True, help_text="사람이 원문과 대조해 확인한 날짜")

    apply_start = models.DateTimeField("접수 시작", null=True, blank=True)
    apply_end = models.DateTimeField("접수 마감", null=True, blank=True)
    reception_status = models.CharField(
        "접수상태", max_length=16, choices=ReceptionStatus.choices, null=True, blank=True
    )
    announcement_date = models.DateField("발표일", null=True, blank=True)
    agreement_date = models.DateField("협약일", null=True, blank=True)

    ministry = models.CharField("주관부서", max_length=200, null=True, blank=True)
    agency = models.CharField("수행기관", max_length=200, null=True, blank=True)
    agency_type = models.CharField("기관 유형", max_length=32, choices=AgencyType.choices, null=True, blank=True)
    regions = models.JSONField("대상 지역", null=True, blank=True, help_text="지역 코드 목록. 전국이면 ['nationwide']")

    stage = models.CharField("지원분야(수출 단계)", max_length=32, choices=SupportStage.choices, null=True, blank=True)
    support_areas = models.JSONField("지원 내용 분야", null=True, blank=True)
    support_types = models.JSONField("지원방식", null=True, blank=True)
    max_amount_krw = models.BigIntegerField("최대 지원금(원)", null=True, blank=True)

    self_payment_ratio_percent = models.DecimalField(
        "자기부담 비율(%)", max_digits=5, decimal_places=2, null=True, blank=True
    )
    self_payment_note = models.TextField("자기부담 설명", null=True, blank=True)
    self_payment_source = models.JSONField("자기부담 원문 근거", null=True, blank=True)

    summary_easy = models.TextField("쉬운 설명", null=True, blank=True)
    target_description = models.TextField("지원 대상", null=True, blank=True)
    use_examples = models.JSONField("활용 예", null=True, blank=True)
    obligations = models.JSONField("선정 후 의무사항", null=True, blank=True)
    duplicate_support_notes = models.JSONField("중복수혜 관련 원문", null=True, blank=True)
    related_program_ids = models.JSONField("유사사업 ID", null=True, blank=True)

    prep_estimate_hours = models.DecimalField(
        "예상 준비 시간", max_digits=6, decimal_places=1, null=True, blank=True
    )
    prep_estimate_basis = models.TextField("예상 준비 시간 근거", null=True, blank=True)

    eligibility_rules_verified = models.BooleanField(
        "자격 규칙 확인 완료", default=False, help_text="켜져 있을 때만 자격 규칙 목록을 내보낸다"
    )
    required_docs_verified = models.BooleanField(
        "필요서류 확인 완료", default=False, help_text="켜져 있을 때만 필요서류 목록을 내보낸다"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "지원사업 공고"
        verbose_name_plural = "지원사업 공고"
        ordering = ["apply_end", "id"]

    def __str__(self) -> str:
        return self.title or self.id


class EligibilityRule(models.Model):
    """공고의 신청자격 규칙. 원문 근거(source_quote)가 없는 규칙은 등록하지 않는다."""

    program = models.ForeignKey(Program, related_name="eligibility_rules", on_delete=models.CASCADE)
    rule_id = models.CharField("규칙 ID", max_length=64)
    kind = models.CharField("규칙 종류", max_length=32, choices=EligibilityRuleKind.choices)
    label = models.CharField("조건 이름", max_length=200)
    params = models.JSONField(
        "비교 값", default=dict, blank=True, help_text='예: {"values": [...]}, {"valueKrw": 0}, {"years": 7}'
    )
    source_quote = models.TextField("원문 문구")
    source_url = models.URLField("원문 URL", max_length=1000, null=True, blank=True)
    source_locator = models.CharField("원문 위치", max_length=200, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "자격 규칙"
        verbose_name_plural = "자격 규칙"
        ordering = ["order", "id"]
        constraints = [models.UniqueConstraint(fields=["program", "rule_id"], name="unique_rule_per_program")]

    def __str__(self) -> str:
        return f"{self.program_id} · {self.label}"


class RequiredDocument(models.Model):
    """공고의 필요서류."""

    program = models.ForeignKey(Program, related_name="required_docs", on_delete=models.CASCADE)
    doc_id = models.CharField("서류 ID", max_length=64)
    name = models.CharField("서류명", max_length=200)
    document_type = models.CharField(
        "서류 유형", max_length=32, choices=DocumentType.choices, null=True, blank=True
    )
    note = models.TextField("비고", null=True, blank=True)
    source_quote = models.TextField("원문 문구", null=True, blank=True)
    source_url = models.URLField("원문 URL", max_length=1000, null=True, blank=True)
    source_locator = models.CharField("원문 위치", max_length=200, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "필요서류"
        verbose_name_plural = "필요서류"
        ordering = ["order", "id"]
        constraints = [models.UniqueConstraint(fields=["program", "doc_id"], name="unique_doc_per_program")]

    def __str__(self) -> str:
        return f"{self.program_id} · {self.name}"
