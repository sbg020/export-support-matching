# 설계 안내

이 문서는 공고 데이터를 연결하거나 판정 기능을 구현할 개발자를 위한 안내입니다.

## 1. 기본 원칙

1. **신청 자격과 적합도는 분리합니다.** 설명 순서는 `실제 신청 자격 → 적합도 → 준비 부담/기회비용`입니다.
2. **근거 없이 판정·추정하지 않습니다.** 공고 원문 근거(문장·쪽)나 데이터 상태, 규칙·기준 버전이 없으면 결과는 `null`이고 화면에는 `-`입니다. 적합도에는 계산 기준의 상태(`시험용 기준 v0 · 검증 전`)를 항상 함께 표시합니다. REVISION_04에서 테스트 데이터셋과 `초안 기준` 표시를 지웠으므로 지금 사용자 화면에는 공고가 없습니다.
3. **결측은 `null`입니다.** `''`, `0`, 오늘 날짜, 임의 URL을 결측 대신 저장하지 않습니다. 숫자 `0`과 `false`는 유효한 값입니다(예: 수출액 `0 USD`).
4. **가상 데이터를 만들지 않습니다.** 빈 배열은 빈 상태 컴포넌트로 보여 주며, 샘플 공고·회사·일정을 채우지 않습니다.

## 2. 메뉴와 경로

화면은 상단 한 줄 헤더(로고 · 주 메뉴 5개 · 로그인/프로필)와 본문으로 구성한다(REVISION_03, 왼쪽 사이드바 없음). 헤더의 로고와 프로필은 본문과 같은 최대 너비(`--content-max`)·좌우 여백(`--page-gutter`)에 맞춘다. 메뉴 정의는 `frontend/src/constants/navigation.ts`의 `NAV_SECTIONS` 한 곳에 있고, 선택 상태는 라우트의 `meta.section`으로 정한다. 주 메뉴를 누르면 그 섹션의 첫 하위 화면이 열린다.

- 데스크톱(992px 이상, 마우스): 주 메뉴에 마우스를 올리거나 키보드 포커스가 들어오면 다섯 섹션의 하위 메뉴가 각 주 메뉴 아래에 한꺼번에 펼쳐진다(`TopNav`). `Esc`(포커스는 그 주 메뉴로), 헤더·패널을 벗어나고 150ms 뒤, 화면 이동 시 닫힌다. 프로필 팝업과 동시에 열리지 않는다.
- 991px 이하와 터치 기기: 헤더의 메뉴 버튼으로 여는 서랍 메뉴(`MobileNavDrawer` + `SidebarNav`, 아이콘 없음).
- 각 화면 제목 아래 `SectionNav`에 현재 섹션의 하위 메뉴를 보여 준다.

| 주 메뉴 (순서) | 하위 메뉴 | 경로 | 이름 | 로그인 |
|---|---|---|---|---|
| 0. 서비스 소개 | 서비스 소개 (메인 랜딩페이지, REVISION_05) | `/` (관리자는 `/admin`으로 이동) | `home` | 불필요 |
| (로그인) | 로그인 / 회원가입 탭 | `/login` (`?mode=signup`, `?redirect=`) | `login` | - |
| (프로필 팝업, 섹션 없음) | 기업 프로필 (기업정보 6단계 입력·저장) | `/profile` (`?step=1~6`) | `company-profile` | 불필요 |
| 2. 기업 맞춤 지원사업 | 맞춤 추천 (하위 메뉴 1개, REVISION_04) | `/programs/recommended` (`?tab=eligible\|needs-check\|ineligible`) | `programs-recommended` | 불필요 |
| 3. 전체 지원사업 | 전체 공고 (둘러보기, 하단 비교 영역 `#compare`) | `/programs` (필터 `q`, `status`, `stage`, `cat`, `agency`, `region`, `method`, `sort`, 비교 `compare`) | `programs` | 불필요 |
| | 공고 달력 | `/programs/calendar` | `programs-calendar` | 불필요 |
| | (하위 메뉴 아님) 공고 상세 | `/programs/:id` (`?from=recommended\|calendar\|manage`, 예전 `mypage`도 받음) | `program-detail` | 불필요 |
| 4. 지원사업 관리 | 나의 사업 관리 (관심·준비 중·신청완료, REVISION_05에서 이름 변경) | `/manage/programs` (`?tab=interested\|preparing\|applied`) | `manage-programs` | 필요 |
| | 서류함 | `/manage/documents` | `manage-documents` | 필요 |
| 5. 커뮤니티 | 지원사업 후기 | `/community/reviews` (`q`, `scope`, `sort`, `cat`, `program`, `page`) | `community-reviews` | 읽기 불필요 |
| | 지원사업 정보방 | `/community/info` (같은 쿼리) | `community-info` | 읽기 불필요 |
| | (하위 메뉴 아님) 글쓰기 | `/community/:board(reviews\|info)/write` | `community-write` | 필요 |
| | (하위 메뉴 아님) 글 보기 | `/community/:board(reviews\|info)/:postId` | `community-post` | 불필요 |

