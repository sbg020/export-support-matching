# revision_03 현황 조사 (구현 전)

> 조사일 2026-11-01 · 기준 커밋 `1c2839a` (`revision-02`) · 작업 브랜치 `revision-03`
> [REVISION_03.md](REVISION_03.md) §2에 따라 코드를 고치기 전에 확인한 내용이다. 문서의 예상과 다른 점은 실제 값으로 진행하고 아래에 적었다.

## 1. Git

- 현재 작업 브랜치 `revision-03`은 `revision-02`(`1c2839a`, `origin/revision-02`와 같음)에서 만들었다.
- `revision-02`는 `main`보다 11개 커밋 앞서 있고, `main`에는 병합되지 않았다(revision_02_inventory §9와 같음). 이번에도 `main` 병합·브랜치 삭제는 하지 않는다.
- 이 저장소에는 다른 브랜치도 있다. 손대지 않는다.
  - `revision-02-backend`: REVISION_02 §12 백엔드 계약 작업 브랜치(작업 폴더 `.claude/worktrees/…`). `revision-02`에 병합되지 않았다.
  - `claude/dreamy-almeida-c75f42`, `revision-01`: `61599df`.
- 추적하지 않는 `.claude/`(로컬 미리보기 설정·작업 폴더)는 커밋하지 않는다.
- 운영 사이트는 2026-10-31에 `revision-02`를 CLI로 배포한 상태다(revision_02_inventory §9).

## 2. 레이아웃

| 파일 | 지금 역할 |
|---|---|
| `App.vue` | `AppSidebar`(데스크톱 `d-none d-lg-block`) + 오른쪽 열(`AppHeader` · `main` · `SiteFooter`)을 가로로 놓는다. 모바일 서랍(`MobileNavDrawer`)·토스트는 바깥 |
| `components/layout/AppHeader.vue` | 메뉴 버튼·로고(모바일만), 오른쪽 로그인(`redirect=현재 경로`) 또는 프로필 원(→ `mypage-profile` 링크, 마이페이지면 선택 고리) |
| `components/layout/AppSidebar.vue` | 로고 + `SidebarNav`, 폭 `--sidebar-width`(256px) |
| `components/layout/SidebarNav.vue` | `SIDEBAR_SECTIONS`(마이페이지 제외 4개)를 아이콘과 함께 세로 목록으로. 사이드바와 모바일 서랍이 함께 씀 |
| `components/layout/MobileNavDrawer.vue` | `AppModal`(왼쪽) 안에 로고 + `SidebarNav`. 화면 이동 시 닫힘 |
| `components/layout/SectionNav.vue` | 현재 섹션의 하위 메뉴 탭. 마이페이지에서만 오른쪽 끝 `로그아웃` 버튼 |
| `components/layout/PageHeader.vue` | 제목·설명·메타·액션 + `SectionNav` |
| `components/layout/BrandLink.vue` | 로고(아이콘 + `수출지원사업 매칭`) → 홈 |

- `--sidebar-width`는 `AppSidebar.vue`에서만 쓰고 `styles/tokens.css`에 정의되어 있다.
- 본문 `.page`(`styles/app.css`)와 `SiteFooter`는 `--content-max`(1280px)·`--page-gutter`로 가운데 정렬한다. `AppHeader`는 좌우 여백만 `--page-gutter`이고 최대 너비가 없다.

## 3. 바뀌는 경로 이름·문구를 쓰는 곳

문서 §2.3 표와 거의 같다. 다른 점만 굵게 적었다.

