# 설계 안내

이 문서는 공고 데이터를 연결하거나 판정 기능을 구현할 개발자를 위한 안내입니다.

## 1. 기본 원칙

1. **신청 자격과 적합도는 분리합니다.** 설명 순서는 `실제 신청 자격 → 적합도 → 준비 부담/기회비용`입니다.
2. **근거 없이 판정·추정하지 않습니다.** 공고 원문 근거(문장·쪽)나 데이터 상태, 규칙·기준 버전이 없으면 결과는 `null`이고 화면에는 `-`입니다. 테스트 데이터(정답 세트 초안)로 계산한 결과에는 `초안 기준`을 붙이고, 적합도에는 `시험용 기준 v0 · 검증 전`을 항상 함께 표시합니다.
3. **결측은 `null`입니다.** `''`, `0`, 오늘 날짜, 임의 URL을 결측 대신 저장하지 않습니다. 숫자 `0`과 `false`는 유효한 값입니다(예: 수출액 `0 USD`).
4. **가상 데이터를 만들지 않습니다.** 빈 배열은 빈 상태 컴포넌트로 보여 주며, 샘플 공고·회사·일정을 채우지 않습니다.

## 2. 메뉴와 경로

사이드바에는 주 메뉴 4개만 두고, 각 화면 제목 아래 `SectionNav`에 현재 섹션의 하위 메뉴를 보여 준다. 메뉴 정의는 `frontend/src/constants/navigation.ts` 한 곳에 있고, 선택 상태는 라우트의 `meta.section`으로 정한다.

| 섹션 | 하위 메뉴 | 경로 | 이름 | 로그인 |
|---|---|---|---|---|
| (홈) | - | `/` | `home` | 불필요 |
| (로그인) | 로그인 / 회원가입 탭 | `/login` (`?mode=signup`, `?redirect=`) | `login` | - |
| 지원사업 찾기 | 기업정보 입력·저장 | `/diagnose/input` (`?step=1~6`) | `diagnose-input` | 불필요 |
| | 기업 진단 | `/diagnose/result` | `diagnose-result` | 불필요 |
| | 맞춤 추천 | `/programs/recommended` | `programs-recommended` | 불필요 |
| 전체 지원사업 | 전체 공고 (둘러보기, 하단 비교 영역 `#compare`) | `/programs` (필터 `q`, `status`, `stage`, `cat`, `agency`, `region`, `method`, `sort`, 비교 `compare`) | `programs` | 불필요 |
| | 공고 달력 | `/programs/calendar` | `programs-calendar` | 불필요 |
| | (하위 메뉴 아님) 공고 상세 | `/programs/:id` (`?from=recommended\|calendar\|mypage`) | `program-detail` | 불필요 |
| 나의 로드맵 | 수출 로드맵 | `/roadmap` | `roadmap` | 불필요 |
| 커뮤니티 | 지원사업 후기 | `/community/reviews` (`q`, `scope`, `sort`, `cat`, `program`, `page`) | `community-reviews` | 읽기 불필요 |
| | 지원사업 정보방 | `/community/info` (같은 쿼리) | `community-info` | 읽기 불필요 |
| | (하위 메뉴 아님) 글쓰기 | `/community/:board(reviews\|info)/write` | `community-write` | 필요 |
| | (하위 메뉴 아님) 글 보기 | `/community/:board(reviews\|info)/:postId` | `community-post` | 불필요 |
| 마이페이지 (헤더 프로필) | 기업 프로필 | `/mypage/profile` | `mypage-profile` | 필요 |
| | 관심·준비 중·신청완료 사업 | `/mypage/programs` (`?tab=interested\|preparing\|applied`) | `mypage-programs` | 필요 |
| | 서류함 | `/mypage/documents` | `mypage-documents` | 필요 |

기존 주소는 query·hash를 유지한 채 새 위치로 보낸다(`router/index.ts`의 `redirect` 함수).

| 기존 주소 | 새 주소 |
|---|---|
| `/programs/compare?ids=…` | `/programs?compare=…#compare` |
| `/mypage/calendar` | `/programs/calendar` |
| `/mypage` | `/mypage/profile` |
| `/mypage/saved` · `/mypage/preparation` · `/mypage/history` | `/mypage/programs?tab=interested` · `preparing` · `applied` |
| `/diagnose` | `/diagnose/input` |
| `/community` | `/community/reviews` |

