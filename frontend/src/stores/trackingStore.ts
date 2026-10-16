/*
 * 서류함 기록.
 *
 * 파일 저장소가 연결되지 않은 현재는 빈 목록이며, 가상의 서류를 만들지 않는다.
 * 관심·준비·신청 관리 기록은 stores/applicationStore.ts가 맡는다.
 */
import { reactive, readonly } from 'vue'
import type { DocumentRecord } from '@/types/tracking'

const state = reactive<{ documents: DocumentRecord[] }>({ documents: [] })

/** 파일 저장소 연결 여부. 연결되기 전에는 업로드·보유 현황을 표시하지 않는다. */
export const DOCUMENT_STORAGE_CONNECTED = false

export function useTrackingStore() {
  return { state: readonly(state) }
}
