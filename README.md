# 수출지원사업 매칭 시스템

중소·중견기업이 기업정보(업종, 매출액, 수출실적, 주력 제품 등)를 입력하면 자사에 맞는 정부·공공기관 수출지원사업을 찾고, **신청 자격과 적합도를 나누어** 확인하며, 여러 사업의 준비 부담(기회비용)을 비교하고 신청 준비·일정·이력을 관리하는 웹 서비스입니다.

## 현재 상태

- **최종 데이터 연결 (REVISION_05).** 완성된 신청 자격·지원분류 정답세트(150건)를 반입해 **게시 공고 159건**(원공고 149 + 세부사업)을 사이트에 연결했습니다. 데이터 기준일은 2026-11-13입니다. 공고는 서버 DB 대신 게시 스냅샷(`frontend/src/data/published/notices.json`, backend `export_public_snapshot`이 만듦)으로 배포하고, 브라우저와 서버 함수가 같은 판정 엔진으로 계산합니다. 공고 폴더 375개 파일은 텍스트화·자동 추출해 **검수 대기 165건 · 추출 불가 35건**으로 관리자 화면에 있습니다(아직 게시하지 않음). 자세한 내용은 [docs/revisions/revision_05_inventory.md](docs/revisions/revision_05_inventory.md).
- **맞춤 공고 3탭 (REVISION_05).** 모든 게시 공고를 `신청 가능 · 확인 필요 · 신청 불가`로 나눕니다(엄격 판정은 정답세트 `reference_eval.py`와 불일치 0건). 확인 필요 공고는 상세에서 조건을 `충족함`으로 체크하면 탭이 바뀝니다(이 기기에만 저장). 적합도 v1(관심 분야 25 · 업종 20 · 수출단계 25 · 재무 25 · 가점 5, **검증 전 시험값**)은 신청 가능 공고에만 계산합니다. 기업 프로필에 ⑦ `재무·신청 전 확인` 단계를 더했습니다(건너뛰기 가능).
- **공고 도우미 챗봇 · 공개 API (REVISION_05).** 로그인한 사용자 화면 오른쪽 아래 `공고 도우미`(서버에 `ANTHROPIC_API_KEY`가 없으면 `준비 중`). 공개 API `/api/public/v1/*`(X-API-Key 필요)와 문서 `/api/public/docs`, 안내 화면 `/developers`(바닥글 링크).
- **관리자 계정 (REVISION_05).** 관리자 영역(`/admin`)은 운영자 계정 `OPS_LOGIN_*`만 엽니다. `DEMO_LOGIN_*`(ADMIN)은 일반 사용자, `TEST`는 테스트 기업 회원입니다.
- **(REVISION_05에서 대체) 공고 데이터 없음 (revision_04).** REVISION_02에서 연결했던 테스트 데이터셋(정답 세트 초안)과 그 안내 표시를 지웠습니다. 사용자 화면의 공고 영역은 모두 `-`와 빈 상태로 보이며, 검수 완료된 최종 데이터는 관리자 화면(`/admin/notices#bulk`)에서 올립니다. 공고 저장소(DB)는 아직 연결하지 않았으므로 반영은 저장소 연결 후에 켜집니다. 개정 내용은 [docs/revisions/REVISION_04.md](docs/revisions/REVISION_04.md)를 보세요.
- 공고 저장소는 `VITE_API_BASE_URL`이 있으면 API, 없으면 빈 저장소(공고 없음 상태)입니다.
- **관리자 영역 (revision_04).** `DEMO_LOGIN_*`로 설정한 계정(ADMIN)이 웹 관리자 영역(`/admin`)을 씁니다: 관리자 홈 · 기업마당 API 수집 · KOTRA CSV 업로드 · 공고 검수 · 공고 관리 · 기준·설정. 화면 구성과 브라우저 안에서 끝나는 동작(KOTRA 양식 내려받기, CSV·정답세트 xlsx 읽기·검사·미리보기, 입력 검증, 필터)은 동작하고, 저장이 필요한 버튼은 이유와 함께 비활성입니다. 관리자로 로그인하면 관리자 홈이 첫 화면이고, 다른 계정·비로그인은 관리자 화면에 들어갈 수 없습니다.
- **서비스 이름은 Export Compass입니다 (revision_05).** 로고는 `frontend/public/brand/`의 나침반 이미지입니다.
- **메인 랜딩페이지 · 수출 로드맵 삭제 (revision_05).** 홈(`/`, 메뉴 `서비스 소개`)을 블랙·옐로우 B2B SaaS 랜딩페이지(Hero → 문제 → 핵심 서비스 → 이용 과정 → 추천 결과 미리보기 → 공고 기관 → 마지막 CTA)로 바꿨고, 앱 전체 색을 블랙·옐로우(보조 블루)로 맞췄습니다. 수출 로드맵 화면은 없앴고(`/roadmap` → 맞춤 추천), 로그인 후 기업 회원의 첫 화면은 맞춤 추천입니다. `관심·준비 중·신청완료 사업` 탭 이름은 `나의 사업 관리`입니다. 기록은 [docs/revisions/revision_05_landing_record.md](docs/revisions/revision_05_landing_record.md).
- **기업 맞춤 지원사업 (revision_04):** 기업 진단 화면을 없애고(`/diagnose/result` → 맞춤 추천) 맞춤 추천만 남겼습니다. 맞춤 추천은 `신청 가능 · 확인 필요 · 신청 불가` 탭과 오른쪽 위 적합도 점수(시험용 기준)·지원 내용 한 줄 카드로 보여 줍니다.
- 화면 (revision_03): 왼쪽 사이드바 없이 상단 한 줄 헤더에 로고 · 주 메뉴 5개(서비스 소개 / 기업 맞춤 지원사업 / 전체 지원사업 / 지원사업 관리 / 커뮤니티, revision_05) · 로그인/프로필이 있습니다. 데스크톱에서는 주 메뉴에 마우스를 올리거나 키보드로 들어가면 하위 메뉴가 각 주 메뉴 아래에 펼쳐지고, 991px 이하에서는 메뉴 버튼으로 서랍 메뉴를 엽니다. 각 화면 상단에도 하위 메뉴가 있습니다. 로그인하면 맞춤 추천이 첫 화면이고(revision_05), 헤더의 프로필 버튼을 누르면 `기업 프로필`·`로그아웃`(관리자는 `관리자 홈`·`로그아웃`)이 나옵니다. 개정 내용은 [docs/revisions/REVISION_03.md](docs/revisions/REVISION_03.md)를 보세요.
- **판정:** 수출단계 진단 v1(중소벤처기업부 2026년 통합공고 기준), 자격 판정 v2(필수 그룹 OR/AND·제외 조건·일부 항목 조건·직접 확인), 적합도 v0(**시험용 · 검증 전**, 재무 변수 미사용)를 씁니다.
- **테스트 계정 (revision_03 테스트 계정).** 시연·캡처용 `TEST` 계정으로 로그인하면 가상의 테스트 기업(`EC 테스트식품(주)`, 식료품 제조업·내수 단계) 프로필이 그 계정 전용으로 이 브라우저에 들어갑니다. 비어 있을 때만 넣고, 고친 값은 다시 로그인해도 유지되며, 기업 프로필 화면의 `테스트 프로필 초기화`로만 되돌립니다. 관리자 계정·비로그인의 기업정보와는 따로 저장됩니다. 공고 데이터를 지웠으므로 지금 추천은 빈 상태이고, 수출 로드맵의 현재 단계 `내수`는 그대로 보입니다. 비밀번호는 환경변수로만 전달합니다. 반영 현황은 [docs/revisions/revision_03_test_account_inventory.md](docs/revisions/revision_03_test_account_inventory.md)를 보세요.
- **로그인은 서버에서 확인합니다.** Vercel 서버 함수(`frontend/api/`)가 관리자 계정(역할 `admin`)과 테스트 계정(역할 `test`)을 환경변수 값과 대조하고, HttpOnly 서명 쿠키로 세션을 유지합니다. 회원가입은 회원 정보를 저장할 서버 DB가 없어 `준비 중`입니다. 로그인이 필요한 화면은 지원사업 관리(관심·준비 중·신청완료 사업, 서류함)와 커뮤니티 글쓰기, 관리자 계정만 여는 관리자 영역입니다. 기업 프로필(기업정보 입력, `/profile`)은 로그인 없이 쓸 수 있습니다. 로그아웃은 서버 세션만 끝내며 이 기기에 저장한 기업정보·관리 기록은 그대로 남습니다.
- **커뮤니티(지원사업 후기·지원사업 정보방)와 많이 본 공고는 화면만 있습니다.** 게시글·조회 집계를 저장할 서버와 회원 DB가 없어 목록은 빈 상태이고 글쓰기·등록은 이유와 함께 비활성입니다. 브라우저 저장소에 글이나 조회 기록을 쌓지 않습니다.
- 백엔드(`backend/`)는 Django REST Framework 골격과 공고 모델·마이그레이션·읽기 API까지 준비되어 있습니다. **DB(PostgreSQL)는 연결·가동하지 않았고**, revision_02의 백엔드 계약(새 필드, 데이터 가져오기 명령, 판정 엔진 v2)은 아직 반영하지 않았습니다.

