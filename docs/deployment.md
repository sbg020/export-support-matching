# 배포 안내

현재 배포 대상은 **프론트엔드(정적 SPA) + 로그인용 Vercel 서버 함수(`frontend/api/`)**입니다. REVISION_04에서 테스트 데이터셋을 지웠으므로 공고 데이터는 없고(빈 상태), Django 백엔드와 DB 없이 배포해 모든 화면과 관리자 영역(`/admin`)을 확인할 수 있습니다. 검수 완료된 최종 데이터는 공고 저장소를 연결한 뒤 관리자 화면에서 반영합니다.

- Production: `https://exportsupportmatching.vercel.app/` (Vercel 프로젝트 `exportsupportmatching`, 팀 `sbg020`)
- GitHub: `https://github.com/sbg020/export-support-matching`
- 최근 운영 배포: 2026-11-01, `revision-03-test-account` 브랜치 (테스트 데이터셋 `test-2026-10-15`, 테스트 계정 추가)

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
   | `OPS_LOGIN_ID` | 운영자 계정 아이디 | REVISION_05 §7.1. 이 계정만 역할 `admin`(관리자 영역 `/admin`). **없으면 관리자 화면에 들어갈 계정이 없다** |
   | `OPS_LOGIN_PASSWORD` | 운영자 계정 비밀번호 | 문서·커밋에 적지 않음 |
   | `DEMO_LOGIN_ID` | `ADMIN` | 대소문자 구분. REVISION_05부터 일반 사용자(`member`) |
   | `DEMO_LOGIN_PASSWORD` | ADMIN 계정 비밀번호 | 문서·커밋에 적지 않음 |
   | `TEST_LOGIN_ID` | `TEST` | 테스트 계정 (대소문자 구분) |
   | `TEST_LOGIN_PASSWORD` | 테스트 계정 비밀번호 | 문서·커밋에 적지 않음. 둘 중 하나라도 없으면 테스트 계정만 로그인 불가 |
   | `EFUTURE_LOGIN_ID` | `USER` | 시연용 기업 계정 '이퓨쳐' (역할 `test`, 대소문자 구분) |
   | `EFUTURE_LOGIN_PASSWORD` | 이퓨쳐 계정 비밀번호 | 문서·커밋에 적지 않음. 둘 중 하나라도 없으면 이 계정만 로그인 불가 |
   | `AUTH_SESSION_SECRET` | `openssl rand -base64 32` 결과 | Production과 Preview에 **서로 다른 값** |
   | `ANTHROPIC_API_KEY` | Claude API 키 | 챗봇(공고 도우미). 없으면 버튼이 `준비 중` |
   | `ASSISTANT_MODEL` | (선택) 기본 `claude-sonnet-5-5` | |
   | `ASSISTANT_DAILY_LIMIT` | (선택) 기본 `20` | 사용자별 하루 질문 수 (서버 메모리 기준 근사 제한) |
   | `PUBLIC_API_KEYS` | 공개 API 키, 쉼표로 여러 개 (각 16자 이상) | 예: `openssl rand -hex 24`. 없으면 공개 API는 모두 `401` |
   | `PUBLIC_API_RATE_PER_MINUTE` | (선택) 기본 `60` | 키별 분당 호출 수 |
   | `BIZINFO_API_KEY` | 기업마당 API 키 | 수집 기능은 서버 저장소 연결 후 |
   | `VITE_API_BASE_URL` | (공고 API가 생기면) | 지금은 넣지 않음. 비우면 게시 스냅샷(`src/data/published/notices.json`)을 씀 |

   `VITE_DATA_SOURCE`는 REVISION_04에서 지웠습니다(Production·Preview 모두). 앱은 이 값을 더 읽지 않습니다.

   서버 전용 값에는 `VITE_` 접두사를 붙이지 않습니다. `VITE_` 값은 빌드 시점에 번들에 들어가므로, 환경변수는 추가·변경한 뒤 **다시 배포해야** 적용됩니다. CLI로 넣을 때는 연결(`.vercel/`)이 있는 **저장소 루트**에서 `npx vercel env add <이름> production` / `preview`를 실행합니다(지울 때는 `npx vercel env rm <이름> production`).