내부 섹션 키는 `intro`·`find`·`programs`·`manage`·`community`이다(REVISION_05: 수출 로드맵 `roadmap` 삭제, 서비스 소개 `intro` 추가)(`find`는 화면 이름만 `기업 맞춤 지원사업`으로 바뀌었다). 기업 진단 화면(`diagnose-result`)은 REVISION_04에서 없앴고, 수출단계·다음 단계 조건·기준 안내와 `판정 대상 공고` 수는 수출 로드맵에서 본다.

### 관리자 영역 (REVISION_04)

관리자 메뉴는 사용자 메뉴(`NAV_SECTIONS`)와 따로 `constants/adminNavigation.ts`의 `ADMIN_NAV_ITEMS`에 정의한다. 사용자 헤더·서랍·하위 메뉴 패널에는 관리자 항목이 나오지 않는다. 관리자 경로의 `meta`는 `{ title, layout: 'admin', adminMenu, requiresAdmin: true }`이고, `App.vue`는 `layout: 'admin'`이면 `AdminHeader`(로고 · 관리자 메뉴 6개 · `사용자 화면 보기` · 프로필)를 쓴다. 991px 이하와 터치 기기는 `MobileNavDrawer`(`variant="admin"`, 관리자 메뉴 6개 + `사용자 화면 보기`). 탭 제목은 `<제목> | 관리자 | 수출지원사업 매칭`.

| 화면 | 경로 | 이름 |
|---|---|---|
| 관리자 홈 | `/admin` | `admin-home` |
| 기업마당 API 수집 | `/admin/bizinfo` | `admin-bizinfo` |
| KOTRA CSV 업로드 | `/admin/kotra` | `admin-kotra` |
| 공고 검수 | `/admin/review` (`?id=`) | `admin-review` |
| 공고 관리 | `/admin/notices` (`?source=`, `?status=`, `?q=`, `?page=`, 정답세트 일괄 반영 `#bulk`) | `admin-notices` |
| 기준·설정 | `/admin/settings` | `admin-settings` |

로그인·로그아웃 이동 규칙은 `router/index.ts`의 순수 함수 `authNavigationTarget`과 `lib/redirect.ts`의 `afterLoginPath`에 있다.

- 로그인이 필요한 화면·관리자 화면을 비로그인으로 열면 `/login?redirect=<그 화면>`으로 보낸다. 로그인하면 안전한 redirect(같은 사이트의 앱 경로, 로그인 화면 제외)로, 없거나 거부되면 기업 회원은 `/roadmap`, 관리자는 `/admin`으로 간다.
- 관리자가 아닌 계정이 `/admin/*`을 열면 `/programs/recommended`로 보내고 토스트 `관리자 계정만 볼 수 있는 화면입니다.`를 띄운다(`isAdminDenied`). 관리자가 아닌 계정의 로그인 redirect가 `/admin/*`이면 거부한다.
- 관리자는 사용자 화면도 열 수 있다. 사용자 화면에서 관리자의 프로필 팝업은 `관리자 홈`·`로그아웃`이다.
- 헤더 `로그인` 버튼과 홈의 `추천받기`(비로그인)는 redirect를 붙이지 않는다. 로그인 상태에서 `/`를 열면 서비스 소개를 그대로 보여 주고(관리자는 `/admin`), `/login`을 열면 redirect 또는 각 계정의 첫 화면으로 간다.
- 로그아웃(프로필 팝업)은 서버 세션만 끝내고 `/`로 간다. 이 기기에 저장한 값은 지우지 않는다.

기존 주소는 query·hash를 유지한 채 새 위치로 보낸다(`router/index.ts`의 `moved` 함수).