## 저장소 구조

```
.
├── frontend/            Vue 3 + Vite + TypeScript + Vue Router SPA (Bootstrap 5, Tabler 아이콘)
│   ├── api/                 Vercel 서버 함수 (/api/auth/* 로그인, /api/assistant/* 챗봇, /api/public/* 공개 API)
│   ├── server/              서버 전용 코드 (인증·챗봇·공개 API·게시 스냅샷 검색), 개발·미리보기 서버용 Vite 플러그인
│   ├── src/
│   │   ├── views/           페이지 (홈, 로그인, 기업 프로필(입력), 맞춤 추천, 전체 공고·공고 달력·상세, 지원사업 관리, 커뮤니티, 관리자 6개 화면)
│   │   ├── components/      공통 UI(카드·배지·정보 행·빈 상태·탭·모달 등), 단계 폼, 필터, 캘린더, 비교 영역
│   │   ├── repositories/    공고 데이터 읽기 경계 (기본: 빈 저장소, 선택: REST API), admin/ 관리자 경계 (지금: 빈 저장소)
│   │   ├── lib/engine/      판정 엔진 인터페이스 (자격·적합도·기회비용·수출단계)
│   │   ├── lib/             결측값 표시, 프로필 검증·저장 직렬화 등
│   │   ├── stores/          기업 프로필·관리 기록(이 기기 저장), 로그인 상태, 알림
│   │   ├── types/           Program·CompanyProfile·판정 결과 타입
│   │   └── __tests__/       단위 테스트 (Vitest)
│   └── vercel.json          Vercel 배포 설정 (하위 경로 rewrite 포함)
├── backend/             Django 5.2 + DRF API 골격
│   ├── config/              설정 (환경변수 기반, PostgreSQL)
│   ├── programs/            공고·자격 규칙·필요서류 모델, 직렬화, 읽기 전용 API
│   ├── matching/            판정 엔진 (프론트엔드와 같은 계약)
│   └── core/                상태 확인 API
├── docs/                설계·배포 안내, 개정 문서(docs/revisions/)
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

백엔드나 DB 없이도 모든 화면을 확인할 수 있습니다. 공고 데이터는 연결되지 않은 빈 상태로 동작합니다.

```bash
cd frontend
npm ci                # 또는 npm install
npm run dev           # 개발 서버: http://localhost:5173
```

| 명령 | 내용 |
|---|---|
| `npm run build` | 타입 검사 후 `frontend/dist/`에 정적 파일 생성 |
| `npm run preview` | 빌드 결과 미리보기 (하위 경로 새로고침 포함) |
| `npm run type-check` | `vue-tsc` 타입 검사 (앱·테스트·서버 코드) |
| `npm run check:lint` | oxlint + ESLint 검사 (파일 수정 없음) |
| `npm run lint` | oxlint + ESLint 자동 수정 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run verify` | 타입 검사 → 린트 → 테스트 → 빌드를 한 번에 |

