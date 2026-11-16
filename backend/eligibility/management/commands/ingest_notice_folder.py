"""python manage.py ingest_notice_folder [<폴더>]   (REVISION_05 §2.7-3)

공고문 폴더를 배치로 1번 처리한다. 다시 실행해도 중복이 생기지 않는다(파일 이름 기준 upsert, 같은 해시는 중복으로 처리).
- 정답세트 150건과 겹치는 파일(파일 이름·해시)은 정답세트 데이터를 쓰고 다시 추출하지 않는다.
- 나머지: 텍스트화 → 추출 → '검수 대기'로 저장. 텍스트를 뽑지 못한 공고는 '텍스트 추출 불가'.
- 결과 요약을 docs/ml/batch_report.md 에 적는다. 화면에는 건수만 출력한다.
"""
from __future__ import annotations

import re
import statistics
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from eligibility.goldset import REPO_ROOT
from eligibility.models import Condition, IngestRecord, Notice
from ml.extract import SOURCE, extract_metadata, extract_notice
from ml.textify import sha256_of, textify

REPORT = REPO_ROOT / "docs" / "ml" / "batch_report.md"
SKIP_SUFFIXES = {".zip"}
AS_OF = "2026-11-13"


def norm_name(name: str) -> str:
    return re.sub(r"\s+", "", Path(name).stem).lower()


def reception_status(start, end):
    if start and start > AS_OF:
        return "upcoming"
    if end and end < AS_OF:
        return "closed"
    if start or end:
        return "open"
    return None


def display_for(program_id: str, file_name: str, meta: dict, categories: list[str], documents: list[dict]) -> dict:
    """화면용 Program 형식. 확인되지 않은 값은 null (지어내지 않는다)."""
    return {
        "id": program_id, "parentId": program_id, "subProgramName": None,
        "title": meta["title"], "sourceTitle": meta["title"], "sourceFile": file_name, "sourceUrl": meta["source_url"],
        "sourcePublishedAt": None, "verifiedAt": None,
        "applyStart": meta["apply_start"], "applyEnd": meta["apply_end"], "applyPeriodNote": meta["period_note"],
        "applyPeriodSource": None,
        "receptionStatus": reception_status(meta["apply_start"], meta["apply_end"]), "receptionStatusAsOf": AS_OF,
        "announcementDate": None, "agreementDate": None,
        "ministry": meta["organizer"], "agency": None, "agencyType": None,
        "regions": None, "regionDistricts": None, "regionNote": None,
        "supportTypes": None, "supportTypesNote": None, "maxAmountKrw": None, "totalBudgetMaxKrw": None,
        "amountNote": None, "amountSource": None, "selfPayment": None, "settlement": None, "selectionSize": None,
        "targetExportStages": None, "targetStageSource": None,
        "supportCategories": categories, "categorySource": None, "isVoucherMenu": False, "outOfCategoryScope": False,
        "summaryEasy": None, "targetDescription": None, "useExamples": None, "obligations": None, "prepEstimate": None,
        "eligibilityRules": None,
        "requiredDocs": [
            {"id": f"{program_id}-D{i:02d}", "name": d["name"], "originalName": d["evidence"], "requirement": "required",
             "source": {"quote": d["evidence"], "url": None, "locator": f"{d['page']}쪽"}}
            for i, d in enumerate(documents, start=1)
        ] or None,
        "bonusItems": None, "duplicateSupportNotes": None, "groupKey": None, "relatedProgramIds": [],
        "draftNotes": None, "review": {"author": SOURCE, "status": "검수 대기", "source": SOURCE, "reviewer": None},
        "dataState": "draft",
    }


