"""
공고 조회 API (읽기 전용).

DB에 실제로 저장된 공고만 반환한다. 샘플 공고를 만들어 내지 않는다.
쿼리 파라미터는 프론트엔드 HttpProgramRepository와 같다:
search, receptionStatus, stage, agencyType, region, supportType(여러 번 지정 가능), ordering.
"""

from django.db.models import F, Q
from rest_framework import viewsets

from .models import Program
from .serializers import ProgramSerializer


class ProgramViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProgramSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = Program.objects.prefetch_related("eligibility_rules", "required_docs")

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(ministry__icontains=search)
                | Q(agency__icontains=search)
                | Q(summary_easy__icontains=search)
            )

        for param, field in (
            ("receptionStatus", "reception_status"),
            ("stage", "stage"),
            ("agencyType", "agency_type"),
        ):
            values = params.getlist(param)
            if values:
                queryset = queryset.filter(**{f"{field}__in": values})

        # JSON 목록 필드: 선택한 값 중 하나라도 포함하면 결과에 넣는다 (PostgreSQL JSONB contains).
        for param, field in (("region", "regions"), ("supportType", "support_types")):
            values = params.getlist(param)
            if values:
                condition = Q()
                for value in values:
                    condition |= Q(**{f"{field}__contains": [value]})
                queryset = queryset.filter(condition)

        ordering = params.get("ordering")
        if ordering == "deadline":
            queryset = queryset.order_by(F("apply_end").asc(nulls_last=True), "id")
        elif ordering == "amount":
            queryset = queryset.order_by(F("max_amount_krw").desc(nulls_last=True), "id")
        # 'recommended'는 기업 프로필이 필요하므로 서버 정렬을 하지 않는다 (프로필은 현재 브라우저에만 있다).

        return queryset
