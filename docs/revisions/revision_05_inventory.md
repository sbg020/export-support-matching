# revision_05 기록 — 수출 로드맵 삭제 · 나의 사업 관리 · 메인 랜딩페이지 리뉴얼

> 작업일 2026-11-15 · 작업 브랜치 `revision-05` (`revision-04`에서 분기) · 사용자 요청(채팅)을 기준으로 한다. 별도 개정 문서는 없다.

## 1. 요청과 반영

| 요청 | 반영 |
|---|---|
| 0. 나의 수출 로드맵 기능 삭제 (적합도 계산·원문 대조를 강조) | `views/RoadmapView.vue`, 경로 `roadmap`, 주 메뉴 `수출 로드맵`, 로드맵 전용 상수 `ROADMAP_STAGES` 삭제. 예전 주소 `/roadmap`과 `/diagnose/result`는 맞춤 추천(`/programs/recommended`)으로 리다이렉트(쿼리·해시 유지). 로드맵을 가리키던 이동(로그인 후 첫 화면, 관리자가 아닌 계정의 `/admin` 접근, 기업 프로필 `입력 완료`·`'입력 중' 상태로 보기`, 관리자 `사용자 화면 보기`)은 모두 맞춤 추천으로 바꿨다 |
| 0. `관심·준비 중·신청완료 사업` 탭 이름 → `나의 사업 관리` | 하위 메뉴·화면 제목·탭 제목·공고 상세의 `목록으로` 이름·로그인 안내를 바꿨다. 경로(`/manage/programs`)와 저장 키·상태 탭(관심·준비 중·신청완료)은 그대로 |
| 메인 페이지 리뉴얼 (코나비즈카드 구조, 블랙·옐로우·블루) | `views/HomeView.vue`와 `components/home/*` 7개 섹션 (§2) |
| 상단 내비게이션 | 주 메뉴 5개: `서비스 소개`(홈, 새 섹션 `intro`) · 기업 맞춤 지원사업 · 전체 지원사업 · 지원사업 관리 · 커뮤니티. 비로그인은 `로그인` 링크 + `회원가입`(로그인 화면의 회원가입 탭 `/login?mode=signup`), 로그인하면 기존 프로필 메뉴. 홈 블랙 히어로 위에서는 투명 배경·흰 글자, 히어로를 지나거나 메뉴 패널·팝업·서랍이 열리면 흰 배경 (`AppHeader`) |
| 기타 페이지 색상 | 디자인 토큰(`styles/tokens.css`)만 바꿔 전체에 적용: 바탕 `#F5F5F5`, 제목 `#111111`, 주 버튼 블랙, 강조 옐로우(`#FFCF24`, 글자는 블랙), 블루(`#2563EB`)는 링크·적합도·정보 표시. 현재 메뉴·탭 표시는 블랙(굵게 + 밑줄), 로고 마크·파비콘은 블랙 바탕 옐로우 화살표. 레이아웃·기능은 바꾸지 않았다 |

## 2. 메인 랜딩페이지

| 섹션 | 구성 | 연결 |
|---|---|---|
| 1 Hero | 블랙 배경, `수출지원사업, / 우리 기업에 맞게.`(핵심 문구 옐로우), 서브 카피, 예시 UI(기업 조건 → 자격 상태 탭 → 예시 추천 카드 2개, `예시 화면` 표시) | `맞춤 지원사업 찾기` → `/programs/recommended`, `전체 지원사업 보기` → `/programs` |
| 2 Problem | 옐로우 배너의 큰 질문, 문제 3개(흩어진 공고 · 복잡한 신청 자격 · 불분명한 지원 전략)가 스크롤하면 위로 쌓이는 장면(CSS sticky). 그림은 이미지 대신 기관 이름·자격 항목·지원 단계로 만든 도식 | - |
| 3 Solution | 왼쪽 큰 제목 + 이전·다음 버튼, 오른쪽 가로로 넘기는 기능 카드 4개(블랙·옐로우·라이트 그레이·화이트). 카드 안 UI는 실제 기준: 조건 상태 `충족·미충족·확인 필요`, 적합도 가중치 `ACTIVE_FIT_CRITERIA`(0.40·0.30·0.30, ±10, fit-v0 검증 전), 지원 단계 4개와 세부 분야 매핑 `CATEGORIES_BY_PRIMARY_PHASE`. 기업 조건 값만 `입력 예시` | - |
| 4 How It Works | 큰 가운데 문구, 가로형 3단계(STEP 01~03) 탭 — 방향키·Home·End로 이동, 고른 단계의 설명과 버튼. 767px 이하 세로형 | STEP 01 → `/profile`, 02 → `/programs/recommended`, 03 → `/programs` |
| 5 Matching Preview | 카드에서 볼 수 있는 6가지(지원사업명·지원기관·수출지원 단계·지원대상 및 주요 요건·자격 충족 여부·적합도 점수). **공고가 연결되어 있고 신청 가능·확인 필요 공고가 있으면 실제 `RecommendationCard`를 그대로 쓴다.** 지금은 공고가 없어 같은 배치의 예시 카드(`예시 화면`) | `맞춤 추천 보기`, 카드의 `자세히 보기` → `/programs/recommended` |
| 기관 띠 | 코나비즈 고객사 로고 영역 구조. 수출지원사업을 공고하는 기관 이름 16곳(기업마당·KOTRA·KITA·무역투자24·중소벤처기업부 등)을 글자로 두 줄, 반대 방향으로 흐름. 멈춤 버튼(WCAG 2.2.2), 마우스·포커스 시 멈춤, 동작 줄이기 설정에서는 줄바꿈 목록. 문구: `기업마당과 KOTRA 공고 연계를 시작으로 … 넓혀 갑니다` | - |
| 6 Final CTA | 블랙 띠, `우리 기업의 다음 수출 기회, 지금 발견하세요.` | `맞춤 지원사업 찾기` → `/programs/recommended` |

