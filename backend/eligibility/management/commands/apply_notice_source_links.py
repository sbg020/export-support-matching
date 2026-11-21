"""python manage.py apply_notice_source_links [--dry-run]

공고 원문 링크·제목 보정표(backend/data/notice_source_links.csv)를 DB 공고에 반영한다 (2026-11-22).
- 보정표는 사용자가 준 엑셀 2개(공고문_원문링크_제목수정_27건, 추가공고_297건_원문링크_제목대조)를 옮긴 것이다.
- 바꾸는 값: 공고 제목(Notice.title, display.title)과 원문 URL(display.sourceUrl). 그 밖의 값(원문 파일 제목 sourceTitle,
  조건, 날짜)은 그대로 둔다. 보완 URL은 보정표에만 두고 화면에는 내보내지 않는다.
- 공고를 다시 적재(import_eligibility_goldset, ingest_notice_folder)하면 제목이 원래대로 돌아갈 수 있으니 이 명령을 다시 실행하고
  export_public_snapshot으로 스냅샷을 다시 만든다.
"""
from __future__ import annotations

import csv

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from eligibility.goldset import REPO_ROOT
from eligibility.models import Notice

TABLE = REPO_ROOT / "backend" / "data" / "notice_source_links.csv"


def load_table(path=TABLE) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        url = (row.get("source_url") or "").strip()
        if not row.get("program_id") or not (row.get("title") or "").strip():
            raise CommandError(f"보정표에 공고 ID·제목이 빈 행이 있습니다: {row}")
        if not url.startswith("https://"):
            raise CommandError(f"{row['program_id']}: 원문 URL이 https:// 로 시작하지 않습니다")
    return rows


class Command(BaseCommand):
    help = "공고 원문 링크·제목 보정표(notice_source_links.csv)를 DB 공고에 반영한다"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="바뀔 건수만 보여 주고 저장하지 않는다")

    def handle(self, *args, dry_run: bool, **opts):
        rows = load_table()
        notices = {n.program_id: n for n in Notice.objects.filter(program_id__in=[r["program_id"] for r in rows])}
        missing = [r["program_id"] for r in rows if r["program_id"] not in notices]
        titles = urls = 0
        with transaction.atomic():
            for row in rows:
                n = notices.get(row["program_id"])
                if n is None:
                    continue
                title = row["title"].strip()
                url = row["source_url"].strip()
                display = dict(n.display or {})
                changed = False
                if display.get("title") != title or n.title != title:
                    display["title"] = title
                    n.title = title
                    titles += 1
                    changed = True
                if display.get("sourceUrl") != url:
                    display["sourceUrl"] = url
                    urls += 1
                    changed = True
                if changed and not dry_run:
                    n.display = display
                    n.save(update_fields=["title", "display"])
            if dry_run:
                transaction.set_rollback(True)
        prefix = "(미리 보기) " if dry_run else ""
        self.stdout.write(f"{prefix}보정표 {len(rows)}행 · 제목 변경 {titles}건 · 원문 URL 변경 {urls}건 · DB에 없는 ID {len(missing)}건")
        if missing:
            self.stdout.write("DB에 없는 ID: " + ", ".join(missing))