Vue Router history 모드이므로 배포 환경에서는 `/api/`를 제외한 모든 경로를 `index.html`로 되돌리는 SPA fallback이 필요하다(`frontend/vercel.json`).

## 3. 데이터 모델

타입 정의: `frontend/src/types/`

- `Program` (`program.ts`): 공고(세부사업이 있으면 세부사업 1개, `parentId`·`subProgramName`). 원문 파일(`sourceFile`), 접수기간·메모, 데이터 기준일(`receptionStatusAsOf`), 주관·수행·기관 유형, 지역(+시·군·구), 15개 세부 분야(`supportCategories`, C01~C15)와 파생 지원 단계(`supportPhases`), 지원방식(+원문 표현), 지원금·총사업비 한도·금액 메모, 자기부담, 정산 방식(`settlement`), 대상 수출단계, 자격 규칙·서류·가점(`bonusItems`), 그룹(`groupKey`·`relatedProgramIds`), 데이터 상태(`dataState`: `draft`·`reviewed`·`verified`). `stage`는 `@deprecated`. 확인되지 않은 필드는 `null`. 배열 필드의 `null`은 "확인 전", `[]`는 "원문상 해당 없음 확인".
- `EligibilityRule` (v2): 정답 세트 `rules` 시트의 필드 이름을 그대로 씁니다. `kind`(필수·제외), `group`(같은 그룹 OR, 다른 그룹 AND), `scope`(일부 지원 항목), `field`·`op`·`value`·`unit`·`basis`, `certainty`(명확·애매), `commonCheckKey`(공통 확인 5가지)·`commonCheckUncovered`, `exceptionText`, 원문 근거(`source`: 문장·쪽).
- 테스트 데이터셋 (`dataset.ts`): `frontend/src/data/test-dataset.json`과 같은 `meta`를 담은 `test-dataset.meta.json`. `tools/dataset/build_test_dataset.py`가 정답 세트 xlsx에서 결정적으로 만들며 손으로 고치지 않습니다.
- `CompanyProfile` (`profile.ts`): 사용자가 입력한 기업정보. 금액 단위를 필드명에 붙입니다(`revenueKrw`, `exportUsdLastYear`).
- 판정 결과 (`results.ts`): `EligibilityResult`(조건별 결과·그룹·일부 항목 조건·확인 필요 수·직접 확인 수·데이터 상태), `FitScoreResult`(항목별 반영값·가중치·기여·가점 보정·확인 필요 가점), `OpportunityCostResult`(서류 수·최대 자기부담·정산 방식·마감 여유), `ExportStageDiagnosis`(수출단계·기준 구간·측정 기간 안내·권장 지원 단계). 모두 근거·기준일·버전을 포함하며 자료가 부족하면 **객체 자체가 `null`**입니다.
- 직접 확인 (`selfCheck.ts`), 커뮤니티 (`community.ts`: 게시판·글·댓글·후기 문항·후기 요약).

백엔드 모델(`backend/programs/models.py`)은 revision_01까지의 필드를 snake_case로 가지며(revision_02 필드는 아직 없음, REVISION_02 §12), 직렬화(`serializers.py`)가 프론트엔드와 같은 camelCase JSON을 만듭니다. 자격 규칙·필요서류는 `eligibility_rules_verified` / `required_docs_verified`가 켜져 있을 때만 목록으로 내보내고, 아니면 `null`입니다.

## 4. 공고 데이터 접근 경계

`frontend/src/repositories/`

```ts
interface ProgramRepository {
  source:
    | { kind: 'not-connected' }
    | { kind: 'api'; baseUrl: string }
    | { kind: 'test-dataset'; asOf; datasetVersion; programCount; announcementCount; dataState }
  list(query): Promise<{ items: Program[]; total: number | null }>
  getById(id): Promise<Program | null>
  getByIds(ids): Promise<Program[]>
}
```