| 기존 주소 | 새 주소 |
|---|---|
| `/programs/compare?ids=…` | `/programs?compare=…#compare` |
| `/diagnose/result` | `/programs/recommended` (REVISION_04·05) |
| `/roadmap` | `/programs/recommended` (REVISION_05, 수출 로드맵 삭제) |
| `/diagnose` · `/diagnose/input` | `/profile` (`?step=` 유지) |
| `/mypage` · `/mypage/profile` | `/profile` |
| `/mypage/programs` | `/manage/programs` |
| `/mypage/documents` | `/manage/documents` |
| `/mypage/saved` · `/mypage/preparation` · `/mypage/history` | `/manage/programs?tab=interested` · `preparing` · `applied` |
| `/mypage/calendar` | `/programs/calendar` |
| `/manage` | `/manage/programs` |
| `/community` | `/community/reviews` |

Vue Router history 모드이므로 배포 환경에서는 `/api/`를 제외한 모든 경로를 `index.html`로 되돌리는 SPA fallback이 필요하다(`frontend/vercel.json`).

## 3. 데이터 모델

타입 정의: `frontend/src/types/`

- `Program` (`program.ts`): 공고(세부사업이 있으면 세부사업 1개, `parentId`·`subProgramName`). 원문 파일(`sourceFile`), 접수기간·메모, 데이터 기준일(`receptionStatusAsOf`), 주관·수행·기관 유형, 지역(+시·군·구), 15개 세부 분야(`supportCategories`, C01~C15)와 파생 지원 단계(`supportPhases`), 지원방식(+원문 표현), 지원금·총사업비 한도·금액 메모, 자기부담, 정산 방식(`settlement`), 대상 수출단계, 자격 규칙·서류·가점(`bonusItems`), 그룹(`groupKey`·`relatedProgramIds`), 데이터 상태(`dataState`: `draft`·`reviewed`·`verified`). `stage`는 `@deprecated`. 확인되지 않은 필드는 `null`. 배열 필드의 `null`은 "확인 전", `[]`는 "원문상 해당 없음 확인".
- `EligibilityRule` (v2): 정답 세트 `rules` 시트의 필드 이름을 그대로 씁니다. `kind`(필수·제외), `group`(같은 그룹 OR, 다른 그룹 AND), `scope`(일부 지원 항목), `field`·`op`·`value`·`unit`·`basis`, `certainty`(명확·애매), `commonCheckKey`(공통 확인 5가지)·`commonCheckUncovered`, `exceptionText`, 원문 근거(`source`: 문장·쪽).
- 정답세트 형식 (`answerSet.ts`): 관리자 `공고 관리`의 정답세트 xlsx 검사(`lib/admin/answerSet.ts`)가 쓰는 시트·행 형식. 테스트 데이터셋 JSON(`src/data/test-dataset*.json`)과 `dataset.ts`는 REVISION_04에서 지웠습니다.
- 관리자 (`admin.ts`): `AdminNoticeSummary`·`AdminDashboard`·`CollectionSettings`·`CollectionRun`·`UploadRecord`·`NoticeVersion`·`ReviewItem`·`DuplicateGroup`·`CriteriaSettings` (REVISION_04 §13.1).
- `CompanyProfile` (`profile.ts`): 사용자가 입력한 기업정보. 금액 단위를 필드명에 붙입니다(`revenueKrw`, `exportUsdLastYear`).
- 판정 결과 (`results.ts`): `EligibilityResult`(조건별 결과·그룹·일부 항목 조건·확인 필요 수·직접 확인 수·데이터 상태), `FitScoreResult`(항목별 반영값·가중치·기여·가점 보정·확인 필요 가점), `OpportunityCostResult`(서류 수·최대 자기부담·정산 방식·마감 여유), `ExportStageDiagnosis`(수출단계·기준 구간·측정 기간 안내·권장 지원 단계). 모두 근거·기준일·버전을 포함하며 자료가 부족하면 **객체 자체가 `null`**입니다.
- 직접 확인 (`selfCheck.ts`), 커뮤니티 (`community.ts`: 게시판·글·댓글·후기 문항·후기 요약).

