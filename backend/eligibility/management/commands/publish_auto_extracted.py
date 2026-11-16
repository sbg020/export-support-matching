"""python manage.py publish_auto_extracted [--yes]

'자동 추출 공고 일괄 게시' (REVISION_05 §2.7-3, §7.7). 검수 대기인 자동 추출 공고를 게시한다.
게시된 공고는 화면에 '자동 추출 · 검수 전' 배지가 붙는다. 텍스트 추출 불가 공고는 게시하지 않는다.
실행 전 대상 건수를 보여 주고, --yes 가 없으면 확인을 묻는다.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from eligibility.models import Notice


class Command(BaseCommand):
    help = "검수 대기 중인 자동 추출 공고를 일괄 게시한다"

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="확인 없이 실행")

    def handle(self, *args, yes: bool, **opts):
        targets = Notice.objects.filter(status=Notice.Status.PENDING, auto_extracted=True)
        count = targets.count()
        self.stdout.write(f"일괄 게시 대상: 자동 추출 · 검수 대기 공고 {count}건")
        if count == 0:
            return
        if not yes and input("게시할까요? (yes 입력) ").strip().lower() != "yes":
            self.stdout.write("취소했습니다.")
            return
        updated = targets.update(status=Notice.Status.PUBLISHED, published_at=timezone.now())
        self.stdout.write(f"게시했습니다: {updated}건 ('자동 추출 · 검수 전' 배지 표시)")