- 선택 순서(`repositories/index.ts`): `VITE_API_BASE_URL`이 있으면 API → `VITE_DATA_SOURCE=test-dataset`이면 테스트 데이터셋 → 그 외 빈 저장소. 테스트 실행 환경은 `vitest.config.ts`에서 두 값을 비워 빈 저장소를 씁니다.
- `StaticProgramRepository`: 테스트 데이터셋 JSON을 **동적 import**(별도 청크)로 읽고, 세부 분야에서 지원 단계·관심 분야를 채운 뒤 브라우저에서 검색·필터·정렬합니다. 지역 필터는 전국 대상 공고도 함께 통과시키고, `total`은 실제 결과 건수입니다. 마감 임박순은 이미 마감된 공고를 뒤에 둡니다.
- 화면 공통 계산은 `composables/useProgramEvaluations.ts`가 전체 공고를 한 번 읽어 `lib/engine/evaluateAll.ts`로 자격·적합도·기회비용을 계산합니다(필터와 무관, 직접 확인 답 반영).
- 그 밖의 경계: `CommunityRepository`(빈 구현, 서버 연결 시 HTTP 구현), `ViewEventSink`(조회 집계, 지금은 저장하지 않음).
- 기본 구현 `EmptyProgramRepository`: 항상 `items: []`, `total: null`. **실제 데이터 부재**를 뜻하며 샘플이 아닙니다. 건수 `null`은 화면에 `-`로 나오며 "0건 매칭"으로 표시하지 않습니다.
- `HttpProgramRepository`: `VITE_API_BASE_URL`이 있을 때 사용. Django `GET /programs/`(DRF 페이지네이션 `{count, results}`)와 `GET /programs/{id}/`를 호출합니다.
- 화면은 저장소 인터페이스만 사용하므로, 공고 수집 파이프라인이 준비되면 API만 연결하면 됩니다.

## 5. 판정 엔진

`frontend/src/lib/engine/` (백엔드 `backend/matching/engine.py`는 아직 revision_01 계약이며, revision_02 규칙은 `docs/contracts/engine-cases.json`으로 맞춘다)

| 함수 | 버전 | 결과가 `null`인 조건 |
|---|---|---|
| `evaluateEligibility(profile, program, { asOf, selfChecks })` | `eligibility-0.2.0` | 규칙이 없음, 데이터 상태(`dataState`)가 없음 |
| `evaluateFit(profile, program, context)` | `fit-0.2.0`, 기준 `fit-v0`(가설) | 반영할 수 있는 항목이 2개 미만 |
| `evaluateOpportunityCost(program, { ownedDocumentTypes, today })` | `opportunity-0.2.0` | 데이터 상태·검증일이 없거나 근거 있는 값이 하나도 없음 |
| `diagnoseExportStage(profile, { asOf })` | `export-stage-v1` | 최근 1년 수출액 미입력 |

- **자격 판정 v2:** 필드별로 '기준에 해당하는지'를 본 뒤 필수 조건은 해당 → 충족, 제외 조건은 해당 → `제외 대상 해당`. 같은 그룹 OR, 다른 그룹 AND, `scope`가 있는 조건은 전체 판정에서 뺍니다. 미충족 그룹이나 해당하는 제외 조건이 있으면 `신청 불가`, 확인 필요가 있으면 `확인 필요`, 모두 충족이면 `신청 가능`.
- 확인 필요 이유: `missing-input`(입력 화면 링크) · `not-automatable` · `period-mismatch` · `ambiguous` · `exception`. 뒤의 넷은 공고별 직접 확인을 받을 수 있습니다. `애매` 규칙과 예외 문구가 있는 규칙은 그 규칙만으로 `신청 불가`를 만들지 않습니다.
- 공통 확인 5가지(휴·폐업·체납·신용·제재·재무 상태)는 `commonCheckKey`가 붙은 제외 조건에 REVISION_02 §6.9의 순서(공고별 답 우선 → 해당 있음 → 예외·재무 → 모두 해당 없음 → 덮이지 않는 항목 → 모르겠음)로 적용합니다. 재무 수치는 입력받지 않습니다.
- 업력·수출액·매출액의 기준 연도는 공고일·데이터 기준일로 정하며, 오늘 날짜로 대신하지 않습니다. 원화 수출액 기준은 환산하지 않습니다.
- **수출단계 v1:** 중소벤처기업부 공고 제2025-634호 「2026년 중소기업 수출지원사업 통합공고」 3쪽 수출바우처 지원트랙(전년도 수출액 1,000불 / 10만불 / 100만불 / 500만불 경계). 원문 문구·쪽·확인일을 `ACTIVE_EXPORT_STAGE_CRITERIA.source`에 둡니다(사본 주소).
- **적합도 v0 (시험용):** 관심분야 일치도 0.40 · 단계 일치도 0.30 · 내용 유사도(글자 2-gram TF-IDF 백분위) 0.30, 가점·감점 보정 ±10. 신청 불가 공고는 계산하지 않습니다. 재무 변수와 재무 군집은 쓰지 않습니다. 비교용 `fit-v0-equal`은 Precision@5 검증에만 씁니다.
- 분야 체계(`constants/categories.ts`): 세부 분야 → 지원 단계 `category-phase-v0`, 수출단계 × 지원 단계 가중치 `stage-phase-v0`(◎ 1 · ○ 0.5 · · 0.2). 모두 검증 전 가설입니다.
- 맞춤 추천 정렬(`compareRecommended`): 신청 가능 → 확인 필요 → 신청 불가 → 적합도 높은 순 → 마감 빠른 순 → ID.
- 둘러보기(`lib/programHighlights.ts`): 새로 올라온 공고(게시일 기준 데이터 기준일 이전 30일, 접수중·예정, 같은 원공고·그룹 1줄, 최대 10)와 많이 본 공고(최근 7일 순 방문자, 하루 1회, 10명 이상 공고 3개 이상일 때만). 많이 본 공고는 서버 저장소가 없어 아직 집계하지 않습니다.