백엔드 모델(`backend/programs/models.py`)은 revision_01까지의 필드를 snake_case로 가지며(revision_02 필드는 아직 없음, REVISION_02 §12), 직렬화(`serializers.py`)가 프론트엔드와 같은 camelCase JSON을 만듭니다. 자격 규칙·필요서류는 `eligibility_rules_verified` / `required_docs_verified`가 켜져 있을 때만 목록으로 내보내고, 아니면 `null`입니다.

## 4. 공고 데이터 접근 경계

> **REVISION_05:** 기본 저장소는 게시 스냅샷(`PublishedProgramRepository`, `src/data/published/notices.json`, 데이터 기준일 `PUBLISHED_AS_OF = 2026-11-13`)이다. `VITE_API_BASE_URL`이 있으면 API, 테스트(`VITE_PUBLISHED_SNAPSHOT=off`)는 빈 저장소. 관리자 화면은 `SnapshotAdminRepository`(게시·검수 스냅샷 읽기 전용). 스냅샷은 backend `export_public_snapshot`이 만든다. 전체 흐름은 [revisions/revision_05_inventory.md](revisions/revision_05_inventory.md) §2.

`frontend/src/repositories/`

```ts
interface ProgramRepository {
  source: { kind: 'not-connected' } | { kind: 'api'; baseUrl: string }
  list(query): Promise<{ items: Program[]; total: number | null }>
  getById(id): Promise<Program | null>
  getByIds(ids): Promise<Program[]>
}
```

- 선택(`repositories/index.ts`): `VITE_API_BASE_URL`이 있으면 API, 없으면 빈 저장소. 테스트 데이터셋 분기(`VITE_DATA_SOURCE`)와 `StaticProgramRepository`는 REVISION_04에서 지웠습니다. 테스트 실행 환경은 `vitest.config.ts`에서 API 주소를 비워 빈 저장소를 씁니다.
- `dataBasisDate(source)`: 접수 상태·남은 일수·업력 계산에 쓰는 데이터 기준일. 지금은 항상 `null`이고(시스템 날짜로 대신하지 않음), 다음 개정에서 API 응답의 `meta.asOf`를 돌려준다.
- 브라우저 검색·필터·정렬 순수 함수(`filterPrograms`, `sortPrograms`, `matchesKeyword`, `compareProgramIds`, `normalizeProgram`)는 `lib/programQuery.ts`에 있다. 지역 필터는 전국 대상 공고도 함께 통과시키고, 마감 임박순은 이미 마감된 공고를 뒤에 둡니다. 테스트는 `__tests__/fixtures.ts`의 테스트 전용 공고를 쓰며 앱 번들에는 들어가지 않습니다.
- 화면 공통 계산은 `composables/useProgramEvaluations.ts`가 전체 공고를 한 번 읽어 `lib/engine/evaluateAll.ts`로 자격·적합도·기회비용을 계산합니다(필터와 무관, 직접 확인 답 반영).
- 그 밖의 경계: `CommunityRepository`(빈 구현, 서버 연결 시 HTTP 구현), `ViewEventSink`(조회 집계, 지금은 저장하지 않음).
- 기본 구현 `EmptyProgramRepository`: 항상 `items: []`, `total: null`. **실제 데이터 부재**를 뜻하며 샘플이 아닙니다. 건수 `null`은 화면에 `-`로 나오며 "0건 매칭"으로 표시하지 않습니다.
- `HttpProgramRepository`: `VITE_API_BASE_URL`이 있을 때 사용. Django `GET /programs/`(DRF 페이지네이션 `{count, results}`)와 `GET /programs/{id}/`를 호출합니다.
- 화면은 저장소 인터페이스만 사용하므로, 공고 수집 파이프라인이 준비되면 API만 연결하면 됩니다.

## 5. 판정 엔진

> **REVISION_05:** 신청 자격은 `lib/engine/eligibilityV3.ts`(정답세트 판정식, 3값 논리, `classifyTabs`로 3탭)와 같은 규칙의 Python `backend/eligibility/engine.py`가 맡는다. 적합도는 `lib/engine/fitV1.ts`(5요소, `constants/fitV1.ts`). 아래 v2·v0 설명은 기존 함수(비교·회귀용으로 남김)에 대한 것이다. 서버 함수(챗봇·공개 API)도 `eligibilityV3.ts`를 그대로 쓴다.

`frontend/src/lib/engine/` (백엔드 `backend/matching/engine.py`는 아직 revision_01 계약이며, revision_02 규칙은 `docs/contracts/engine-cases.json`으로 맞춘다)

