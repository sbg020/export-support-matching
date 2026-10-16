/*
 * Vercel 서버 함수: /api/auth/login · logout · me · signup
 * Vercel 권장 방식대로 관련 경로를 하나의 fetch 핸들러에서 처리하고, 공유 코드는 api/ 밖(server/)에 둔다.
 * 서버 전용 환경변수(DEMO_LOGIN_ID, DEMO_LOGIN_PASSWORD, AUTH_SESSION_SECRET)는 Vercel 프로젝트 설정에서 읽는다.
 */
import { handleAuthRequest } from '../../server/auth/handlers.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleAuthRequest(request, process.env)
  },
}