| 바뀌는 것 | 실제로 쓰는 파일 |
|---|---|
| 경로 이름 `diagnose-input` | `constants/navigation.ts`, `router/index.ts`(경로·`/diagnose` 리다이렉트), `ConditionItem.vue`, `ProgramBrowser.vue`, `ProgramRecommendedView.vue`, `RoadmapView.vue`, `DiagnoseResultView.vue`(**4곳**: 수정하기·수출액 입력하기·기업정보 입력하기·빠진 항목 입력하기. 문서의 5번째는 `mypage-profile` 링크), `ProfileView.vue`(3곳, 삭제 대상), `HomeView.vue`(경로 이름 1곳 + 문자열 `'/diagnose/input'` 1곳), 테스트(`app.spec.ts`, `revision.spec.ts`) |
| 경로 이름 `mypage-profile` | `navigation.ts`, `router/index.ts`(경로·`/mypage` 리다이렉트), `AppHeader.vue`, `DiagnoseResultView.vue`(`프로필에서 보기`), `NotFoundView.vue`, 테스트 |
| `mypage-programs`·`mypage-documents`, 쿼리 `from=mypage` | `navigation.ts`, `router/index.ts`(경로·`/mypage/saved`·`preparation`·`history` 리다이렉트), `ProgramDetailView.vue`(`목록으로`), `ApplicationRecordTable.vue`(상세 링크), 테스트(`app.spec.ts`, `revision.spec.ts`의 `safeRedirect` 예시, **`revision02.spec.ts`의 `/mypage/programs` 이동**) |
| 섹션 `mypage` | `navigation.ts`, `router/index.ts`(3개 경로 `meta.section`), `AppHeader.vue`(선택 고리), `SectionNav.vue`(로그아웃 버튼), 테스트 |
| 로그인 화면으로 보낼 때 `redirect`를 붙이는 곳 | `AppHeader.vue`, `HomeView.vue`, `RecommendationCard.vue`, `ProgramDetailView.vue`, `CommunityBoardView.vue`, `CommunityPostView.vue`, `router/index.ts`(가드). **로그인 후 기본 이동 `/`는 `LoginView.vue`(`destination()`)와 `router/index.ts`(로그인 상태에서 `/login`)에 있다** |
| 문구 `마이페이지`·`지원사업 찾기`·`나의 로드맵`·`기업정보 입력·저장` | `navigation.ts`, `router/index.ts`(탭 제목·주석), `RecommendationCard.vue`, `ProgramDetailView.vue`, `LoginView.vue`(2곳), `NotFoundView.vue`, `constants/community.ts`, `AppHeader.vue`, **`DiagnoseInputView.vue`(화면 제목 `기업정보 입력`)** |
| 주석·테스트 이름 | `useProgramEvaluations.ts`·`SectionNav.vue`·`BrandMark.vue`(숨겨진 사이드바)·`router/index.ts`·`navigation.ts` 주석, `app.spec.ts`·`revision02.spec.ts` 테스트 이름 |

## 4. 저장 키 (이번 변경에서 건드리지 않음)

| 키 | 읽고 쓰는 코드 | 지우는 코드 |
|---|---|---|
| `export-support-matching:profile:v1` | `lib/profile.ts`(`PROFILE_STORAGE_KEY`, 직렬화), `stores/profileStore.ts` | `profileStore.clearAll()` — 기업정보 입력 화면의 `처음부터 다시 입력`(확인 창)과 기존 기업 프로필의 `이 기기에서 삭제`(확인 창, 삭제 대상 화면)에서만 사용자가 눌러 실행 |
| `esm.applicationRecords.v1` | `stores/applicationStore.ts` | 없음 |
| `esm.selfChecks.v1` | `stores/selfCheckStore.ts` | `selfCheckStore.clearAll()` — 사용자가 누르는 `직접 확인 모두 지우기`(공통 확인 패널, 공고 상세)에서만 |
| `esm.compareSelection.v1` (sessionStorage) | `composables/useCompareSelection.ts` | 사용자가 누르는 `모두 지우기`(비교 영역)에서만 |

- 로그아웃(`stores/authStore.ts`의 `logout`)은 `/api/auth/logout`만 부르고 화면 상태를 비로그인으로 바꾼다. 저장소를 건드리지 않는다.
- 이번 개정에서 위 파일(`lib/profile.ts`, `stores/*`, `useCompareSelection.ts`)은 고치지 않는다. 키를 옮기거나 초기화하는 코드도 넣지 않는다. 마지막에 `git diff`로 확인한다.

## 5. 기존 기업 프로필 화면(`views/mypage/ProfileView.vue`)의 기능

