from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """API 프로세스가 실행 중인지만 알려 준다. DB 연결이나 공고 데이터 여부는 확인하지 않는다."""

    def get(self, request):
        return Response({"status": "ok", "service": "export-support-matching-api"})
