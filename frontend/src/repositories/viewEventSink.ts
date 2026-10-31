/*
 * 공고 상세 조회 이벤트 (REVISION_02 §9.3).
 *
 * 서버 저장소가 없으므로 지금은 아무것도 저장하지 않는다. 브라우저 저장소에 기기별 조회를 쌓아
 * '많이 본 공고' 순위처럼 보여 주지 않는다. 서버(ProgramViewEvent)가 생기면 이 인터페이스를 구현한다.
 */
import type { IsoDateTime } from '@/types/common'

export interface ProgramViewEvent {
  programId: string
  occurredAt: IsoDateTime
  /** 서버가 만든 익명 방문자 키 (세션 쿠키를 날짜별 솔트로 HMAC). 브라우저에서는 만들지 않는다 */
  visitorKey: string
}

export interface ViewEventSink {
  /** 조회 집계가 서버에 저장되는지 */
  readonly connected: boolean
  record(programId: string): void
}

export class NoopViewEventSink implements ViewEventSink {
  readonly connected = false
  record(): void {
    // 서버 저장소가 연결되면 이벤트를 보낸다. 지금은 저장하지 않는다.
  }
}

export const viewEventSink: ViewEventSink = new NoopViewEventSink()
