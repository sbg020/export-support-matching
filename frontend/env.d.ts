/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 공고 REST API 주소 (예: Django 백엔드의 /api).
   * 비워 두면 공고 데이터 미연동 상태(빈 목록)로 동작한다.
   */
  readonly VITE_API_BASE_URL?: string
  /**
   * 'test-dataset'이면 정답 세트 초안에서 만든 테스트 데이터셋(frontend/src/data/test-dataset.json)을 쓴다.
   * VITE_API_BASE_URL이 있으면 API가 우선한다. 비워 두면 빈 저장소.
   */
  readonly VITE_DATA_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