환경변수는 `frontend/.env.example`을 `frontend/.env.local`로 복사해 채웁니다(`.env.local`은 Git에 올라가지 않습니다).

| 변수 | 용도 |
|---|---|
| `DEMO_LOGIN_ID`, `DEMO_LOGIN_PASSWORD` | 관리자 계정 아이디(`ADMIN`)·비밀번호 (서버 전용, 아이디는 대소문자 구분, 역할 `admin`) |
| `TEST_LOGIN_ID`, `TEST_LOGIN_PASSWORD` | 테스트 계정 아이디(`TEST`)·비밀번호 (서버 전용, 둘 다 있을 때만 로그인 가능) |
| `AUTH_SESSION_SECRET` | 세션 서명 키 (`openssl rand -base64 32`, 환경마다 다른 값) |
| `VITE_API_BASE_URL` | 공고 API 주소. 비우면 공고 데이터 미연동 상태. 빌드 시점에 들어가므로 바꾼 뒤 다시 배포 |

- 로그인 관련 변수는 서버에서만 읽으므로 `VITE_` 접두사를 붙이지 않습니다(브라우저 번들에 들어가지 않음).
- `npm run dev`와 `npm run preview`에서도 개발 서버 미들웨어가 같은 서버 코드로 로그인을 처리합니다. 값이 없으면 로그인은 `로그인 설정이 되어 있지 않습니다.`로 막히고, 나머지 화면은 그대로 쓸 수 있습니다.

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
- `DEMO_LOGIN_*`로 설정한 계정(ADMIN)이 웹 관리자 영역(`/admin`)을 씁니다. Django 관리 화면(백엔드 `/admin/`) 계정은 만들어 두지 않았고, 필요하면 운영자가 `python manage.py createsuperuser`로 직접 만듭니다.