class Command(BaseCommand):
    help = "공고문 폴더를 텍스트화·자동 추출해 '검수 대기'로 적재한다 (정답세트와 겹치는 공고는 건너뜀)"

    def add_arguments(self, parser):
        parser.add_argument("folder", nargs="?", type=Path, default=REPO_ROOT / "수출 지원사업 공고문")

    def handle(self, *args, folder: Path, **opts):
        files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() not in SKIP_SUFFIXES)
        gold_by_name = {}
        for n in Notice.objects.filter(source="answer-set"):
            if n.file_name:
                gold_by_name.setdefault(norm_name(n.file_name), n.parent_id)
        existing = {r.file_name: r for r in IngestRecord.objects.all()}
        next_no = 1 + max([int(r.program_id[1:]) for r in existing.values() if re.fullmatch(r"N\d+", r.program_id or "")] or [0])
        hash_owner: dict[str, str] = {}
        stats = Counter()
        rows = []
        for path in files:
            digest = sha256_of(path)
            gold_parent = gold_by_name.get(norm_name(path.name))
            record = existing.get(path.name)
            if gold_parent:
                hash_owner.setdefault(digest, gold_parent)
                IngestRecord.objects.update_or_create(file_name=path.name, defaults={
                    "file_hash": digest, "status": "answer-set", "reason": "", "pages": [], "program_id": gold_parent})
                stats["answer_set"] += 1
                rows.append((path.name, "정답세트", gold_parent, None, None))
                continue
            if digest in hash_owner:
                IngestRecord.objects.update_or_create(file_name=path.name, defaults={
                    "file_hash": digest, "status": "duplicate", "reason": f"같은 파일: {hash_owner[digest]}",
                    "pages": [], "program_id": hash_owner[digest]})
                stats["duplicate"] += 1
                rows.append((path.name, "중복 파일", hash_owner[digest], None, None))
                continue
            if (record and record.file_hash == digest and record.status in ("ok", "text-failed")
                    and Notice.objects.filter(program_id=record.program_id).exists()):
                # 이미 처리한 같은 파일: 다시 추출하지 않는다 (다시 실행해도 중복 없음)
                hash_owner[digest] = record.program_id
                stats["unchanged"] += 1
                kind = "자동 추출(기존)" if record.status == "ok" else f"텍스트 추출 불가 ({record.reason})"
                stats["extracted" if record.status == "ok" else "failed"] += 1
                stats["conditions"] += Condition.objects.filter(notice__program_id=record.program_id).count()
                rows.append((path.name, kind, record.program_id, None, None))
                continue
            program_id = record.program_id if record and record.program_id.startswith("N") else f"N{next_no:03d}"
            if not (record and record.program_id.startswith("N")):
                next_no += 1
            hash_owner[digest] = program_id
            text = textify(path)
            with transaction.atomic():
                IngestRecord.objects.update_or_create(file_name=path.name, defaults={
                    "file_hash": digest, "status": text["status"], "reason": text["reason"], "pages": text["pages"],
                    "program_id": program_id})
                if text["status"] != "ok":
                    Notice.objects.update_or_create(program_id=program_id, defaults={
                        "parent_id": program_id, "title": Path(path.name).stem, "source": "folder", "source_label": "공고 폴더 적재",
                        "status": Notice.Status.TEXT_FAILED, "auto_extracted": True, "file_name": path.name, "file_hash": digest,
                        "display": {}, "summary": {"reason": text["reason"]}})
                    stats["failed"] += 1
                    rows.append((path.name, f"텍스트 추출 불가 ({text['reason']})", program_id, None, None))
                    continue
                meta = extract_metadata(path.name, text["pages"])
                result = extract_notice(program_id, text["pages"])
                existing_notice = Notice.objects.filter(program_id=program_id).first()
                status = existing_notice.status if existing_notice and existing_notice.status in (
                    Notice.Status.PUBLISHED, Notice.Status.REJECTED, Notice.Status.SUSPENDED) else Notice.Status.PENDING
                notice, _ = Notice.objects.update_or_create(program_id=program_id, defaults={
                    "parent_id": program_id, "title": meta["title"], "source": "folder", "source_label": "공고 폴더 적재",
                    "status": status, "auto_extracted": True, "file_name": path.name, "file_hash": digest,
                    "display": display_for(program_id, path.name, meta, result["categories"], result["documents"]),
                    "categories": result["categories"], "documents": result["documents"], "bonuses": [],
                    "summary": {"channel": meta["channel"]}})
                Condition.objects.filter(notice=notice, source=SOURCE).delete()
                for c in result["conditions"]:
                    Condition.objects.create(notice=notice, **{k: v for k, v in c.items()})
            confidences = [c["confidence"] for c in result["conditions"]]
            stats["extracted"] += 1
            stats["conditions"] += len(result["conditions"])
            rows.append((path.name, "자동 추출", program_id, len(result["conditions"]),
                         round(statistics.mean(confidences), 3) if confidences else None))
        stats["files"] = len(files)
        self._report(stats, rows, folder)
        self.stdout.write(
            f"공고 폴더 적재: 파일 {stats['files']} · 정답세트 중복 {stats['answer_set']} · 같은 파일 중복 {stats['duplicate']} · "
            f"신규 추출 {stats['extracted']} (조건 {stats['conditions']}) · 추출 실패 {stats['failed']}"
        )

    def _report(self, stats: Counter, rows: list, folder: Path) -> None:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        extracted = [r for r in rows if r[1] == "자동 추출"]
        unchanged_note = f" (이번 실행에서 다시 처리하지 않은 기존 파일 {stats['unchanged']}건 포함)" if stats["unchanged"] else ""
        all_conf = [r[4] for r in extracted if r[4] is not None]
        lines = [
            "# 공고 폴더 적재 결과 (ingest_notice_folder)",
            "",
            f"> 대상 폴더 `{folder.name}` · 배치 1회 · 추출 모델 eligibility_v1 · 데이터 기준일 {AS_OF}",
            "",
            "| 항목 | 건수 |",
            "|---|---|",
            f"| 전체 파일 (zip·하위 폴더 제외) | {stats['files']} |",
            f"| 정답세트와 겹침 (정답세트 데이터 사용, 다시 추출 안 함) | {stats['answer_set']} |",
            f"| 같은 내용의 중복 파일 (해시 동일) | {stats['duplicate']} |",
            f"| 신규 자동 추출 (검수 대기){unchanged_note} | {stats['extracted']} |",
            f"| 추출 실패 (텍스트 추출 불가) | {stats['failed']} |",
            f"| 자동 추출 조건 수 | {stats['conditions']} |",
            f"| 공고별 평균 confidence의 평균 | {round(statistics.mean(all_conf), 3) if all_conf else '-'} |",
            "",
            "## 공고별 결과",
            "",
            "| 파일 | 처리 | 공고 ID | 조건 수 | 평균 confidence |",
            "|---|---|---|---|---|",
            *[f"| {name} | {kind} | {pid} | {n if n is not None else '-'} | {conf if conf is not None else '-'} |"
              for name, kind, pid, n, conf in rows],
            "",
        ]
        REPORT.write_text("\n".join(lines), encoding="utf-8")
