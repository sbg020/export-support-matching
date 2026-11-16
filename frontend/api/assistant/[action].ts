/// <reference types="node" />
/*
 * Vercel 서버 함수: /api/assistant/status · chat (REVISION_05 §8 공고 도우미)
 * 서버 전용 환경변수 ANTHROPIC_API_KEY · ASSISTANT_MODEL · ASSISTANT_DAILY_LIMIT 와 로그인 세션 변수를 읽는다.
 */
import { handleAssistantRequest } from '../../server/assistant/handlers.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleAssistantRequest(request, process.env)
  },
}
