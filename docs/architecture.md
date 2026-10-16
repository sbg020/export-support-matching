# 설계 안내

이 문서는 공고 데이터를 연결하거나 판정 기능을 구현할 개발자를 위한 안내입니다.

## 1. 기본 원칙

1. **신청 자격과 적합도는 분리합니다.** 설명 순서는 `실제 신청 자격 → 적합도 → 준비 부담/기회비용`입니다.
2. **근거 없이 판정·추정하지 않습니다.** 공고 원문, 검증일, 규칙·기준 버전이 없으면 결과는 `null`이고 화면에는 `-`입니다.
3. **결측은 `null`입니다.** `''`, `0`, 오늘 날짜, 임의 URL을 결측 대신 저장하지 않습니다. 숫자 `0`과 `false`는 유효한 값입니다(예: 수출액 `0 USD`).
4. **가상 데이터를 만들지 않습니다.** 빈 배열은 빈 상태 컴포넌트로 보여 주며, 샘플 공고·회사·일정을 채우지 않습니다.

## 2. 메뉴와 경로

사이드바에는 주 메뉴 3개만 두고, 각 화면 제목 아래 `SectionNav`에 현재 섹션의 하위 메뉴를 보여 준다. 메뉴 정의는 `frontend/src/constants/navigation.ts` 한 곳에 있고, 선택 상태는 라우트의 `meta.section`으로 정한다.

| 섹션 | 하위 메뉴 | 경로 | 이름 | 로그인 |
|---|---|---|---|---|
| (홈) | - | `/` | `home` | 불필요 |
| (로그인) | 로그인 / 회원가입 탭 | `/login` (`?mode=signup`, `?redirect=`) | `login` | - |
| 지원사업 찾기 | 기업정보 입력·저장 | `/diagnose/input` (`?step=1~6`) | `diagnose-input` | 불필요 |
| | 기업 진단 | `/diagnose/result` | `diagnose-result` | 불필요 |
| | 맞춤 추천 | `/programs/recommended` | `programs-recommended` | 불필요 |
| 전체 지원사업 | 전체 공고 (하단 비교 영역 `#compare`) | `/programs` (필터 `q`, `status`, `stage`, `agency`, `region`, `method`, `sort`, 비교 `compare`) | `programs` | 불필요 |
| | 공고 달력 | `/programs/calendar` | `programs-calendar` | 불필요 |
| | (하위 메뉴 아님) 공고 상세 | `/programs/:id` (`?from=recommended\|calendar`) | `program-detail` | 불필요 |
| 나의 로드맵 | 수출 로드맵 | `/roadmap` | `roadmap` | 불필요 |
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

Vue Router history 모드이므로 배포 환경에서는 `/api/`를 제외한 모든 경로를 `index.html`로 되돌리는 SPA fallback이 필요하다(`frontend/vercel.json`).

## 3. 데이터 모델

타입 정의: `frontend/src/types/`

- `Program` (`program.ts`): 공고. `sourceUrl`, `sourcePublishedAt`, `verifiedAt`, `applyStart`, `applyEnd`, `ministry`, `agency`, `stage`, `supportTypes`, `maxAmountKrw`, `summaryEasy`, `eligibilityRules`, `requiredDocs` 등. 확인되지 않은 필드는 `null`. 배열 필드의 `null`은 "확인 전", `[]`는 "원문상 해당 없음 확인".
- `EligibilityRule`: 자동 비교 가능한 규칙(`company-type-in`, `hq-region-in`, `revenue-krw-max/min`, `export-usd-max/min`, `years-since-founded-max/min`)과 수동 확인 규칙(`manual`). 모든 규칙은 원문 근거(`source.quote`)를 가집니다.
- `CompanyProfile` (`profile.ts`): 사용자가 입력한 기업정보. 금액 단위를 필드명에 붙입니다(`revenueKrw`, `exportUsdLastYear`).
- 판정 결과 (`results.ts`): `EligibilityResult`, `FitScoreResult`, `OpportunityCostResult`, `ExportStageDiagnosis`. 모두 `reasons[]`, 근거, 기준일, 버전을 포함하며 자료가 부족하면 **객체 자체가 `null`**입니다.

백엔드 모델(`backend/programs/models.py`)은 같은 필드를 snake_case로 가지며, 직렬화(`serializers.py`)가 프론트엔드와 같은 camelCase JSON을 만듭니다. 자격 규칙·필요서류는 `eligibility_rules_verified` / `required_docs_verified`가 켜져 있을 때만 목록으로 내보내고, 아니면 `null`입니다.

## 4. 공고 데이터 접근 경계

`frontend/src/repositories/`

```ts
interface ProgramRepository {
  source: { kind: 'not-connected' } | { kind: 'api'; baseUrl: string }
  list(query): Promise<{ items: Program[]; total: number | null }>
  getById(id): Promise<Program | null>
  getByIds(ids): Promise<Program[]>
}
```

