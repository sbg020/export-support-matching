/*
 * 관심·준비·지원 이력·서류 기록.
 *
 * 모든 기록은 실제 공고와 연결될 때만 생긴다. 공고 데이터와 계정·파일 저장소가
 * 연결되지 않은 현재는 빈 목록이며, 가상의 기록을 만들지 않는다.
 */
import { reactive, readonly } from 'vue'
import type {
  CalendarEvent,
  DocumentRecord,
  HistoryRecord,
  PreparationItem,
  SavedProgram,
} from '@/types/tracking'

interface TrackingState {
  saved: SavedProgram[]
  preparation: PreparationItem[]
  history: HistoryRecord[]
  documents: DocumentRecord[]
}

const state = reactive<TrackingState>({
  saved: [],
  preparation: [],
  history: [],
  documents: [],
})

/** 파일 저장소 연결 여부. 연결되기 전에는 업로드·보유 현황을 표시하지 않는다. */
export const DOCUMENT_STORAGE_CONNECTED = false

/** 공고·준비 기록에서 일정 만들기. 공고 날짜가 없으면 일정도 없다. */
function buildCalendarEvents(): CalendarEvent[] {
  return []
}

export function useTrackingStore() {
  return {
    state: readonly(state),
    calendarEvents: buildCalendarEvents,
  }
}