| 기능 | 처리 |
|---|---|
| 입력한 기업정보 요약 + 단계별 `수정`(→ 입력 화면 `?step=n`) | 문서대로 기업 진단 `입력한 기업정보` 요약에 `editable`을 켜고 `/profile?step=n`으로 보낸다. 카드의 `프로필에서 보기`는 `기업 프로필에서 수정`(→ `/profile`) |
| `이 기기에서 삭제`(확인 창 → `clearAll`) | 기업 프로필의 `처음부터 다시 입력`(확인 창 → 같은 `clearAll`)이 같은 기능. 새 버튼은 만들지 않는다 |
| 저장 상태: 프로필 상태 · 마지막 저장 · 확인이 필요한 항목 | 기업 프로필 `입력 현황` 카드에 있다 |
| 저장 상태: 저장 위치 `이 브라우저` · 서버 동기화 `준비 중` | 기업 프로필 위쪽 안내 `입력 정보는 이 기기에만 저장됩니다`(“서버로 전송하지 않으며 … 이 브라우저에 저장합니다”)에 같은 내용이 있다 |
| 저장 상태: 빠진 필수 항목 n개 | 기업 진단 `확인이 필요한 항목` 카드가 빠진 항목을 단계별로 나열한다 |
| 개인정보 보호 안내 4줄 | 서버 전송 없음·사업자등록번호 미저장은 기업 프로필 위쪽 안내에, 서류 원본 미업로드는 서류함 안내에, 삭제 방법은 `처음부터 다시 입력`에 있다 |
| **`브라우저 저장소를 사용할 수 없습니다` 경고**(사생활 보호 모드 등에서 저장소가 막혔을 때만) | **문서 §6.3 표에 없는 기능이다.** 기업정보 입력 화면에는 없다. 지우지 않고 새 기업 프로필(`/profile`)의 위쪽 안내 바로 아래로 옮긴다(저장소가 막혔을 때만 보이며, 평소 화면은 그대로) |
| `LocalModeNotice`(이 기기에서만 보관 안내) | 이 화면에서만 쓰던 공용 컴포넌트다. 문서대로 지우지 않는다. 화면을 지우면 쓰는 곳이 없어지므로 보고서에 적는다 |

## 6. 문서와 다르게 하거나 해석한 점

1. 위 5절의 저장소 경고를 기업 프로필로 옮긴다(문서 §2.5에 따른 위치 결정).
2. `ProfileSummary`의 단계별 `수정`은 지금처럼 버튼이며, 누르면 `/profile?step=n`으로 이동한다(공용 컴포넌트의 모양을 바꾸지 않는다).
3. 수출 로드맵 화면 본문 제목 `나의 수출 로드맵`은 없앨 문구(`나의 로드맵`)와 다르고 §8 표에도 없어 그대로 두었다. 주 메뉴·하위 메뉴·브라우저 탭 제목은 `수출 로드맵`이다.
4. 992px에서 주 메뉴 5개가 한 줄에 들어가므로(주 메뉴 끝과 로그인 영역 사이 약 170px) 상단 메뉴가 나오는 최소 폭을 1200px로 올리지 않았다. 1279px 이하에서는 메뉴 사이 간격과 안쪽 여백만 조금 줄인다.
5. 하위 항목 `관심·준비 중·신청완료 사업`은 열 폭을 넘거나 옆 열과 겹치지 않게 `·` 뒤에서 줄을 바꾼다(1280px에서 2줄, 992px에서 3줄).

## 7. 반영 현황 (2026-11-01)

### 7.1 바꾼 것