| 함수 | 버전 | 결과가 `null`인 조건 |
|---|---|---|
| `evaluateEligibility(profile, program, { asOf, selfChecks })` | `eligibility-0.2.1` | 규칙이 없음, 데이터 상태(`dataState`)가 없음 |
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
- 맞춤 추천(`components/programs/RecommendationList.vue`, REVISION_04): 검색·필터·정렬 없이 전체 공고를 `신청 가능 · 확인 필요 · 신청 불가` 탭으로 나눈다(`?tab=`). 기본 탭은 1건 이상인 첫 탭, 모두 0건이거나 `-`이면 `신청 가능`. 탭 안 정렬은 `compareRecommended`(적합도 높은 순 → 마감 빠른 순 → ID). 자격 판정 결과가 없는 공고는 어느 탭에도 넣지 않고 건수만 안내한다. 카드의 `지원 내용` 한 줄은 `supportContentLine`(쉬운 설명 → 세부 분야 이름 2개 + `외 n개` → `-`)이다.
- (2026-11 변경) 전체 공고의 '둘러보기'는 없앴다. 새로 올라온 공고 2건은 메인 화면 '추천 결과 미리보기'(`components/home/HomePreview.vue`)에, 많이 본 공고는 전체 지원사업 정렬 '조회순'(조회 수 집계 전에는 공고 번호 순과 안내)으로 옮겼다. 계산 규칙(`lib/programHighlights.ts`): 새로 올라온 공고(게시일 기준 데이터 기준일 이전 30일, 접수중·예정, 같은 원공고·그룹 1줄, 최대 10)와 많이 본 공고(최근 7일 순 방문자, 하루 1회, 10명 이상 공고 3개 이상일 때만). 많이 본 공고는 서버 저장소가 없어 아직 집계하지 않습니다.

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
- 계정은 관리자(`DEMO_LOGIN_ID`·`DEMO_LOGIN_PASSWORD`, 아이디 `ADMIN`, 역할 `admin`)와 테스트(`TEST_LOGIN_ID`·`TEST_LOGIN_PASSWORD`, revision_03 테스트 계정, 역할 `test`) 두 개이며, 아이디·비밀번호가 둘 다 있는 계정만 쓴다. 환경변수 이름은 REVISION_04에서도 그대로다. 모든 계정을 끝까지 비교한 뒤 판정하고, 세션 주체가 설정된 계정이 아니면 무효다. `login`·`me`는 `user: { id, role }`(`admin`|`test`)을 돌려준다. 시연용 기업 계정 '이퓨쳐'(`EFUTURE_LOGIN_ID`·`EFUTURE_LOGIN_PASSWORD`, 아이디 `USER`, 역할 `test`)는 `user.profile = 'efuture'`를 함께 돌려주어 브라우저가 이퓨쳐 프로필을 넣는다.
- 브라우저(`stores/authStore.ts`)는 `'admin'` → `admin`, `'test'` → `test`, 그 밖의 값 → `member`(관리자로 보지 않음, 앞으로 회원가입 회원용)로 읽고 `isAdmin`을 내보낸다. **브라우저의 역할은 화면 이동에만 쓴다.** 지금은 관리자 데이터 API가 없어 서버에 관리자 데이터도 없다. `/api/admin/*`을 만들 때 서버 함수가 세션 주체의 역할을 다시 확인하고 관리자가 아니면 403을 돌려준다.
- 역할 `test`이면 화면이 기업 프로필·직접 확인 답을 계정 전용 키(`<기존 키>:account:<아이디>`)로 읽고 쓴다(`src/stores/accountScope.ts`). 그 키가 없을 때만 `src/data/testAccountProfile.ts` 값을 넣는다. 관리자 계정·비로그인은 기존 키를 그대로 쓴다.
- 쓸 계정이 하나도 없거나 `AUTH_SESSION_SECRET`가 없으면 로그인 API는 503이며 코드 안의 기본값으로 대신하지 않는다. `VITE_` 접두사를 붙이지 않아 번들에 포함되지 않는다.
- 회원가입은 회원 정보를 저장할 서버 DB가 생기면 같은 `redirect` 규칙으로 연결한다.

## 7. 화면 공통 컴포넌트

`frontend/src/components/`