- 예시 데이터(`constants/landing.ts`)의 공고명은 `예시 공고 A·B·C`, 기관은 `지원기관 (예시)`로 실제 사업으로 오해하지 않게 했고, 점수는 예시 카드에만 있으며 항상 `예시 화면 · 실제 공고·점수가 아닙니다` 표시와 함께 나온다. 통계·건수는 만들지 않았다.
- 애니메이션: 스크롤 등장(`composables/useReveal.ts`, IntersectionObserver), 카드 호버, 기관 띠 흐름. 모두 `prefers-reduced-motion`에서 끈다. 새 의존성 없음(외부 라이브러리·이미지 없음).
- 브랜드 로고·아이콘·이미지는 참고 사이트에서 가져오지 않았다.

## 3. 바뀐 파일

- 삭제: `views/RoadmapView.vue`
- 새 파일: `components/home/HomeHero.vue`·`HomeProblem.vue`·`HomeSolution.vue`·`HomeHowItWorks.vue`·`HomePreview.vue`·`HomeAgencies.vue`·`HomeFinalCta.vue`·`ExampleMatchCard.vue`, `constants/landing.ts`, `composables/useReveal.ts`, `styles/landing.css`, `__tests__/revision05.spec.ts`
- 수정: `views/HomeView.vue`, `router/index.ts`, `lib/redirect.ts`, `constants/navigation.ts`, `constants/options.ts`, `constants/adminNavigation.ts`(주석), `components/layout/AppHeader.vue`·`BrandLink.vue`·`BrandMark.vue`·`ProfileMenu.vue`·`TopNav.vue`·`SectionNav.vue`·`SidebarNav.vue`·`AdminNav.vue`·`AdminHeader.vue`, `components/common/TabNav.vue`·`SegmentedControl.vue`, `components/diagnose/StepProgress.vue`(그라데이션 → 단색), `styles/tokens.css`·`app.css`(버튼), `views/diagnose/DiagnoseInputView.vue`, `views/LoginView.vue`, `views/mypage/MyProgramsView.vue`, `views/programs/ProgramDetailView.vue`, `views/admin/AdminSettingsView.vue`(문구), `composables/useProgramEvaluations.ts`(주석), `index.html`(theme-color·설명), `public/favicon.svg`
- 테스트: `app.spec.ts`, `revision.spec.ts`, `revision03.spec.ts`, `revision04.spec.ts`의 로드맵·메뉴·로그인 후 이동 기대값을 바꿨고, `revision05.spec.ts`(로드맵 삭제, 메뉴, 나의 사업 관리, 로그인/회원가입 링크, 랜딩 섹션·CTA 연결·예시 표시·실제 가중치·이용 과정 탭 키보드·기관 띠 멈춤·미리보기)를 더했다.

## 4. 결정과 남은 일

- 로그인한 기업 회원이 `/`를 열면 이전에는 수출 로드맵으로 보냈으나, 로드맵이 없어졌으므로 서비스 소개(랜딩)를 그대로 보여 준다. **관리자 계정의 `/` → `/admin` 규칙(REVISION_04)은 바꾸지 않았다.** 그래서 관리자가 사용자 화면의 `서비스 소개`를 누르면 관리자 홈으로 간다.
- 기타 페이지 참고 디자인(`EC(Export Compass) 웹서비스 와이어프레임` 아티팩트)은 claude.ai 로그인이 필요해 열람하지 못했다. 그래서 요청에 적힌 디자인 시스템(블랙·옐로우·블루)을 토큰에 반영하는 범위로 맞췄다. 와이어프레임의 세부 레이아웃은 반영하지 않았다.
- 회원가입은 서버 DB가 없어 지금처럼 로그인 화면의 회원가입 탭(준비 중 안내)으로 연결한다.
- 수출단계 진단 엔진(`diagnoseExportStage`)과 관리자 `기준·설정`의 수출단계 기준은 적합도 계산에 쓰이므로 남겼다(로드맵 화면만 삭제).