| API | 내용 |
|---|---|
| `GET /api/health/` | API 프로세스 상태 |
| `GET /api/programs/` | DB에 저장된 공고 목록 (검색·필터·정렬, 20건씩) |
| `GET /api/programs/{id}/` | 공고 상세 |
| `/admin/` | 검증된 공고 입력용 관리 화면 |

## 지금 작동하는 것과 공고 연결 후 활성화될 것

**공고 저장소 연결 후 작동함 (화면·계산은 준비됨, 지금은 공고가 없어 빈 상태)**
- 전체 공고 검색·필터(세부 분야 15개 포함)·정렬과 실제 건수, 둘러보기의 새로 올라온 공고(게시일 기준 30일)
- 맞춤 추천: `신청 가능 · 확인 필요 · 신청 불가` 탭(건수), 탭 안 적합도 높은 순 → 마감 빠른 순, 카드 오른쪽 위 적합도 점수, 지원 내용 한 줄, 공통 확인 사항 5가지, 계산 근거 표
- 공고 상세: 조건별 자격(그룹·제외·일부 항목·해석 확인 필요·예외 있음), 공고별 직접 확인, 필요서류(필수 → 해당 시 → 선택), 기회비용(정산 방식·최대 자기부담·마감 여유), 원문 파일·쪽
- 비교에 추가(이동 없이 선택만, 하단 비교 바) — 맞춤 추천·공고 상세·지원사업 관리, 비교 표의 새 6개 행
- 공고 달력 일정
- 관리자: 지금 수집, 반영·되돌리기, 승인·반려, 게시 중지, 병합, 기준 저장 (저장소·API가 필요)

