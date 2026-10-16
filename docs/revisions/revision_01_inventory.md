# revision_01 현황 조사 (코드 수정 전)

조사 기준: 커밋 `3680ff6` (배포 사이트 `https://exportsupportmatching.vercel.app/`와 같은 버전), 조사일 2026-10-16.

## 1. 구조

| 구분 | 내용 |
|---|---|
| 라우터 | `frontend/src/router/index.ts` — history 모드, 이름 있는 라우트 15개 + `/diagnose` 리다이렉트 + 404. `meta`: `title`, `section`(home/find/programs/roadmap/mypage), `ancestors`(이동 경로), `landing`(홈 전용 레이아웃) |
| 공통 레이아웃 | `App.vue`(본문 바로가기, 헤더, 사이드바, 본문, 푸터, 모바일 서랍, 알림), `components/layout/` — `AppHeader`(로고 + 상단 메뉴 4개 + 기기 저장 칩 + 비활성 `로그인 · 준비 중`), `AppSidebar`(`SidebarNav` 전체 메뉴 13개 + `DataStatusPanel`), `MobileNavDrawer`, `PageHeader`(이동 경로·뒤로 가기·제목·설명), `SiteFooter` |
| 페이지 | 홈, 기업정보 입력, 기업 진단, 전체 공고, 맞춤 추천, 공고 상세, 공고 비교, 수출 로드맵, 마이페이지 홈, 기업 프로필, 관심 사업, 준비 중 사업, 일정, 지원 이력, 서류함, 404 |
| 상태 관리 | Pinia 없음. 모듈 단위 `reactive` 저장소: `stores/profileStore.ts`(기업 프로필), `stores/trackingStore.ts`(관심·준비·이력·서류 — 빈 배열, 저장 안 함), `stores/toastStore.ts` |
| 배포 설정 | `frontend/vercel.json`: `framework: vite`, `installCommand: npm ci`, `buildCommand: npm run build`, `outputDirectory: dist`, rewrite `/(.*)` → `/index.html` (`/api/*`도 가로챔) |
| Vite·TS | `vite.config.ts`(vue, vueDevTools, `@` 별칭), `vitest.config.ts`(jsdom), `tsconfig.json` → `tsconfig.app.json`(src) · `tsconfig.node.json`(설정 파일) · `tsconfig.vitest.json`(테스트) |
| npm scripts | `dev`, `build`(type-check + build-only), `preview`, `test`, `test:unit`, `type-check`, `lint`(자동 수정), `check:lint`, `verify` |
| 백엔드 | `backend/` Django 골격은 있으나 **배포·연결되지 않음**. 프론트엔드의 공고 API 호출은 `VITE_API_BASE_URL`이 있을 때만 하며 배포 환경에는 설정되어 있지 않음 → `EmptyProgramRepository` 사용 |

## 2. 브라우저 저장소 키 (전체)

| 키 | 저장소 | 내용 | 처리 |
|---|---|---|---|
| `export-support-matching:profile:v1` | localStorage | 기업 프로필(사업자등록번호 제외)과 저장 메타 | **변경 없음** — 이름·형식 그대로 사용 |

- 관심·준비 중·지원 이력은 `trackingStore`의 **메모리 빈 배열**이었고 브라우저 저장소에 기록한 적이 없다.
- 공고 비교 선택은 `ProgramBrowser`의 컴포넌트 상태와 `/programs/compare?ids=` 쿼리로만 다뤘다(저장소 키 없음).
- 달력의 개인 준비 목표는 추가 기능이 비활성이라 저장된 적이 없다.
- 따라서 **복사·병합할 기존 관리 기록 키가 없다.** 새 관리 기록 저장소(`esm.applicationRecords.v1`)와 비교 선택 저장소(`esm.compareSelection.v1`, sessionStorage)는 새로 시작하며, 마이그레이션 코드는 필요하지 않다.

## 3. 로그인 구현 상태 판정: **경우 B**

근거
- 프론트엔드에 로그인 화면·인증 상태·`/api` 호출이 없다. 헤더의 `로그인 · 준비 중`은 `aria-disabled` 버튼이다.
- 저장소 어디에도 로그인 플래그(localStorage 등)가 없다 → 경우 C 아님.
- Django 백엔드는 배포되지 않았다(인증 API도 없음) → 경우 A 아님.
- 배포 사이트의 `GET /api/auth/me`가 200을 주지만 응답은 SPA의 `index.html`이다(rewrite가 `/api/*`까지 가로챔).

처리: Vercel 서버 함수(`frontend/api/`)로 데모 계정을 서버에서 검증하고 HttpOnly 서명 쿠키로 세션을 유지한다. 회원가입은 저장할 서버 DB가 없어 `준비 중`으로 비활성화한다.

