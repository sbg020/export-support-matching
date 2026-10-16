# 배포 안내

현재 배포 대상은 **프론트엔드(정적 SPA) + 로그인용 Vercel 서버 함수(`frontend/api/`)**입니다. 공고 데이터가 연결되지 않은 상태이므로 Django 백엔드와 DB 없이 배포해 모든 화면을 확인할 수 있습니다.

- Production: `https://exportsupportmatching.vercel.app/` (Vercel 프로젝트 `exportsupportmatching`, 팀 `sbg020`)
- GitHub: `https://github.com/sbg020/export-support-matching`

## 1. GitHub 저장소 연결

원격 저장소가 연결되어 있습니다(기본 브랜치 `main`). 다른 PC에서 새로 연결할 때는 아래 명령을 씁니다.

```bash
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

- 커밋 전에 `.env`, `.env.local`, `node_modules/`, `dist/`, `.venv/` 등이 올라가지 않는지 `git status`로 확인합니다(`.gitignore`에 포함).
- 실제 비밀키, 사업자등록번호, 회사 데이터는 커밋하지 않습니다. 환경변수 이름은 `.env.example`에만 적습니다.

## 2. Vercel 배포 (프론트엔드)

1. Vercel에서 **Add New → Project**를 누르고 GitHub 저장소를 가져옵니다.
2. 설정을 다음과 같이 지정합니다.

   | 항목 | 값 |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Node.js Version | 22.x 이상 |

3. 환경변수 (Project → Settings → Environment Variables, **Production·Preview 모두**):

   | 이름 | 값 | 비고 |
   |---|---|---|
   | `DEMO_LOGIN_ID` | 데모 아이디 | 대소문자 구분 |
   | `DEMO_LOGIN_PASSWORD` | 데모 비밀번호 | 문서·커밋에 적지 않음 |
   | `AUTH_SESSION_SECRET` | `openssl rand -base64 32` 결과 | Production과 Preview에 **서로 다른 값** |
   | `VITE_API_BASE_URL` | (공고 API가 생기면) | 지금은 넣지 않음 |

   서버 전용 값에는 `VITE_` 접두사를 붙이지 않습니다. 환경변수는 추가·변경한 뒤 **다시 배포해야** 적용됩니다. CLI로 넣을 때는 `frontend` 폴더에서 `npx vercel env add <이름> production` / `preview`를 실행합니다.
4. **Deploy**를 누르면 배포 URL이 생깁니다. Vercel 프로젝트를 GitHub 저장소와 연결(Git Integration)하면 이후 `main` 푸시는 운영 배포, 다른 브랜치·PR은 미리보기 URL이 자동으로 생깁니다. 현재 프로젝트는 Git 자동 배포가 연결되어 있지 않아 아래 CLI 방식으로 배포합니다.

하위 경로를 직접 열거나 새로고침해도 앱이 열리도록 `frontend/vercel.json`에 다음 rewrite가 들어 있습니다. `/api/`는 서버 함수가 처리하도록 제외합니다. Vercel은 실제 파일(`/assets/*` 등)을 먼저 제공하고, 없는 경로만 `index.html`로 보냅니다.

```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

CLI로 배포할 때는 프로젝트의 Root Directory가 `frontend`이므로 **저장소 루트**에서 실행합니다. 루트의 `.vercelignore`가 비밀값·로컬 파일(`.env.local`, 원본 `revision_01.md`)과 `backend/`·`node_modules/` 등을 업로드에서 뺍니다.

```bash
npx vercel link --project export_support_matching   # 처음 한 번 (루트에 .vercel/ 생성, Git 제외)
npx vercel deploy           # 미리보기 (배포 보호가 켜져 있으면 Vercel 로그인 필요)
npx vercel deploy --prod    # 운영 (exportsupportmatching.vercel.app)
```

미리보기 배포는 Vercel 배포 보호(Vercel Authentication)로 막혀 있으므로, 브라우저 대신 `npx vercel curl <경로> --deployment <미리보기 URL>`로 확인할 수 있습니다.

## 3. 배포 후 확인할 것

아래 주소를 **새 탭에서 직접 열고, 새로고침**해 404 없이 열리는지 확인합니다.

- `/` — 한 줄 소개 → 이용 방법 3단계 → `추천받기`, 사이드바 주 메뉴 3개
- `/login` — 데모 계정 로그인, 틀린 비밀번호·소문자 아이디 실패, 회원가입 탭은 비활성과 이유 표시
- `/diagnose/input`, `/programs/recommended`, `/programs`(하단 `#compare`), `/programs/calendar`, `/programs/아무-ID`, `/roadmap`
- 로그인 후 `/mypage/profile`, `/mypage/programs?tab=applied`, `/mypage/documents` (로그아웃 상태에서는 로그인 화면으로 이동)
- 기존 주소 `/programs/compare`, `/mypage`, `/mypage/saved`, `/mypage/preparation`, `/mypage/history`, `/mypage/calendar`가 새 위치로 이동하는지
- 세션 쿠키 `esm_session`이 `HttpOnly`, `Secure`, `SameSite=Lax`인지 (브라우저 개발자 도구 → Application → Cookies)
- 모바일(폭 360px)에서 서랍 메뉴, 하위 메뉴 가로 스크롤, 비교 영역, 달력, 탭 사용 가능 여부

## 4. 백엔드·DB 배포 (공고 데이터 연결 시)

프론트엔드 배포에는 필요하지 않습니다. 공고 API를 운영할 때 별도 서버와 PostgreSQL이 필요합니다.

1. PostgreSQL 14 이상을 준비하고 접속 정보를 환경변수로 설정합니다(`POSTGRES_*`).
2. `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`(임의의 긴 값), `DJANGO_ALLOWED_HOSTS`(API 도메인), `DJANGO_CORS_ALLOWED_ORIGINS`(프론트엔드 도메인)를 설정합니다.
3. `pip install -r requirements.txt` → `python manage.py migrate` → WSGI 서버(예: gunicorn)로 `config.wsgi:application`을 실행합니다. 운영용 WSGI 서버와 정적 파일 제공 방식은 배포 환경에 맞게 추가합니다.
4. 관리자 계정이 필요하면 운영자가 `python manage.py createsuperuser`로 직접 만듭니다.
5. 프론트엔드 Vercel 환경변수 `VITE_API_BASE_URL`에 `https://<API 도메인>/api`를 넣고 다시 배포합니다.