- **메뉴:** 상단 한 줄 헤더 `[로고] 수출 로드맵 · 기업 맞춤 지원사업 · 전체 지원사업 · 지원사업 관리 · 커뮤니티 … [로그인 또는 프로필]`, 주 메뉴 아이콘 없음. 하위 메뉴 패널은 `TopNav`, 프로필 팝업은 `ProfileMenu`(둘 다 새 컴포넌트), 서랍 메뉴(`SidebarNav`)도 같은 5개. 화면 안 하위 메뉴(`SectionNav`)의 로그아웃 버튼은 지웠다.
- **경로:** `/profile`(`company-profile`, 섹션 없음, 로그인 불필요), `/manage/programs`(`manage-programs`)·`/manage/documents`(`manage-documents`, 섹션 `manage`, 로그인 필요).
- **리다이렉트 (쿼리·해시 유지):** `/diagnose`·`/diagnose/input`·`/mypage`·`/mypage/profile` → `/profile`, `/mypage/programs` → `/manage/programs`, `/mypage/documents` → `/manage/documents`, `/mypage/saved`·`preparation`·`history` → `/manage/programs?tab=interested`·`preparing`·`applied`, `/manage` → `/manage/programs`, `/mypage/calendar` → `/programs/calendar`(지금과 같음).
- **로그인 후·로그아웃:** 안전한 `redirect`가 있으면 그 화면, 없거나 거부되면 `/roadmap`(`lib/redirect.ts`의 `afterLoginPath`). 로그인 상태에서 `/` → `/roadmap`, `/login` → `redirect` 또는 `/roadmap`. 규칙은 `router/index.ts`의 순수 함수 `authNavigationTarget`에 모았다. 헤더 `로그인`·홈 `추천받기`는 `redirect`를 붙이지 않는다. 로그아웃은 서버 세션만 끝내고 `/`로 간다.
- **문구:** §8 표 8곳 모두. 기업 프로필 화면 제목·탭 제목 `기업 프로필`.
- **지운 파일:** `views/mypage/ProfileView.vue`, `components/layout/AppSidebar.vue` 2개뿐. 쓰는 곳이 없어진 `--sidebar-width` 토큰 정의를 지웠다.
- **쓰지 않게 된 코드 (지우지 않음):** `components/mypage/LocalModeNotice.vue` — 지운 기업 프로필 화면에서만 쓰였다.
- **바꾸지 않은 것:** 저장 키 4개와 그 코드(`lib/profile.ts`, `stores/*`, `composables/useCompareSelection.ts`), `frontend/src/data/`, 정답 세트, `docs/contracts/`, `docs/data/`, `backend/`, 환경변수, Vercel 설정, 폴더 이름 `views/mypage`·`components/mypage`(화면 이름만 `지원사업 관리`).

### 7.2 확인 결과

- `npm run verify`: 타입 검사·린트(oxlint + eslint) 통과, 테스트 9개 파일 157개 통과(새 `__tests__/revision03.spec.ts` 16개 포함), 빌드 성공. 500KB 초과 경고는 기존 테스트 데이터 청크(`test-dataset-*.js`)다.
- `git diff --stat revision-02`: 지운 파일은 위 2개뿐이다. 바꾸지 않은 것으로 적은 경로에 변경이 없다.
- 로컬 브라우저(개발 서버):
  - 1280px: 헤더 안쪽(32~1233px)과 본문 안쪽(32~1233px)이 같다. 1920px: 본문 좌우 여백 344·345px(세로 스크롤바 15px 때문에 1px 차이), 로고 왼쪽 끝과 프로필 오른쪽 끝이 본문 좌우 끝에 맞는다. 사이드바와 가로 스크롤 없음.
  - 하위 메뉴 패널: 마우스를 올리면 5열(항목 9개)이 각 주 메뉴 왼쪽 끝에 맞춰 펼쳐지고 본문 위에 겹친다. 992px에서도 열끼리 겹치지 않는다. 키보드 Tab 순서는 주 메뉴 → 그 하위 항목 → 다음 주 메뉴이고, `Esc`로 닫히며 포커스가 그 주 메뉴로 간다.
  - 360px: 헤더 높이 56px 한 줄(메뉴 버튼 · 로고 · 로그인/프로필). 서랍 메뉴에 주 메뉴 5개가 새 순서·이름으로 아이콘 없이 보이고, 프로필 팝업이 화면 안에 들어온다.
  - 로그인 흐름은 실제 데모 비밀번호를 쓰지 않고, 이 확인에서만 쓴 임시 계정을 프로세스 환경변수로 넣은 별도 개발 서버(포트 5174, 확인 후 종료)에서 확인했다. 비로그인 `/manage/programs` → `/login?redirect=/manage/programs` → 로그인 후 `/manage/programs`. 헤더 `로그인`(redirect 없음) → 로그인 후 `/roadmap`. 로그인 상태 `/` → `/roadmap`. 프로필 팝업은 `기업 프로필`·`로그아웃` 2개이고 `기업 프로필` → `/profile`(프로필 버튼 선택 고리, 주 메뉴 선택 없음). 로그아웃 → `/`, 안내 토스트, 서버 세션 종료, 저장 키 4개 값이 로그인 전과 같다. `/mypage/profile`·`/mypage` → `/profile`, `/diagnose/input?step=2` → `/profile?step=2`, `/mypage/programs?tab=applied` → `/manage/programs?tab=applied`(신청완료 탭), `/mypage/documents` → `/manage/documents`. 기업 진단의 `기업정보 수정하기`·`기업 프로필에서 수정` → `/profile`, 요약의 `수출 현황 수정` → `/profile?step=3`.
