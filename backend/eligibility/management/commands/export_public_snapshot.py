"""python manage.py export_public_snapshot

DB의 공고를 사이트용 정적 스냅샷(JSON)으로 내보낸다 (REVISION_05 운영 방식: 서버 DB가 없는 배포 환경).
- frontend/src/data/published/notices.json : 사용자 화면용. **게시(published) 공고만** 넣는다.
- frontend/src/data/published/admin-review.json : 관리자 검수 화면용. 검수 대기·텍스트 추출 불가 공고와 쪽별 원문.
비밀값·사용자 정보는 들어가지 않는다 (공고 원문과 조건만).
"""
from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from eligibility.goldset import REPO_ROOT
from eligibility.models import Condition, ConditionType, IngestRecord, Notice

OUT_DIR = REPO_ROOT / "frontend" / "src" / "data" / "published"
AS_OF = "2026-11-13"
SCHEMA_VERSION = 1


def condition_json(c: Condition) -> dict:
    return {
        "condId": c.cond_id, "programId": c.program_id, "parentId": c.parent_id, "scope": c.scope or None,
        "kind": c.kind, "group": c.group or None, "condType": c.cond_type, "condTypes": c.cond_types or c.cond_type,
        "affectsVerdict": c.affects_verdict == "Y", "field": c.field or None, "op": c.op or None,
        "valueRaw": c.value_raw or None, "expr": c.expr, "exprText": c.expr_text or None, "certainty": c.certainty or None,
        "evidence": c.evidence or None, "page": c.page, "importance": c.importance, "confidence": c.confidence,
        "source": c.source or None, "note": c.note or None,
    }


def notice_json(n: Notice, conds: list[dict]) -> dict:
    display = dict(n.display or {})
    # v2 자격 규칙(예전 정답세트 rules 시트 형식)은 v3 조건(conditions)으로 대체되어 내보내지 않는다
    display["eligibilityRules"] = None
    display.update({
        "id": n.program_id,
        "parentId": n.parent_id,
        "publishSource": n.source,
        "publishSourceLabel": n.source_label,
        "autoExtracted": n.auto_extracted,
        "publishStatus": n.status,
        "conditions": conds,
    })
    return display


class Command(BaseCommand):
    help = "게시 공고를 사이트 스냅샷(JSON)으로, 검수 대기 공고를 관리자 검수 스냅샷으로 내보낸다"

    def handle(self, *args, **opts):
        conditions = list(Condition.objects.all())
        by_program: dict[str, list[dict]] = {}
        for c in conditions:
            by_program.setdefault(c.program_id, []).append(condition_json(c))

        def conds_for(n: Notice) -> list[dict]:
            items = list(by_program.get(n.program_id, []))
            if n.parent_id != n.program_id:
                items += by_program.get(n.parent_id, [])
            return sorted(items, key=lambda x: x["condId"])

        types = [
            {"code": t.code, "group": t.group, "name": t.name, "mode": t.mode, "field": t.field or None,
             "affects": t.affects, "defaultImportance": t.default_importance}
            for t in ConditionType.objects.all()
        ]
        published = [notice_json(n, conds_for(n)) for n in Notice.objects.filter(status=Notice.Status.PUBLISHED)]
        counts = {
            "published": len(published),
            "publishedAnswerSet": sum(1 for p in published if p["publishSource"] == "answer-set"),
            "publishedAutoExtracted": sum(1 for p in published if p["autoExtracted"]),
            "announcements": len({p["parentId"] for p in published}),
            "conditions": sum(len(p["conditions"]) for p in published),
        }
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        snapshot = {
            "meta": {"schemaVersion": SCHEMA_VERSION, "asOf": AS_OF, "dataVersion": f"published-{AS_OF}",
                     "counts": counts, "engine": "eligibility-v3 (reference_eval 규칙)"},
            "conditionTypes": types,
            "notices": published,
        }
        (OUT_DIR / "notices.json").write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

        records = {r.program_id: r for r in IngestRecord.objects.exclude(status__in=["answer-set", "duplicate"])}
        review = []
        for n in Notice.objects.filter(status__in=[Notice.Status.PENDING, Notice.Status.TEXT_FAILED]):
            record = records.get(n.program_id)
            review.append({
                "notice": notice_json(n, conds_for(n)) if n.display else {"id": n.program_id, "title": n.title},
                "status": n.status,
                "fileName": n.file_name,
                "reason": (n.summary or {}).get("reason"),
                "pages": record.pages if record else [],
            })
        review_counts = {
            "pending": sum(1 for r in review if r["status"] == Notice.Status.PENDING),
            "textFailed": sum(1 for r in review if r["status"] == Notice.Status.TEXT_FAILED),
        }
        (OUT_DIR / "admin-review.json").write_text(json.dumps(
            {"meta": {"schemaVersion": SCHEMA_VERSION, "asOf": AS_OF, "counts": review_counts}, "items": review},
            ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        self.stdout.write(f"스냅샷: 게시 {counts['published']} (정답세트 {counts['publishedAnswerSet']}, 자동 추출 {counts['publishedAutoExtracted']}) · "
                          f"조건 {counts['conditions']} · 검수 대기 {review_counts['pending']} · 텍스트 추출 불가 {review_counts['textFailed']}")
