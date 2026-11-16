"""사이트 기준 날짜 (고정).

사이트가 '오늘'로 쓰는 날짜를 실제 시계 대신 2026-10-20(화)로 고정한다.
게시 스냅샷의 데이터 기준일과 접수 상태(접수 예정·접수중·마감)는 이 날짜로 계산한다.
프론트엔드 frontend/src/lib/siteClock.ts 의 SITE_TODAY 와 같은 값이어야 한다.
"""
from __future__ import annotations

SITE_TODAY = "2026-10-20"


def reception_status(start: str | None, end: str | None, as_of: str = SITE_TODAY) -> str | None:
    """build_test_dataset.reception_status 와 같은 규칙"""
    start = (start or "")[:10] or None
    end = (end or "")[:10] or None
    if start and start > as_of:
        return "upcoming"
    if end and end < as_of:
        return "closed"
    if start or end:
        return "open"
    return None
