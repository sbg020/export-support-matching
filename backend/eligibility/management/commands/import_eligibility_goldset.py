"""python manage.py import_eligibility_goldset --xlsx <신청자격 엑셀> [--classification <지원분류 엑셀>]

완성된 정답세트를 DB에 적재한다 (REVISION_05 §2.2). 여러 번 실행해도 중복이 생기지 않는다(upsert).
- 정답세트 공고 150건(세부사업 포함)의 상태는 게시(검수 완료), 출처는 정답세트(2026-11).
- 같은 내용을 backend/data/eligibility_goldset/ 에 CSV·JSON으로 다시 내보낸다 (학습·테스트 재현용).
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from eligibility.engine import default_importance
from eligibility.goldset import REPO_ROOT, convert_classification_workbook, read_eligibility_workbook, sha256_of
from eligibility.models import Condition, ConditionType, Notice
from eligibility.site_date import SITE_TODAY

OUT_DIR = Path(__file__).resolve().parents[3] / "data" / "eligibility_goldset"
SOURCE_LABEL = "정답세트(2026-11)"
CONDITION_COLUMNS = [
    "cond_id", "parent_id", "program_id", "scope", "kind", "group", "cond_type", "cond_type_name", "cond_types",
    "check_mode", "affects_verdict", "field", "op", "value_raw", "value_norm", "unit", "basis", "expr", "expr_text",
    "certainty", "evidence", "page", "source", "note", "split", "importance",
]


def latest_default(pattern: str) -> Path | None:
    files = sorted(REPO_ROOT.glob(pattern), key=lambda p: p.stat().st_mtime)
    return files[-1] if files else None


class Command(BaseCommand):
    help = "완성된 신청 자격 정답세트(엑셀)를 DB와 backend/data/eligibility_goldset/에 적재한다"

    def add_arguments(self, parser):
        parser.add_argument("--xlsx", type=Path, default=None, help="신청자격 정답세트 엑셀 (기본: 프로젝트 루트의 가장 최근 EC_신청자격_정답세트_150건*.xlsx)")
        parser.add_argument("--classification", type=Path, default=None, help="지원분류 정답세트 엑셀 (기본: 가장 최근 EC_지원분류_정답세트_150건*.xlsx)")
        parser.add_argument("--source-urls", type=Path, default=REPO_ROOT / "수출 지원사업 공고문" / "정답세트" / "source_urls.csv")
        parser.add_argument("--as-of", default=SITE_TODAY, help="데이터 기준일 (사이트 기준 날짜 고정값, 시스템 날짜를 쓰지 않는다)")

    def handle(self, *args, **opts):
        xlsx = opts["xlsx"] or latest_default("EC_신청자격_정답세트_150건*.xlsx")
        cls_xlsx = opts["classification"] or latest_default("EC_지원분류_정답세트_150건*.xlsx")
        if not xlsx or not xlsx.exists():
            raise CommandError("신청자격 정답세트 엑셀을 찾을 수 없습니다.")
        if not cls_xlsx or not cls_xlsx.exists():
            raise CommandError("지원분류 정답세트 엑셀을 찾을 수 없습니다.")
        elig = read_eligibility_workbook(xlsx)
        converted = convert_classification_workbook(cls_xlsx, opts["source_urls"], opts["as_of"])
        programs = {p["id"]: p for p in converted["dataset"]["programs"]}
        summaries = {str(s["program_id"]).strip(): s for s in elig["summaries"] if s.get("program_id")}

        with transaction.atomic():
            for t in elig["types"]:
                code = str(t.get("code") or "").strip()
                if not code:
                    continue
                ConditionType.objects.update_or_create(code=code, defaults={
                    "group": t.get("group") or "", "name": t.get("name") or "", "mode": t.get("mode") or "",
                    "field": t.get("field") or "", "description": t.get("desc") or "", "affects": t.get("affects") or "",
                    "default_importance": default_importance(code),
                })
            now = timezone.now()
            seen_notices = set()
            for program_id, program in programs.items():
                summary = summaries.get(program_id, {})
                Notice.objects.update_or_create(program_id=program_id, defaults={
                    "parent_id": program["parentId"],
                    "title": program.get("title") or "",
                    "sub_program": program.get("subProgramName") or "",
                    "source": "answer-set",
                    "source_label": SOURCE_LABEL,
                    "split": str(summary.get("split") or ""),
                    "status": Notice.Status.PUBLISHED,
                    "auto_extracted": False,
                    "file_name": program.get("sourceFile") if isinstance(program.get("sourceFile"), str) else "",
                    "display": program,
                    "categories": program.get("supportCategories") or [],
                    "documents": program.get("requiredDocs") or [],
                    "bonuses": program.get("bonusItems") or [],
                    "summary": {k: (str(v) if v is not None else None) for k, v in summary.items()},
                    "reviewer": str(summary.get("reviewer") or ""),
                    "reviewed_at": now,
                    "published_at": now,
                })
                seen_notices.add(program_id)
            notice_by_id = {n.program_id: n for n in Notice.objects.filter(program_id__in=seen_notices)}
            missing = 0
            for c in elig["conditions"]:
                notice = notice_by_id.get(c["program_id"]) or notice_by_id.get(c["parent_id"])
                if notice is None:
                    missing += 1
                Condition.objects.update_or_create(cond_id=c["cond_id"], defaults={
                    "notice": notice,
                    **{k: c[k] for k in ["program_id", "parent_id", "scope", "kind", "group", "cond_type", "cond_types",
                                         "check_mode", "affects_verdict", "field", "op", "value_raw", "value_norm", "unit",
                                         "basis", "expr", "expr_text", "certainty", "evidence", "page", "source", "note",
                                         "review_status", "reviewer"]},
                    "importance": default_importance(c["cond_type"]),
                    "confidence": None,
                })

        # 삭제(중복)된 공고는 내보내지 않는다
        elig["summaries"] = [s for s in elig["summaries"] if str(s.get("program_id") or "").strip() in programs]
        elig["conditions"] = [c for c in elig["conditions"] if c["program_id"] in programs or c["parent_id"] in programs
                              or any(p["parentId"] == c["program_id"] for p in programs.values())]
        self._export(elig, xlsx, cls_xlsx, converted)
        self.stdout.write(
            f"정답세트 적재: 공고(세부사업) {len(programs)} · 원공고 {len({p['parentId'] for p in programs.values()})} · "
            f"조건 {len(elig['conditions'])} · 조건 유형 {len(elig['types'])} · 프로필 {len(elig['profiles'])} · "
            f"원공고 공통 조건(세부사업 모두에 적용) {missing} · 변환 경고 {len(converted['warnings'])}"
        )

    def _export(self, elig: dict, xlsx: Path, cls_xlsx: Path, converted: dict) -> None:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        with (OUT_DIR / "conditions.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=CONDITION_COLUMNS, extrasaction="ignore")
            writer.writeheader()
            for c in elig["conditions"]:
                row = {**c, "expr": json.dumps(c["expr"], ensure_ascii=False), "importance": default_importance(c["cond_type"])}
                row["page"] = "" if c["page"] is None else c["page"]
                writer.writerow(row)
        summary_cols = ["program_id", "parent_id", "title", "sub_program", "region_scope", "split"]
        with (OUT_DIR / "programs_summary.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=summary_cols, extrasaction="ignore")
            writer.writeheader()
            for s in elig["summaries"]:
                writer.writerow({k: ("" if s.get(k) is None else s.get(k)) for k in summary_cols})
        (OUT_DIR / "profiles.json").write_text(json.dumps(elig["profiles"], ensure_ascii=False, indent=1), encoding="utf-8")
        with (OUT_DIR / "taxonomy.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["code", "group", "name", "mode", "field", "affects", "default_importance"])
            for t in elig["types"]:
                if t.get("code"):
                    writer.writerow([t["code"], t.get("group"), t.get("name"), t.get("mode"), t.get("field"), t.get("affects"), default_importance(t["code"])])
        with (OUT_DIR / "sentences.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["sent_id", "parent_id", "page", "text", "label", "cond_types", "split"])
            writer.writeheader()
            writer.writerows(elig["sentences"])
        meta = {
            "eligibility_xlsx": {"file": xlsx.name, "sha256": sha256_of(xlsx)},
            "classification_xlsx": {"file": cls_xlsx.name, "sha256": sha256_of(cls_xlsx)},
            "counts": {"conditions": len(elig["conditions"]), "profiles": len(elig["profiles"]), "sentences": len(elig["sentences"])},
        }
        (OUT_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