## 6. 사용자 데이터와 개인정보

| 저장 키 | 저장소 | 내용 |
|---|---|---|
| `export-support-matching:profile:v1` | localStorage | 기업 프로필(사업자등록번호 제외). 첫 버전부터 같은 키·형식 |
| `esm.applicationRecords.v1` | localStorage | 관심·준비 중·신청완료 관리 기록(상태, 상태 이력, 메모, 사용자가 입력한 업무 날짜) |
| `esm.compareSelection.v1` | sessionStorage | 공고 비교 선택(최대 4개, 순서 유지) |
| `esm.selfChecks.v1` | localStorage | 직접 확인 답(공통 확인 5가지, 공고별 조건 답). 서버로 보내지 않으며 `직접 확인 모두 지우기`로 지운다 |

- 계정·DB가 없으므로 기업정보와 관리 기록은 **이 브라우저에만** 저장하고 서버로 보내지 않는다. 로그인 여부와 관계없이 같다. 로그아웃해도 지우지 않는다.
- **사업자등록번호는 저장하지 않는다.** 형식(숫자 10자리)만 확인하고 현재 화면 세션에서만 유지한다.
- 관리 기록은 실제 공고와 연결될 때만 생긴다. 상태를 바꾼 시각만 시스템 시각으로 남기고, 신청일·발표일 같은 업무 날짜는 사용자가 입력한 값만 저장한다. 같은 공고의 기록을 합칠 때는 더 진행된 상태를 현재 상태로 두고 모든 이력·메모를 보존한다(`mergeRecords`).
- 이전 버전에는 관리 기록·비교 선택을 저장한 키가 없었으므로 옮겨 온 데이터는 없다. 앞으로 형식을 바꿀 때는 원본 키를 지우지 않고 복사·병합한다.
- 서류 원본은 업로드·저장하지 않는다(파일 저장소 미연결).
- 프로필 상태는 `입력 전 / 입력 중 / 입력 완료`이며 이는 입력 진행 상태일 뿐 신청 자격 판정이 아니다.

## 6-1. 로그인