**데이터 없이도 작동함**
- 상단 주 메뉴 5개와 하위 메뉴 패널(마우스·키보드, `Esc`로 닫기)·화면 내 하위 메뉴·모바일 서랍 메뉴, 본문 바로가기, 기존 주소 리다이렉트(`/mypage/*`, `/diagnose/input` 등)
- 관리자·테스트 계정 로그인·로그아웃(테스트 계정은 전용 테스트 기업 프로필과 초기화), 로그인 후 기업 회원은 맞춤 추천·관리자는 관리자 홈(로그인이 필요한 화면에서 넘어왔으면 그 화면, 외부 주소 차단), 로그아웃 후 홈, 헤더 프로필 팝업
- 메인 랜딩페이지: 실제 화면으로 가는 CTA, 이용 과정 단계 탭(방향키), 기능 카드 가로 넘기기, 기관 목록 흐름 멈추기, 스크롤 등장 효과(동작 줄이기 설정 존중)
- 관리자: KOTRA CSV 양식 내려받기·읽기(UTF-8/EUC-KR)·행 검사·미리보기, 정답세트 xlsx 검사(공고·규칙·가점·서류 수, 오류·경고), 공고 관리 필터의 주소 반영, 수집 필터 키워드 검증, 적합도 가중치 합계 검증, 전략표 머리글 CSV 내려받기, 코드의 실제 기준(수출단계 v1·적합도 fit-v0·단계 가중치·공통 확인 5가지·15개 분야) 보기
- 기업 프로필(기업정보 6단계 입력): 단계 이동, 필수 항목 검증과 오류 안내, 건너뛰기, 임시 저장, 입력 완료, 처음부터 다시 입력
- 입력한 기업정보의 조회·수정·삭제 (이 브라우저에만 저장, 사업자등록번호 제외), 입력 완료 후 맞춤 추천으로 이동
- 전체 공고 검색·필터(접수상태·지원분야·기관 유형·지역·지원방식)와 URL 반영·초기화, 맞춤 추천 상태 탭과 `?tab=` 반영
- 전체 공고 하단 비교 영역: 선택 칩·제거·모두 지우기, 펼치기, 비교 칸 수·보기 방식 전환, 찾을 수 없는 공고 표시
- 공고 달력 월 이동·오늘 이동·방향키 이동, 일정 유형 켜고 끄기, 관리 기록 상태 탭·상태 필터

**아직 연결되지 않음 (지금은 `-` 또는 비활성 + 이유 표시)**
- 원문 보기·신청하기(검수자가 확인한 원문 URL 필요, `source_urls.csv`)
- 많이 본 공고(조회 집계 서버 저장소 필요), 커뮤니티 글·댓글·추천·신고(게시판 서버·회원 DB 필요), 참여 후기 값(후기 5건 이상)
- 예상 준비 시간·선정 후 의무·쉬운 설명(정답 세트에 없음), 새로 준비할 서류 수·준비도(서류함 연결 필요)
- 서류 업로드(파일 저장소 연결 필요), 회원가입·서버 동기화(회원 DB 필요)
- 관리자 데이터 API(`/api/admin/*`)와 공고 저장소 — 계약은 [docs/architecture.md](docs/architecture.md)에 있다

## 배포

프론트엔드는 Vercel의 Vite 프로젝트로 배포합니다. Root Directory `frontend`, Build Command `npm run build`, Output Directory `dist`. 하위 경로 새로고침용 rewrite(`/api/` 제외)는 `frontend/vercel.json`에 들어 있습니다. 관리자·테스트 계정은 Vercel 프로젝트 환경변수(`DEMO_LOGIN_ID`, `DEMO_LOGIN_PASSWORD`, `TEST_LOGIN_ID`, `TEST_LOGIN_PASSWORD`, `AUTH_SESSION_SECRET`)로 설정합니다. 자세한 절차는 [docs/deployment.md](docs/deployment.md)를 보세요.

## 문서

- [docs/architecture.md](docs/architecture.md): 데이터 모델, 빈 상태 계약, 데이터 접근 경계, 판정 엔진, 경로
- [docs/deployment.md](docs/deployment.md): GitHub 연결, Vercel 배포·환경변수, 배포 후 확인 항목
- [docs/revisions/](docs/revisions/): 개정 지시(비밀번호 가림)와 반영 전 현황 조사
- [docs/data/test-dataset-report.md](docs/data/test-dataset-report.md): 테스트 데이터셋 변환 보고서 (REVISION_04에서 앱 데이터에서 제거, 기록용), 변환 규칙은 [tools/dataset/README.md](tools/dataset/README.md)
- [docs/contracts/engine-cases.json](docs/contracts/engine-cases.json): 프론트엔드·백엔드가 함께 쓰는 자격 판정 공유 사례