4. **Deploy**를 누르면 배포 URL이 생깁니다. Vercel 프로젝트를 GitHub 저장소와 연결(Git Integration)하면 이후 `main` 푸시는 운영 배포, 다른 브랜치·PR은 미리보기 URL이 자동으로 생깁니다. 현재 프로젝트는 Git 자동 배포가 연결되어 있지 않아 아래 CLI 방식으로 배포합니다.

하위 경로를 직접 열거나 새로고침해도 앱이 열리도록 `frontend/vercel.json`에 다음 rewrite가 들어 있습니다. `/api/`는 서버 함수가 처리하도록 제외합니다. Vercel은 실제 파일(`/assets/*` 등)을 먼저 제공하고, 없는 경로만 `index.html`로 보냅니다.

```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

공개 API 주소(`/api/public/v1/notices`, `/api/public/v1/notices/{id}`, `/api/public/v1/eligibility/check`, `/api/public/openapi.json`, `/api/public/docs`)는 같은 파일의 rewrite가 서버 함수 `api/public/index.ts`(`?route=…`)로 보냅니다. 챗봇·공개 API 함수는 `functions.includeFiles`로 게시 스냅샷 JSON을 함께 싣습니다.

**게시 공고 데이터를 바꿀 때** (로컬, `backend/`): `DJANGO_DB=sqlite`로 `import_eligibility_goldset` → `ingest_notice_folder` → (필요하면 `publish_auto_extracted`) → `export_public_snapshot`을 실행하면 `frontend/src/data/published/*.json`이 다시 만들어집니다. 커밋하고 다시 배포하면 사이트에 반영됩니다. 데이터 파이프라인 패키지는 `backend/requirements-data.txt`에 있습니다.

CLI로 배포할 때는 프로젝트의 Root Directory가 `frontend`이므로 **저장소 루트**에서 실행합니다. 루트의 `.vercelignore`가 비밀값·로컬 파일(`.env.local`, 원본 개정 문서)과 `backend/`·`node_modules/`, 루트의 정답세트 xlsx·발표 PDF·`별첨자료2_구현결과/` 등을 업로드에서 뺍니다.

```bash
npx vercel link --project export_support_matching   # 처음 한 번 (루트에 .vercel/ 생성, Git 제외)
npx vercel deploy           # 미리보기 (배포 보호가 켜져 있으면 Vercel 로그인 필요)
npx vercel deploy --prod    # 운영 (exportsupportmatching.vercel.app)
```

미리보기 배포는 Vercel 배포 보호(Vercel Authentication)로 막혀 있으므로, 브라우저 대신 `npx vercel curl <경로> --deployment <미리보기 URL>`로 확인할 수 있습니다.

## 3. 배포 후 확인할 것

아래 주소를 **새 탭에서 직접 열고, 새로고침**해 404 없이 열리는지 확인합니다.

- `/` — 메인 랜딩페이지(블랙 Hero → 문제 → 핵심 서비스 → 이용 과정 → 추천 결과 미리보기 → 공고 기관 띠 → 블랙 CTA). 히어로 위 헤더가 투명·흰 글자이고 스크롤하면 흰 배경으로 바뀌는지, CTA가 `/programs/recommended`·`/programs`로 가는지, 예시 UI에 `예시 화면` 표시가 있는지. 주 메뉴 5개(서비스 소개 · 기업 맞춤 지원사업 · 전체 지원사업 · 지원사업 관리 · 커뮤니티)와 `로그인`·`회원가입`
- `/login` — 테스트 계정 `TEST` 로그인 후 `/profile`에 `테스트 계정(TEST)의 기업 프로필입니다` 안내와 `EC 테스트식품(주)`, 로그인 후 `/programs/recommended`, 소문자 `test` 실패. 로그아웃하면 기기 공용 프로필로 돌아오는지
- (REVISION_05) `/programs/recommended` — TEST 로그인 후 `신청 가능 4 · 확인 필요 4 · 신청 불가 106`(마감 숨김), `마감 공고 포함`이면 `12 · 6 · 141`(합 159). 신청 가능 카드에만 적합도. 오른쪽 아래 `공고 도우미`(키 없으면 `준비 중`). `/developers`, `/api/public/docs`가 열리고 `/api/public/v1/notices`를 키 없이 부르면 `401`
- `/login` — 운영자 계정(`OPS_LOGIN_ID`) 로그인 후 `/admin`(관리자 홈)이 첫 화면인지 (`ADMIN`·`TEST`는 관리자 화면에 못 들어감), 관리자 메뉴 6개 화면, `사용자 화면 보기`, 프로필 팝업(`관리자 홈`·`로그아웃`), 로그아웃 후 홈. 틀린 비밀번호·소문자 아이디 실패, 회원가입 탭은 비활성과 이유 표시
- `TEST`로 로그인한 상태에서 `/admin`을 열면 `/programs/recommended`와 안내 `관리자 계정만 볼 수 있는 화면입니다.`. 비로그인 `/admin/review` → 로그인 화면 → `ADMIN`으로 로그인하면 `/admin/review`로 돌아오는지
- `/programs`, `/programs/recommended`, `/programs/calendar` — 테스트 데이터 안내 카드·`초안 기준`이 없고, 공고 없음 빈 상태, 건수 `-`. 맞춤 추천은 `신청 가능 · 확인 필요 · 신청 불가` 탭(건수 `-`)이고 검색창·필터·정렬이 없는지
- `/programs/P001` — `해당 공고를 찾을 수 없습니다.` / `/diagnose/result`·`/roadmap` → `/programs/recommended`, 상단 `기업 맞춤 지원사업`의 하위 메뉴가 맞춤 추천 하나인지
- `/admin/kotra` — 양식 내려받기, CSV 미리보기·오류 표시. `/admin/notices#bulk` — 정답세트 xlsx 검사 결과
- `/profile`(기업 프로필, 로그인 불필요), `/programs`(하단 `#compare`), `/programs/아무-ID`
- 로그인 후 `/manage/programs?tab=applied`, `/manage/documents` (로그아웃 상태에서는 로그인 화면으로 이동하고, 로그인하면 그 화면으로 돌아옴)
- 커뮤니티: `/community` → `/community/reviews`, 두 게시판의 빈 상태, 비로그인 `글쓰기` → 로그인 후 같은 게시판으로 복귀, `/community/free/1`은 `페이지를 찾을 수 없음`
- 기존 주소 `/programs/compare`, `/diagnose/input?step=2`, `/mypage`, `/mypage/profile`, `/mypage/programs`, `/mypage/documents`, `/mypage/saved`, `/mypage/preparation`, `/mypage/history`, `/mypage/calendar`가 새 위치(`/profile`, `/manage/*`, `/programs/calendar`)로 이동하는지
- 세션 쿠키 `esm_session`이 `HttpOnly`, `Secure`, `SameSite=Lax`인지 (브라우저 개발자 도구 → Application → Cookies)
- 배포 JS에서 비밀번호·세션 키가 검색되지 않고, 서버 전용 변수에 `VITE_` 접두사가 없는지
- 모바일(폭 360px)에서 한 줄 헤더와 서랍 메뉴(사용자 5개 / 관리자 6개 + 사용자 화면 보기), 관리자 표 가로 스크롤, 하위 메뉴 가로 스크롤, 비교 영역·하단 비교 바, 달력, 탭, 세부 분야 필터, 조건 목록 사용 가능 여부

## 4. 백엔드·DB 배포 (공고 데이터 연결 시)

프론트엔드 배포에는 필요하지 않습니다. 공고 API를 운영할 때 별도 서버와 PostgreSQL이 필요합니다.

1. PostgreSQL 14 이상을 준비하고 접속 정보를 환경변수로 설정합니다(`POSTGRES_*`).
2. `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`(임의의 긴 값), `DJANGO_ALLOWED_HOSTS`(API 도메인), `DJANGO_CORS_ALLOWED_ORIGINS`(프론트엔드 도메인)를 설정합니다.
3. `pip install -r requirements.txt` → `python manage.py migrate` → WSGI 서버(예: gunicorn)로 `config.wsgi:application`을 실행합니다. 운영용 WSGI 서버와 정적 파일 제공 방식은 배포 환경에 맞게 추가합니다.
4. 관리자 계정이 필요하면 운영자가 `python manage.py createsuperuser`로 직접 만듭니다.
5. 프론트엔드 Vercel 환경변수 `VITE_API_BASE_URL`에 `https://<API 도메인>/api`를 넣고 다시 배포합니다.
