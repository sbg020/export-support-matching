"""공고·자격 조건 저장 (REVISION_05 §2.2·§2.7).

- Notice: 공고(세부사업 1개 = 1행). 정답세트 공고는 '게시(검수 완료)', 폴더 자동 추출 공고는 '검수 대기'.
- Condition: 정답세트 '자격조건' 시트와 같은 열 + importance·검수·confidence.
- ConditionType: 조건 유형 29종 코드표.
- IngestRecord: 공고문 파일 1개의 텍스트화 결과(쪽 구분 텍스트, 해시, 상태).
"""
from django.db import models


class ConditionType(models.Model):
    code = models.CharField(max_length=8, primary_key=True)
    group = models.CharField(max_length=40)
    name = models.CharField(max_length=80)
    mode = models.CharField(max_length=20)
    field = models.CharField(max_length=60, blank=True, default="")
    description = models.TextField(blank=True, default="")
    affects = models.CharField(max_length=20, blank=True, default="")
    default_importance = models.CharField(max_length=10)

    class Meta:
        ordering = ["code"]


class Notice(models.Model):
    class Status(models.TextChoices):
        PUBLISHED = "published", "게시"
        PENDING = "pending-review", "검수 대기"
        TEXT_FAILED = "text-failed", "텍스트 추출 불가"
        REJECTED = "rejected", "반려"
        SUSPENDED = "suspended", "게시 중지"

    program_id = models.CharField(max_length=40, unique=True)
    parent_id = models.CharField(max_length=40, db_index=True)
    title = models.TextField(blank=True, default="")
    sub_program = models.TextField(blank=True, default="")
    source = models.CharField(max_length=40)  # answer-set | folder | bizinfo | kotra | kita
    source_label = models.CharField(max_length=60, blank=True, default="")
    split = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices)
    auto_extracted = models.BooleanField(default=False)
    file_name = models.TextField(blank=True, default="")
    file_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    # 화면용 공고 데이터 (프론트엔드 Program 형식). 확인되지 않은 값은 null
    display = models.JSONField(default=dict)
    categories = models.JSONField(default=list)
    documents = models.JSONField(default=list)
    bonuses = models.JSONField(default=list)
    summary = models.JSONField(default=dict)
    reviewer = models.CharField(max_length=60, blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["program_id"]


class Condition(models.Model):
    cond_id = models.CharField(max_length=60, unique=True)
    notice = models.ForeignKey(Notice, related_name="conditions", on_delete=models.CASCADE, null=True, blank=True)
    program_id = models.CharField(max_length=40, db_index=True)
    parent_id = models.CharField(max_length=40, db_index=True)
    scope = models.TextField(blank=True, default="")
    kind = models.CharField(max_length=8)  # 필수 | 제외
    group = models.CharField(max_length=20, blank=True, default="")
    cond_type = models.CharField(max_length=8, blank=True, default="")
    cond_types = models.CharField(max_length=60, blank=True, default="")
    check_mode = models.CharField(max_length=20, blank=True, default="")
    affects_verdict = models.CharField(max_length=2, default="Y")
    field = models.CharField(max_length=60, blank=True, default="")
    op = models.CharField(max_length=20, blank=True, default="")
    value_raw = models.TextField(blank=True, default="")
    value_norm = models.TextField(blank=True, default="")
    unit = models.CharField(max_length=20, blank=True, default="")
    basis = models.CharField(max_length=60, blank=True, default="")
    expr = models.JSONField(default=dict)
    expr_text = models.TextField(blank=True, default="")
    certainty = models.CharField(max_length=10, blank=True, default="")
    evidence = models.TextField(blank=True, default="")
    page = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=60, blank=True, default="")
    note = models.TextField(blank=True, default="")
    importance = models.CharField(max_length=10)  # 주요 | 체크리스트
    confidence = models.FloatField(null=True, blank=True)
    review_status = models.CharField(max_length=20, blank=True, default="")
    reviewer = models.CharField(max_length=60, blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["cond_id"]


class IngestRecord(models.Model):
    file_name = models.TextField(unique=True)
    file_hash = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=20)  # ok | text-failed | answer-set
    reason = models.TextField(blank=True, default="")
    pages = models.JSONField(default=list)  # 쪽별 텍스트
    program_id = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
