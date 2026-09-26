# 배포 안내

현재 배포 대상은 **프론트엔드(정적 SPA)**입니다. 공고 데이터가 연결되지 않은 상태이므로 백엔드와 DB 없이 배포해 모든 화면을 확인할 수 있습니다.

## 1. GitHub 저장소 연결

로컬 Git 저장소는 이미 만들어져 있습니다(기본 브랜치 `main`). GitHub에서 빈 저장소를 만든 뒤 아래 명령으로 연결합니다.

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

3. 환경변수: 공고 API가 없으면 **아무것도 넣지 않습니다.** API를 연결할 때만 `VITE_API_BASE_URL`을 추가합니다.
4. **Deploy**를 누르면 배포 URL이 생깁니다. 이후 `main`에 푸시하면 운영 배포, 다른 브랜치·PR은 미리보기 URL이 자동으로 생깁니다.

하위 경로를 직접 열거나 새로고침해도 앱이 열리도록 `frontend/vercel.json`에 다음 rewrite가 들어 있습니다. Vercel은 실제 파일(`/assets/*` 등)을 먼저 제공하고, 없는 경로만 `index.html`로 보냅니다.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

CLI로 배포하려면 `frontend` 폴더에서 `npx vercel`(미리보기) 또는 `npx vercel --prod`(운영)를 실행합니다. 처음 실행하면 Vercel 로그인이 필요합니다.

## 3. 배포 후 확인할 것

아래 주소를 **새 탭에서 직접 열고, 새로고침**해 404 없이 열리는지 확인합니다.

- `/` — 접수 공고 수·추천 공고 수가 `-`인지
- `/diagnose/input` — 6단계 폼 이동·검증
- `/programs`, `/programs/recommended` — "현재 등록된 지원사업 공고가 없습니다." 빈 상태, 정렬·비교 비활성 이유
- `/programs/compare` — 열 제목부터 값까지 `-`
- `/programs/아무-ID` — "해당 공고를 찾을 수 없습니다."와 상세 틀
- `/mypage`, `/mypage/calendar`, `/mypage/documents` — 빈 상태, 가상 일정·서류 없음
- 모바일(폭 360px)에서 메뉴 서랍·필터 시트·비교 표·캘린더 사용 가능 여부

## 4. 백엔드·DB 배포 (공고 데이터 연결 시)

프론트엔드 배포에는 필요하지 않습니다. 공고 API를 운영할 때 별도 서버와 PostgreSQL이 필요합니다.

1. PostgreSQL 14 이상을 준비하고 접속 정보를 환경변수로 설정합니다(`POSTGRES_*`).
2. `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`(임의의 긴 값), `DJANGO_ALLOWED_HOSTS`(API 도메인), `DJANGO_CORS_ALLOWED_ORIGINS`(프론트엔드 도메인)를 설정합니다.
3. `pip install -r requirements.txt` → `python manage.py migrate` → WSGI 서버(예: gunicorn)로 `config.wsgi:application`을 실행합니다. 운영용 WSGI 서버와 정적 파일 제공 방식은 배포 환경에 맞게 추가합니다.
4. 관리자 계정이 필요하면 운영자가 `python manage.py createsuperuser`로 직접 만듭니다.
5. 프론트엔드 Vercel 환경변수 `VITE_API_BASE_URL`에 `https://<API 도메인>/api`를 넣고 다시 배포합니다.