- 기본 구현 `EmptyProgramRepository`: 항상 `items: []`, `total: null`. **실제 데이터 부재**를 뜻하며 샘플이 아닙니다. 건수 `null`은 화면에 `-`로 나오며 "0건 매칭"으로 표시하지 않습니다.
- `HttpProgramRepository`: `VITE_API_BASE_URL`이 있을 때 사용. Django `GET /programs/`(DRF 페이지네이션 `{count, results}`)와 `GET /programs/{id}/`를 호출합니다.
- 화면은 저장소 인터페이스만 사용하므로, 공고 수집 파이프라인이 준비되면 API만 연결하면 됩니다.

## 5. 판정 엔진

`frontend/src/lib/engine/` (백엔드 `backend/matching/engine.py`도 같은 계약)

| 함수 | 결과가 `null`인 조건 |
|---|---|
| `evaluateEligibility(profile, program)` | 규칙이 없음, 원문 URL 또는 검증일이 없음 |
| `evaluateFit(profile, program, criteria)` | 검증된 적합도 기준(`ACTIVE_FIT_CRITERIA`)이 없음 — **현재 `null`** |
| `evaluateOpportunityCost(program, context)` | 검증일이 없거나 근거 있는 값이 하나도 없음 |
| `diagnoseExportStage(profile, criteria)` | 검증된 진단 기준(`ACTIVE_EXPORT_STAGE_CRITERIA`)이 없음 — **현재 `null`** |

- 입력값이 없으면 해당 조건은 `확인 필요`입니다. 하나라도 `미충족`이면 `신청 불가`, 아니고 `확인 필요`가 있으면 `확인 필요`, 모두 `충족`이면 `신청 가능`.
- 업력은 공고일(`sourcePublishedAt`) 기준이며, 공고일이 없으면 오늘 날짜로 대신하지 않고 `확인 필요`로 둡니다.
- 이전 기획의 적합도 가중치와 수출단계 임계치는 **검증되지 않은 초안**이므로 코드에 넣지 않았습니다. 검증된 기준이 마련되면 `FitCriteria`/`ExportStageCriteria` 형태로 버전·검증일·출처와 함께 등록합니다.

## 6. 사용자 데이터와 개인정보

| 저장 키 | 저장소 | 내용 |
|---|---|---|
| `export-support-matching:profile:v1` | localStorage | 기업 프로필(사업자등록번호 제외). 첫 버전부터 같은 키·형식 |
| `esm.applicationRecords.v1` | localStorage | 관심·준비 중·신청완료 관리 기록(상태, 상태 이력, 메모, 사용자가 입력한 업무 날짜) |
| `esm.compareSelection.v1` | sessionStorage | 공고 비교 선택(최대 4개, 순서 유지) |

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

- 레이아웃: `AppSidebar`·`SidebarNav`(주 메뉴 3개), `SectionNav`(화면 내 하위 메뉴, 마이페이지 로그아웃), `AppHeader`(로그인 버튼·프로필 원형), `MobileNavDrawer`, `PageHeader`(제목·한 줄 설명·하위 메뉴), `BrandLink`
- 표시: `DataValue`(결측 → `-`), `InfoList`/`InfoRow`, `StatTile`, `StatusBadge`(색 + 글자 + 아이콘), `EmptyState`, `NoticeBanner`
- 동작: `ActionButton`(비활성 시 `aria-disabled` + 이유 연결), `DisabledReason`, `TabNav`(방향키 이동), `SegmentedControl`, `AppModal`(포커스 가두기·Esc 닫기)
- 도메인: 단계 폼(`diagnose/steps/*`, `StepProgress`), 필터(`ProgramFilters`), 공고 카드(`ProgramCard`)·추천 카드(`RecommendationCard`) — 실제 공고가 있을 때만 렌더링, 비교 영역(`CompareSection` + `CompareTable`, 선택은 `useCompareSelection`), 캘린더(`MonthCalendar`, 일정은 `lib/calendarEvents.ts`), 관리 기록(`mypage/*Panel`, `ApplicationRecordTable`, 상태 정의는 `constants/applicationStatus.ts`)
- 디자인 토큰: `frontend/src/styles/tokens.css` (색·간격·반경·그림자·타이포). 브랜드 색은 채움·아이콘에 쓰고, 작은 글자·흰 글자 버튼에는 대비 4.5:1 이상인 `*-strong` 색을 쓴다.

## 8. 공고 데이터를 연결할 때 할 일

1. 공고 원문을 수집해 `Program`·`EligibilityRule`·`RequiredDocument`로 정형화하고, 사람이 원문과 대조한 뒤 `verified_at`과 `*_verified` 플래그를 채웁니다.
2. PostgreSQL을 연결해 `python manage.py migrate`를 실행하고, 검증된 공고만 저장합니다.
3. 프론트엔드 배포 환경변수 `VITE_API_BASE_URL`에 API 주소를 넣습니다.
4. 적합도·수출단계 기준은 근거와 버전을 정한 뒤 `ACTIVE_FIT_CRITERIA` / `ACTIVE_EXPORT_STAGE_CRITERIA`에 등록합니다.
5. 관리 기록(`stores/applicationStore.ts`)과 서류함은 계정 기능이 생기면 서버 저장으로 옮깁니다. 이때도 브라우저의 기존 키는 지우지 않고 복사·병합합니다.
