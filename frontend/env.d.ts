/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 공고 REST API 주소 (예: Django 백엔드의 /api).
   * 비워 두면 공고 데이터 미연동 상태(빈 목록)로 동작한다.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