- 레이아웃: `AppHeader`(로고 · `TopNav` · `ProfileMenu`, 하위 메뉴 패널과 프로필 팝업 중 하나만 열림), `AdminHeader` + `AdminNav`(관리자 화면, REVISION_04), `TopNav`(데스크톱 주 메뉴 5개와 하위 메뉴 패널), `ProfileMenu`(비로그인 `로그인` 버튼 / 로그인 프로필 버튼 → `기업 프로필`·`로그아웃` 팝업), `MobileNavDrawer` + `SidebarNav`(991px 이하 서랍 메뉴), `SectionNav`(화면 내 하위 메뉴), `PageHeader`(제목·한 줄 설명·하위 메뉴), `BrandLink`
- 표시: `DataValue`(결측 → `-`), `InfoList`/`InfoRow`, `StatTile`, `StatusBadge`(색 + 글자 + 아이콘), `EmptyState`, `NoticeBanner`
- 동작: `ActionButton`(비활성 시 `aria-disabled` + 이유 연결), `DisabledReason`, `TabNav`(방향키 이동), `SegmentedControl`, `AppModal`(포커스 가두기·Esc 닫기)
- 도메인: 단계 폼(`diagnose/steps/*`, `StepProgress`), 필터(`ProgramFilters`), 공고 카드(`ProgramCard`)·추천 카드(`RecommendationCard`) — 실제 공고가 있을 때만 렌더링, 비교 영역(`CompareSection` + `CompareTable`, 선택은 `useCompareSelection`), 캘린더(`MonthCalendar`, 일정은 `lib/calendarEvents.ts`), 관리 기록(`mypage/*Panel`, `ApplicationRecordTable`, 상태 정의는 `constants/applicationStatus.ts`. 폴더 이름 `views/mypage`·`components/mypage`는 그대로 두고 화면 이름만 `지원사업 관리`)
- revision_02: `CategoryChips`, `ProgramHighlights`(둘러보기), `CommonChecksPanel`(공통 확인 사항), `EligibilityConditions`·`ConditionItem`·`SelfCheckControl`(조건별 판정·직접 확인), `FitBreakdownTable`(적합도 계산 근거), `DocumentChecklist`, `OpportunityCostGrid`, `ProgramReviewsSection`(참여 후기), `CompareDock`(하단 비교 바), `diagnose/ExportStageCriteriaNote`, `community/CommunityPostList` (REVISION_04에서 `DataSourceNotice`·`DraftTag`·`ProfileSummary`를 지웠다)
- revision_04: `RecommendationList`(맞춤 추천 탭·목록), 관리자 공통 `admin/StoreButton`(저장이 필요한 비활성 버튼 + 이유), `admin/AdminTable`(가로 스크롤 표), `admin/AdminFilePicker`(끌어다 놓기·파일 선택), `admin/AnswerSetSection`(정답세트 검사)
- 디자인 토큰: `frontend/src/styles/tokens.css` (색·간격·반경·그림자·타이포). 브랜드 색은 채움·아이콘에 쓰고, 작은 글자·흰 글자 버튼에는 대비 4.5:1 이상인 `*-strong` 색을 쓴다.

## 7-1. 관리자 데이터 경계 (REVISION_04)

`frontend/src/repositories/admin/` — `AdminRepository`(인터페이스), `EmptyAdminRepository`(지금 구현), `index.ts`.

- `source: { kind: 'not-connected' } | { kind: 'api'; baseUrl }`, `canWrite`.
- 읽기: `getDashboard`, `getCollectionSettings`, `listCollectionRuns`, `listUploads(kind)`, `listReviewQueue`, `getReviewItem(id)`, `listNotices(query)`, `listDuplicateGroups`, `listNoticeVersions(id)`, `getCriteriaSettings`.
- 쓰기: `runCollection`, `saveCollectionSettings`, `applyUpload`, `revertUpload`, `approve`, `reject`, `suspend`, `republish`, `merge`, `keepSeparate`, `saveCriteriaSettings`.
- `EmptyAdminRepository`는 `canWrite: false`이고 읽기는 수치 `null`·목록 `[]`다. 화면은 `canWrite`가 거짓이면 저장 버튼을 비활성 + 이유로 둔다. 쓰기 메서드를 부르면 `Error('not-connected')`를 던지며 성공을 흉내 내지 않는다.
- 브라우저 안에서 끝나는 동작은 실제로 동작한다: KOTRA CSV 양식(UTF-8 BOM + 머리글) 내려받기, CSV 읽기(UTF-8 → 깨지면 EUC-KR)와 행 검사(`lib/admin/kotraCsv.ts`의 `validateKotraCsv`), 정답세트 xlsx 읽기(`lib/admin/readWorkbook.ts`, SheetJS 공식 배포본 0.20.3을 관리자 화면에서만 지연 로드)와 검사(`lib/admin/answerSet.ts`의 `validateAnswerSet`, `tools/dataset/build_test_dataset.py` 규칙을 옮김), 가중치 합계·키워드 검증(`lib/admin/settings.ts`), 공고 관리 필터의 주소 반영.
- 사용자 화면에는 `published` 공고만 보인다(다음 개정에서 API가 지킨다).