## 4. 중복 기능 목록 (이번 수정의 체크리스트)

| 기능 | 현재 위치 (경로·컴포넌트) | 새 주 관리 위치 | 처리 | 관련 저장 키 |
|---|---|---|---|---|
| 기업정보 입력·수정 폼 | `/diagnose/input` (`DiagnoseInputView` + `diagnose/steps/*`), `/mypage/profile`의 단계별 수정 모달 (`ProfileEditModal` — 같은 Step 컴포넌트 재사용) | 지원사업 찾기 > 기업정보 입력·저장 | 마이페이지 모달 제거. 프로필의 섹션별 `수정`은 입력 화면 `?step=n`(기존 폼이 이미 지원)으로 연결. 모달에만 있던 항목 없음 | `export-support-matching:profile:v1` |
| 공고 비교 표 | `/programs/compare` (`ProgramCompareView` + `CompareTable`), 전체 공고·추천 하단 `공고 비교` 바, 상세의 `비교에 추가` | 전체 지원사업 > 전체 공고 하단 `#compare` | `ProgramCompareView` 내용을 `CompareSection`으로 옮겨 재사용, 경로는 리다이렉트 | 없음 → `esm.compareSelection.v1`(sessionStorage, 신규) |
| 달력 | `/mypage/calendar` (`CalendarView` + `MonthCalendar`), 마이페이지 홈 `가까운 일정` 카드 | 전체 지원사업 > 공고 달력 `/programs/calendar` | 화면·컴포넌트 이동, 요약 카드 제거, 경로 리다이렉트 | 없음 |
| 관심 사업 목록 | `/mypage/saved` (`SavedProgramsView`), 마이페이지 홈 카드 | 마이페이지 > 관심·준비 중·신청완료 사업 (관심 탭) | 탭 패널로 이동 | 없음 → `esm.applicationRecords.v1`(신규) |
| 준비 중 사업 | `/mypage/preparation` (`PreparationView`), 마이페이지 홈 카드 | 같은 화면 (준비 중 탭) | 탭 패널로 이동 | 같은 키 |
| 지원 이력 | `/mypage/history` (`HistoryView`), 마이페이지 홈 카드 | 같은 화면 (신청완료 탭, 상태 필터 칩) | 탭 패널로 이동 | 같은 키 |
| 마이페이지 홈 요약 | `/mypage` (`MyPageHomeView`) — 각 기능 바로가기 카드 | 각 기능의 주 관리 화면 | 화면 제거, `/mypage` → `/mypage/profile` | 없음 |
| 상단 메뉴 + 전체 사이드바 | `AppHeader` 상단 4링크, `SidebarNav` 13개 항목 | 사이드바 주 메뉴 3개 + 화면 내 `SectionNav` | 사이드바는 주 메뉴만, 하위 메뉴는 본문 상단 | 없음 |
| 서비스 준비 상태 패널 | 사이드바 `DataStatusPanel` (공고 데이터·계정·저장 위치) | 공고 목록·추천 빈 상태 안내, 마이페이지 `이 기기에서만 보관` 안내, 헤더 로그인 | 패널 제거 (같은 정보가 각 주 관리 화면에 있음) | 없음 |
| 이동 경로(breadcrumb) | `PageHeader` | 사이드바 + `SectionNav`, 상세의 `목록으로` | 제거 (화면 내 하위 메뉴로 대체) | 없음 |
| 시작 안내 CTA | 홈 히어로 `기업정보 입력하기`, 홈 하단 CTA, 진단·추천의 `기업정보 입력하기` 경고 | 홈 `추천받기` | 홈은 `추천받기` 하나로, 추천 화면 경고는 제목 아래 한 줄 상태로 축소 | 없음 |
| 판단 순서 설명 | 홈 `신청 자격 → 적합도 → 준비 부담`, 맞춤 추천 상단 3열 설명, 추천 하단 `알아 두세요` | 맞춤 추천 하단 `추천 기준 안내` 펼침 | 한곳으로 모음 | 없음 |
| 데이터 준비 안내 | 홈 히어로 문구, 홈 `한눈에 보기`, 전체 공고 안내 배너, 목록 빈 상태 | 전체 공고·맞춤 추천 빈 상태 | 홈 문구 제거 (빈 상태와 전체 공고 안내에 같은 내용 있음) | 없음 |
| 기기 저장 안내 | 헤더 칩, 입력 화면 배너, 마이페이지 `LocalModeNotice`, 푸터 | 기업정보 입력 화면 배너, 마이페이지 | 헤더 칩 제거, 나머지 유지 | 없음 |
