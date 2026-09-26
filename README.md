# 수출지원사업 매칭 시스템

중소·중견기업이 기업정보(업종, 매출액, 수출실적, 주력 제품 등)를 입력하면 자사에 맞는 정부·공공기관 수출지원사업을 찾고, **신청 자격과 적합도를 나누어** 확인하며, 여러 사업의 준비 부담(기회비용)을 비교하고 신청 준비·일정·이력을 관리하는 웹 서비스입니다.

## 현재 상태

- **화면(UI/UX)과 화면 이동은 모두 구현되어 있습니다.** Vue 3 SPA로 15개 경로가 동작합니다.
- **지원사업 공고는 아직 수집·검증되지 않았습니다.** 그래서 공고·자격 판정·적합도·금액·일정 등 데이터 값은 모두 `-`와 빈 상태 안내로 표시됩니다. 샘플 공고나 가상의 기업 데이터는 넣지 않았습니다.
- 백엔드(`backend/`)는 Django REST Framework 골격과 공고 모델·마이그레이션·읽기 API까지 준비되어 있습니다. **DB(PostgreSQL)는 연결·가동하지 않았습니다.**

## 저장소 구조

```
.
├── frontend/            Vue 3 + Vite + TypeScript + Vue Router SPA (Bootstrap 5, Tabler 아이콘)
│   ├── src/
│   │   ├── views/           페이지 (메인, 기업정보 입력·진단, 공고 목록·추천·상세·비교, 로드맵, 마이페이지)
│   │   ├── components/      공통 UI(카드·배지·정보 행·빈 상태·탭·모달 등), 단계 폼, 필터, 캘린더, 비교 표
│   │   ├── repositories/    공고 데이터 읽기 경계 (기본: 빈 저장소, 선택: REST API)
│   │   ├── lib/engine/      판정 엔진 인터페이스 (자격·적합도·기회비용·수출단계)
│   │   ├── lib/             결측값 표시, 프로필 검증·저장 직렬화 등
│   │   ├── stores/          기업 프로필(이 기기 저장), 관리 기록, 알림
│   │   ├── types/           Program·CompanyProfile·판정 결과 타입
│   │   └── __tests__/       단위 테스트 (Vitest)
│   └── vercel.json          Vercel 배포 설정 (하위 경로 rewrite 포함)
├── backend/             Django 5.2 + DRF API 골격
│   ├── config/              설정 (환경변수 기반, PostgreSQL)
│   ├── programs/            공고·자격 규칙·필요서류 모델, 직렬화, 읽기 전용 API
│   ├── matching/            판정 엔진 (프론트엔드와 같은 계약)
│   └── core/                상태 확인 API
├── docs/                설계·배포 안내
├── .env.example         환경변수 이름 목록
└── CLAUDE.md            구현 지침
```

## 요구사항

| 구성 | 버전 |
|---|---|
| Node.js | 22.18 이상 또는 24.12 이상 (`frontend/package.json`의 `engines`) |
| npm | Node.js에 포함된 버전 (잠금 파일 `package-lock.json` 사용) |
| Python | 3.12 (검증한 버전) |
| PostgreSQL | 14 이상 (백엔드를 실제로 실행할 때만 필요) |

## 프론트엔드 실행

백엔드나 DB 없이도 빈 데이터 상태로 모든 화면을 확인할 수 있습니다.

```bash
cd frontend
npm ci                # 또는 npm install
npm run dev           # 개발 서버: http://localhost:5173
```

| 명령 | 내용 |
|---|---|
| `npm run build` | 타입 검사 후 `frontend/dist/`에 정적 파일 생성 |
| `npm run preview` | 빌드 결과 미리보기 (하위 경로 새로고침 포함) |
| `npm run type-check` | `vue-tsc` 타입 검사 |
| `npm run check:lint` | oxlint + ESLint 검사 (파일 수정 없음) |
| `npm run lint` | oxlint + ESLint 자동 수정 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run verify` | 타입 검사 → 린트 → 테스트 → 빌드를 한 번에 |

공고 API를 연결하려면 `frontend/.env.example`을 `frontend/.env.local`로 복사하고 `VITE_API_BASE_URL`을 지정합니다(예: `http://localhost:8000/api`). 비워 두면 공고 데이터 미연동 상태로 동작합니다.

## 백엔드 실행

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                # POSTGRES_* 접속 정보를 채웁니다

python manage.py check              # 설정 확인 (DB 접속 없이 가능)
python manage.py test               # 판정 엔진·직렬화 테스트 (DB 없이 가능)
python manage.py migrate            # PostgreSQL 연결 후
python manage.py runserver          # http://localhost:8000
```

- `runserver`는 시작할 때 마이그레이션 상태를 확인하므로 **PostgreSQL 접속 정보가 있어야 실행됩니다.**
- 관리자 계정은 만들어 두지 않았습니다. 필요하면 운영자가 `python manage.py createsuperuser`로 직접 만듭니다.

| API | 내용 |
|---|---|
| `GET /api/health/` | API 프로세스 상태 |
| `GET /api/programs/` | DB에 저장된 공고 목록 (검색·필터·정렬, 20건씩) |
| `GET /api/programs/{id}/` | 공고 상세 |
| `/admin/` | 검증된 공고 입력용 관리 화면 |

## 지금 작동하는 것과 공고 연결 후 활성화될 것

**지금 작동함 (데이터 없이 가능한 동작)**
- 전체 메뉴·사이드바·모바일 메뉴 서랍, 이동 경로(breadcrumb)와 상위 이동, 본문 바로가기
- 기업정보 6단계 입력: 단계 이동, 필수 항목 검증과 오류 안내, 건너뛰기, 임시 저장, 입력 완료, 처음부터 다시 입력
- 입력한 기업정보의 요약(진단 화면)·조회·단계별 수정·삭제 (이 브라우저에만 저장, 사업자등록번호 제외)
- 공고 검색·필터(접수상태·지원분야·기관 유형·지역·지원방식)와 URL 반영·초기화, 자격 상태 탭, 비교 칸 수·보기 방식 전환
- 캘린더 월 이동·오늘 이동·방향키 이동, 일정 유형 켜고 끄기, 지원 이력 상태 탭

**공고 데이터 연결 후 활성화 (지금은 `-` 또는 비활성 + 이유 표시)**
- 공고 목록·건수, 정렬, 비교 선택, 공고 상세 값, 원문 보기·신청하기
- 신청 자격 판정(규칙·원문 근거가 있을 때만), 적합도(검증된 기준이 있을 때만), 기회비용
- 관심사업 저장, 준비 중 사업·체크리스트·준비도, 일정 자동 생성, 지원 이력 등록
- 서류 업로드(파일 저장소 연결 필요), 로그인·서버 동기화(계정 기능 필요)
- 수출단계 진단·로드맵 현재 위치(검증된 진단 기준 필요)

## 배포

프론트엔드는 Vercel의 Vite 프로젝트로 배포합니다. Root Directory `frontend`, Build Command `npm run build`, Output Directory `dist`. 하위 경로 새로고침용 rewrite는 `frontend/vercel.json`에 들어 있습니다. 자세한 절차는 [docs/deployment.md](docs/deployment.md)를 보세요.

## 문서

- [docs/architecture.md](docs/architecture.md): 데이터 모델, 빈 상태 계약, 데이터 접근 경계, 판정 엔진, 경로
- [docs/deployment.md](docs/deployment.md): GitHub 연결, Vercel 배포, 배포 후 확인 항목