| 구성 | 파일 |
|---|---|
| 서버 순수 함수 (자격 증명 비교, 토큰 서명·검증, 쿠키) | `frontend/server/auth/core.ts` |
| API 핸들러 (Web `Request` → `Response`) | `frontend/server/auth/handlers.ts` |
| Vercel 서버 함수 (`export default { fetch }`) | `frontend/api/auth/[action].ts` |
| 개발·미리보기 서버 연결 (Vite 플러그인) | `frontend/server/devAuthPlugin.ts` |
| 브라우저 상태 (`unknown` / `authenticated` / `anonymous`) | `frontend/src/stores/authStore.ts` |
| 로그인 후 이동 주소 검사 | `frontend/src/lib/redirect.ts` |

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/signup`(501).
- 아이디·비밀번호는 SHA-256 값을 `timingSafeEqual`로 비교하며 아이디는 대소문자를 구분한다. 실패 시 어느 쪽이 틀렸는지 알리지 않는다.
- 세션은 `{ sub, iat, exp }`를 HMAC-SHA256으로 서명한 토큰을 `esm_session` 쿠키(`HttpOnly`, `SameSite=Lax`, `Path=/`, 12시간, 배포에서 `Secure`)에 담는다. 서명·만료·주체가 맞지 않으면 비로그인이다.
- 브라우저 저장소에는 로그인 표시를 저장하지 않는다. 앱 시작 시 `/api/auth/me`로 한 번 확인한 뒤 `router.beforeEach`가 진행한다.
- 환경변수(`DEMO_LOGIN_ID`, `DEMO_LOGIN_PASSWORD`, `AUTH_SESSION_SECRET`)가 없으면 로그인 API는 503이며 코드 안의 기본값으로 대신하지 않는다. `VITE_` 접두사를 붙이지 않아 번들에 포함되지 않는다.
- 회원가입은 회원 정보를 저장할 서버 DB가 생기면 같은 `redirect` 규칙으로 연결한다.

## 7. 화면 공통 컴포넌트

`frontend/src/components/`

- 레이아웃: `AppSidebar`·`SidebarNav`(주 메뉴 4개), `SectionNav`(화면 내 하위 메뉴, 마이페이지 로그아웃), `AppHeader`(로그인 버튼·프로필 원형), `MobileNavDrawer`, `PageHeader`(제목·한 줄 설명·하위 메뉴), `BrandLink`
- 표시: `DataValue`(결측 → `-`), `InfoList`/`InfoRow`, `StatTile`, `StatusBadge`(색 + 글자 + 아이콘), `EmptyState`, `NoticeBanner`
- 동작: `ActionButton`(비활성 시 `aria-disabled` + 이유 연결), `DisabledReason`, `TabNav`(방향키 이동), `SegmentedControl`, `AppModal`(포커스 가두기·Esc 닫기)
- 도메인: 단계 폼(`diagnose/steps/*`, `StepProgress`), 필터(`ProgramFilters`), 공고 카드(`ProgramCard`)·추천 카드(`RecommendationCard`) — 실제 공고가 있을 때만 렌더링, 비교 영역(`CompareSection` + `CompareTable`, 선택은 `useCompareSelection`), 캘린더(`MonthCalendar`, 일정은 `lib/calendarEvents.ts`), 관리 기록(`mypage/*Panel`, `ApplicationRecordTable`, 상태 정의는 `constants/applicationStatus.ts`)
- revision_02: `DataSourceNotice`(테스트 데이터 출처·기준일), `DraftTag`(초안 기준), `CategoryChips`, `ProgramHighlights`(둘러보기), `CommonChecksPanel`(공통 확인 사항), `EligibilityConditions`·`ConditionItem`·`SelfCheckControl`(조건별 판정·직접 확인), `FitBreakdownTable`(적합도 계산 근거), `DocumentChecklist`, `OpportunityCostGrid`, `ProgramReviewsSection`(참여 후기), `CompareDock`(하단 비교 바), `diagnose/ExportStageCriteriaNote`, `community/CommunityPostList`
- 디자인 토큰: `frontend/src/styles/tokens.css` (색·간격·반경·그림자·타이포). 브랜드 색은 채움·아이콘에 쓰고, 작은 글자·흰 글자 버튼에는 대비 4.5:1 이상인 `*-strong` 색을 쓴다.

## 8. 공고 데이터를 연결할 때 할 일

1. 정답 세트를 검수(`review_status` 확인·수정·추가)하고 원문 URL을 `source_urls.csv`에 적은 뒤 `tools/dataset/build_test_dataset.py`로 JSON을 다시 만듭니다(`check_dataset_fresh.py`로 확인). 검수가 끝난 공고는 `dataState`가 `reviewed`·`verified`가 됩니다.
2. PostgreSQL을 연결해 `python manage.py migrate`를 실행하고, 검증된 공고만 저장합니다.
3. 프론트엔드 배포 환경변수 `VITE_API_BASE_URL`에 API 주소를 넣습니다.
4. 적합도 기준은 사람 평가(Precision@5)로 `fit-v0`·`fit-v0-equal`을 비교해 확정한 뒤 `status: 'verified'`로 바꿉니다.
5. 관리 기록(`stores/applicationStore.ts`)과 서류함은 계정 기능이 생기면 서버 저장으로 옮깁니다. 이때도 브라우저의 기존 키는 지우지 않고 복사·병합합니다.
