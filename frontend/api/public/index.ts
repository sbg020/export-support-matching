/// <reference types="node" />
/*
 * Vercel 서버 함수: 공개 API (REVISION_05 §9).
 * vercel.json rewrites가 /api/public/v1/notices, /api/public/v1/notices/{id}, /api/public/v1/eligibility/check,
 * /api/public/openapi.json, /api/public/docs 를 이 함수(?route=…)로 보낸다. 키는 PUBLIC_API_KEYS 에서 읽는다.
 */
import { handlePublicApiRequest } from '../../server/public/handlers.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handlePublicApiRequest(request, process.env)
  },
}