### 관리자 API 계약 (다음 개정, 모두 관리자 세션 필요 — 서버가 역할을 확인하고 아니면 403)

| 메서드 · 경로 | 용도 |
|---|---|
| `GET /api/admin/dashboard` | 관리자 홈 |
| `GET·PUT /api/admin/bizinfo/settings` | 수집 주기·필터 |
| `POST /api/admin/bizinfo/key` | 인증키 등록(응답에 키를 돌려주지 않음, 화면에는 끝 4자리만) |
| `POST /api/admin/bizinfo/run` · `GET /api/admin/bizinfo/runs` | 지금 수집 · 수집 로그 |
| `POST /api/admin/uploads` · `GET /api/admin/uploads` · `POST /api/admin/uploads/:id/revert` | KOTRA CSV·정답세트 반영, 이력, 되돌리기 |
| `GET /api/admin/review` · `GET /api/admin/review/:id` · `POST /api/admin/review/:id/approve` · `…/reject` | 공고 검수 |
| `GET /api/admin/notices` · `POST /api/admin/notices/:id/suspend` · `…/republish` · `GET /api/admin/notices/:id/versions` | 공고 관리 |
| `GET /api/admin/duplicates` · `POST /api/admin/duplicates/:id/merge` · `…/keep` | 중복 병합 |
| `GET·PUT /api/admin/settings` | 기준·설정 |
| `GET /api/programs`, `GET /api/programs/:id` | 사용자 화면용, **게시 중 공고만**. 응답에 기준일(`meta.asOf`)을 넣어 `dataBasisDate`가 쓰게 한다 |

저장소(Vercel에 연결하는 Postgres 또는 기존 `backend/` Django + PostgreSQL)는 다음 개정에서 정한다. 예약 수집은 한국 시간 설정을 UTC로 바꿔 등록한다. 기업마당 API 필드 대응은 REVISION_04 §13.3을 따르되 구현 전 공식 안내로 다시 확인한다.

## 8. 공고 데이터를 연결할 때 할 일

1. 공고 저장소와 `/api/admin/*`·`/api/programs` 서버 함수를 만들고(위 계약), `HttpAdminRepository`를 더해 관리자 화면의 저장 버튼을 켭니다.
2. 검수 완료된 정답세트 xlsx를 관리자 `공고 관리` → `검수 완료 데이터 일괄 반영`(`#bulk`)으로 올립니다. 오류 0건일 때만 반영하며, 검수가 끝난 공고는 `게시 중`(`dataState` `reviewed`, 원문 주소·검수일이 있으면 `verified`), 검수 대기 행이 남은 공고는 `검수 대기`가 됩니다. KOTRA 공고는 `KOTRA CSV 업로드`, 기업마당 공고는 `기업마당 API 수집`으로 들어와 `공고 검수`에서 승인한 것만 게시됩니다.
3. 프론트엔드 배포 환경변수 `VITE_API_BASE_URL`에 API 주소를 넣습니다(또는 같은 도메인의 `/api/programs`를 쓰도록 저장소 선택을 바꿉니다).
4. 적합도 기준은 사람 평가(Precision@5)로 `fit-v0`·`fit-v0-equal`을 비교해 확정한 뒤 `status: 'verified'`로 바꿉니다.
5. 관리 기록(`stores/applicationStore.ts`)과 서류함은 계정 기능이 생기면 서버 저장으로 옮깁니다. 이때도 브라우저의 기존 키는 지우지 않고 복사·병합합니다.
