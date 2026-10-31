# revision_02 현황 조사 (구현 전)

> 조사일 2026-10-31 · 기준 커밋 `61599df` (main) · 작업 브랜치 `revision-02`
> [REVISION_02.md](REVISION_02.md) §2에 따라 코드를 고치기 전에 확인한 내용이다. 예상치와 다른 점은 실제 값으로 진행하고 아래에 이유를 적었다.

## 1. 정답 세트 파일

`수출 지원사업 공고문/정답세트/`에는 문서가 예상한 2개가 아니라 **3개 파일**이 있었다. 내용(안내 시트·행 수·split)을 확인해 아래처럼 정리했다.

| 원래 파일명 | 내용 | 처리 |
|---|---|---|
| `EC_정답세트_초안(1).xlsx` | 1차 초안 30건 (작성일 2026-10-29) | `EC_정답세트_초안_30건.xlsx`로 이름 변경, 커밋 |
| `EC_정답세트_초안(3).xlsx` | 2차 랜덤 30건 (작성일 2026-10-30), `inventory_150` 최신본 | `EC_정답세트_초안_랜덤30건.xlsx`로 이름 변경, 커밋 |
| `EC_정답세트_초안(2).xlsx` | **test 30건 초안** (공고 30개 모두 split `test 후보`) | 변환에 쓰지 않음. 저장소가 공개(PUBLIC)라 `.gitignore`로 제외 |

시트별 행 수(1행 한글 열 이름·2행 영문 키 제외, 데이터 행만):

| 파일 | programs 행 | 공고 수 | rules | bonuses | documents |
|---|---|---|---|---|---|
| `EC_정답세트_초안_30건.xlsx` (1차) | 35 | 30 | 268 | 63 | 254 |
| `EC_정답세트_초안_랜덤30건.xlsx` (2차) | 33 | 30 | 280 | 26 | 258 |
| 합계 | 68 | 60 | 548 | 89 | 512 |

- 문서 §2의 예상치와 **모두 같다**.
- 모든 행의 `review_status`는 `검수대기`, `author`는 `Claude (초안)`, `reviewer`는 비어 있다 → 공고 60개 모두 `dataState: 'draft'`.
- 1차·2차 공고 60개의 `inventory_150` split은 `dev-초안`·`dev-초안(파일럿)`뿐이다. `test 후보`(그룹 포함)는 없다.
- 날짜 셀은 엑셀 일련번호로 저장되어 있다(예: `46181` = 2026-06-08). `rules.basis`에도 일련번호가 1건 섞여 있다(`46054`).
- `rules.unit`에는 문서 타입에 없는 `KSIC`, `KSIC 3자리`, `HS 4단위`도 있다. `rules.op`의 `제한없음`·`-`는 각각 `no-limit`·`none`으로 바꾼다.
- 변환 전에 문서의 파생 예상치를 같은 데이터로 재현해 보았고 모두 일치했다: 접수중 42·마감 16·기간 미확인 10 / 게시일 있는 행 50, 기준일 전 30일 안 14행 / 정산 방식 `reimbursement` 25행·`mixed` 1행(P001), 23개 공고 / 최대 자기부담 4행(P001 4,500,000원, P006 1,125,000원, P009 12,000,000원, P028-01 500,000원) / 공통 확인 키 96개 규칙·35개 공고(휴·폐업 25·25, 체납 34·32, 신용 36·25, 제재 21·20, 재무 상태 6·5, 모두 제외 조건) / 예외 문구 14개 규칙·9개 공고.

## 2. Git 추적

- `수출 지원사업 공고문/`은 **추적되지 않았다**(untracked). 이력에서 지울 것은 없다.
- 폴더는 약 44 MB(PDF 149개, PNG 1개, xlsx 3개)다. `.gitignore`에 PDF·PNG와 test 30건 초안을 추가했고, `.vercelignore`에 `수출 지원사업 공고문`, `tools`, `REVISION_02.md`를 추가했다(CLI 배포가 저장소 루트를 올리므로 빠뜨리면 44 MB가 함께 올라간다).
- GitHub 저장소 `sbg020/export-support-matching`은 **공개**다. 정답 세트 xlsx의 작성자·검수자 열에는 사람 이름이 없다(`Claude (초안)`, 빈 값).

## 3. 사용처

| 대상 | 사용하는 파일 |
|---|---|
| `Program.stage` | `types/program.ts`, `lib/programDisplay.ts`(`stageText`), `components/programs/compareRows.ts`·`CompareSection.vue`, `views/programs/ProgramDetailView.vue`, 필터 경로(`repositories/programRepository.ts`·`httpProgramRepository.ts`, `composables/useProgramFilters.ts`, `views/RoadmapView.vue`의 `?stage=`), 테스트(`__tests__/fixtures.ts`·`engine.spec.ts`), 백엔드(`programs/models.py`·`serializers.py`·`views.py`·`admin.py`·`0001_initial.py`·`tests.py`) |
| `Program.supportAreas` | `types/program.ts`, `lib/engine/fit.ts`, `lib/programDisplay.ts`(`supportAreasText`), `ProgramDetailView.vue`, 테스트, 백엔드 |
| `EligibilityRule` | `types/program.ts`, `lib/engine/eligibility.ts`, 테스트(`fixtures.ts`·`engine.spec.ts`), 백엔드(`EligibilityRuleKind`, `params` JSON, `matching/engine.py`) |
| `ExportStageDiagnosis.stage` | `types/results.ts`, `lib/engine/diagnosis.ts`, `views/diagnose/DiagnoseResultView.vue`, `views/RoadmapView.vue` |
| `SupportStage` | 위 두 타입이 **같은 유니온을 함께 씀**(공고 지원분야 = 기업 수출단계). `STAGE_OPTIONS`(필터·표시), `ROADMAP_STAGES`(진단·로드맵) |
| `INTEREST_AREA_OPTIONS` | `constants/options.ts`, `lib/profile.ts`(허용 값 집합), `lib/profileDisplay.ts`, `lib/programDisplay.ts`, `lib/engine/fit.ts`, `components/diagnose/steps/StepInterests.vue` |
| `DocumentType` | `types/tracking.ts`, `types/program.ts`, `constants/options.ts`(`DOCUMENT_TYPE_OPTIONS`), `lib/engine/opportunityCost.ts`, `views/mypage/DocumentsView.vue`, 백엔드 |
| `evaluateEligibility` | `ProgramDetailView.vue`, `CompareSection.vue`, `RecommendationCard.vue`, `ProgramCard.vue`, `ProgramBrowser.vue`(상태 탭) |
| `evaluateFit` / `ACTIVE_FIT_CRITERIA` | `ProgramDetailView.vue`, `CompareSection.vue`, `RecommendationCard.vue`, `ProgramCard.vue`, `ProgramRecommendedView.vue` |
| `evaluateOpportunityCost` | `ProgramDetailView.vue`, `CompareSection.vue` (둘 다 `today: null`을 넘김) |

- `ACTIVE_FIT_CRITERIA`, `ACTIVE_EXPORT_STAGE_CRITERIA`는 `null`이라 적합도·수출단계는 지금 항상 `null`이다.
- `evaluateEligibility`는 `sourceUrl`·`verifiedAt`이 없으면 `null`이다. 정답 세트에는 둘 다 없으므로 §6.8대로 `dataState` 기준으로 바꿔야 한다.
- `recommended` 정렬은 화면·백엔드 어디에도 구현되어 있지 않다.

## 4. "공고 없음"을 전제로 한 곳

- 테스트: `__tests__/app.spec.ts` "기본 저장소는 공고 데이터 미연결 상태다", "빈 배열과 null 건수를 반환한다", "공고 목록은 가짜 카드 없이 빈 상태와 비활성 이유를 보여 준다". `revision.spec.ts`의 추천 카드 테스트는 적합도 기준이 `null`이라는 전제(`아직 계산 근거가 없습니다.`, 점수 없음)에 기대고 있다. `engine.spec.ts`의 적합도·기회비용·진단 테스트도 "기준 없음" 전제다.
- 연결 여부 판정이 곳마다 다르다: `useProgramList.sourceConnected`와 `ProgramListView`는 `source.kind === 'api'`, `CompareSection`은 `kind === 'not-connected'`.
- 화면 문구: `ProgramDetailView`의 not-found 안내("현재는 등록된 공고가 없어"), `AppliedPanel`의 `새 기록 등록` 비활성 이유("등록된 공고가 없어"), `DiagnoseResultView`·`RoadmapView`의 `공고 등록 전`·`진단 기준 확정 전` 힌트와 항상 보이는 안내, 상세의 적합도 안내 배너(항상 표시).
- 주의: Vite는 `.env.local`을 테스트 모드에서도 읽는다. 문서 §13.2대로 `frontend/.env.local`에 `VITE_DATA_SOURCE=test-dataset`을 넣으면 테스트 기본값이 바뀌므로, `vitest.config.ts`에서 테스트 환경의 데이터 소스를 비운다.

## 5. 프로필 직렬화

- 저장 키 `export-support-matching:profile:v1`(localStorage), `{ version: 1, profile, meta }`.
- 저장(`serializeProfile`)은 **블랙리스트**다. 사업자등록번호만 빼고 모든 필드를 저장하므로 새 필드는 자동으로 저장된다.
- 읽기(`deserializeProfile`)는 **화이트리스트**다. 필드마다 `pickString`·`pickNumber`·`pickEnum`·`pickStringArray`로 하나씩 읽으므로, 새 필드는 여기에 추가해야 복원된다. 값이 없거나 형식이 틀리면 `null`(배열은 `[]`)이 된다. 관심 분야는 `INTEREST_AREA_OPTIONS`로 만든 허용 집합으로 거르므로 새 선택지는 자동으로 통과한다.
- 새 필드는 `createEmptyProfile`, `FIELD_STEP`(단계 연결, 빠뜨리면 타입 오류), `deserializeProfile`에 추가한다. `version`을 올리면 기존 프로필이 버려지므로 올리지 않는다.

## 6. 비교 진입점

- 저장 키 `esm.compareSelection.v1`(sessionStorage), 최대 4개, `compareLocation()` = `/programs?compare=…#compare`. `toggle` 함수는 없고 `add`·`remove`만 있다.
- 전체 공고 카드(`ProgramCard` 체크박스 → `ProgramBrowser.toggleCompare`): 이동하지 않는다.
- 맞춤 추천 카드(`RecommendationCard` → `ProgramBrowser.addToCompareAndGo`): 추가 후 **항상 이동**한다(이미 있거나 가득 차도 이동).
- 공고 상세(`ProgramDetailView.addToCompare`): 추가 후 **항상 이동**한다.
- 하단 고정 바: `CompareSection` 안에만 있다(`비교 n/4 · 비교 영역으로 이동`, 전체 공고 화면 전용, 오른쪽 아래). 토스트도 같은 자리에 떠서 겹친다.
- 마이페이지 관심·준비 중·신청완료 탭(`ApplicationRecordTable`)에는 비교 진입점이 없다.
- `#compare` 해시가 붙은 상태에서 선택을 바꾸면 `CompareSection`의 주소 동기화가 해시를 유지하고, 라우터 `scrollBehavior`가 해시를 먼저 처리해 비교 영역으로 스크롤이 튈 수 있다.

## 7. 그 밖에 확인한 것

- **배포**: Vercel 프로젝트 `sbg020/export_support_matching`(Root Directory `frontend`)은 Git 자동 배포가 아니라 저장소 루트에서 CLI로 배포한다. 환경변수는 `DEMO_LOGIN_ID`, `DEMO_LOGIN_PASSWORD`, `AUTH_SESSION_SECRET`(Production·Preview)뿐이다.
- **DB**: 코드·Vercel 환경변수 어디에도 DB(Neon 포함) 연결이 없다. 사용자 결정에 따라 이번 개정에서도 DB를 쓰지 않는다. 조회 집계·커뮤니티 서버는 인터페이스와 빈 구현만 둔다.
- **빌드 주의**: `.vercelignore`가 `docs`를 제외하고 Vercel 빌드의 `vue-tsc --build`가 테스트 파일도 검사하므로, 테스트에서 `docs/` 파일을 정적 import하면 배포 빌드가 깨진다. 공유 판정 사례(`docs/contracts/engine-cases.json`)는 테스트 실행 시점에 `node:fs`로 읽는다.
- **수출단계 기준 원문**: 중소벤처기업부 공고 제2025-634호(2025-12-10) 「2026년 중소기업 수출지원사업 통합공고」 3쪽 `① 수출바우처`의 지원트랙 표를 직접 열어 확인했다. 내수기업 ‘1,000불 미만’, 수출초보 ‘1,000불~10만불 미만’, 수출유망 ‘10∼100만불 미만’, 수출성장 ‘100∼500만불 미만’, 수출강소 ‘500만불 이상’(모두 `전년도 수출액`)으로 문서 §5.2의 구간과 같다.

## 8. 문서와 다르게 하거나 해석한 점

1. 정답 세트 파일명을 문서 이름으로 바꾸고, test 30건 초안은 제외했다(위 1항).
2. 데이터 JSON은 `import('@/data/test-dataset.json?raw')`로 동적 로드해 `JSON.parse`한다. 별도 청크는 그대로이고, 600KB JSON의 TypeScript 타입 추론으로 타입 검사가 느려지는 것을 피한다. `DataSourceStatus`를 동기적으로 채우기 위해 변환 스크립트가 같은 `meta`를 `test-dataset.meta.json`에도 쓴다.
3. `supportPhases`·`supportAreas`는 JSON에 넣지 않고 저장소가 읽을 때 `constants/categories.ts`의 매핑으로 만든다(매핑 버전을 한 곳에서 관리).
4. `EligibilityRule`에 `valueNote`(값 괄호 안 메모)를 더하고, `unit`에 `KSIC`·`KSIC 3자리`·`HS 4단위`를 더했다. `Program`에 `regionNote`(지역 범위의 괄호 메모)를 더했다.
5. 커뮤니티 `글쓰기`는 비로그인이면 로그인 화면으로 보내고(같은 게시판으로 복귀), 로그인 회원에게는 이유와 함께 비활성으로 보인다. 글쓰기 화면의 `등록`은 비활성이다(§10.5·§10.7·§14를 함께 만족).
6. 하단 비교 바는 토스트와 겹치지 않도록 화면 아래 가운데(모바일은 전체 폭)에 두고, 보이는 동안 토스트를 그만큼 위로 올린다.
7. 마감 임박순(전체 공고 기본 정렬)은 이미 마감된 공고를 접수중·예정 공고 뒤에 둔다. 마감일이 지난 공고가 맨 위에 오지 않게 하기 위해서다.
8. 새로 올라온 공고의 30일 창은 기준일까지 0~30일 전 게시분이다(68행 중 14행, 문서 §9.2와 같다). `추가모집` 배지는 묶인 공고의 공고명·세부사업명에 `추가모집`·`재공고`·`재모집`·`연장공고`가 있을 때 붙인다.
9. 많이 본 공고 목록에는 순 방문자 10명 이상인 공고만 넣는다(그런 공고가 3개 이상일 때만 표시).
10. 로그인 회원은 게시판의 비활성 `글쓰기` 이유 옆 `글쓰기 양식 미리 보기` 링크로 글쓰기 화면(등록 비활성)을 열 수 있다. 글 보기의 이전·다음 글은 게시판 목록 API(서버)가 생긴 뒤 붙인다.
11. 공고 상세의 필요서류 체크는 관리 기록이 있는 공고에서만 켜지고 그 기록(`esm.applicationRecords.v1`의 `checklist`)에 저장한다. 키 이름과 형식은 그대로다.
12. 마이페이지 신청완료 탭의 `새 기록 등록`은 공고 데이터가 연결되면 전체 공고로 가는 링크가 된다(기록은 공고의 `관심사업 저장`으로 만든다). 공고 상세 `목록으로`는 `?from=mypage`도 받는다.
13. 비교 표 칸의 문구는 `components/programs/compareRows.ts`의 순수 함수 `compareCellText`로 옮겨 테스트 전용 공고로 검사한다.

## 9. 반영 현황 (2026-10-31)

| 등급 | 범위 | 상태 |
|---|---|---|
| P1 | §3 테스트 데이터 · §4 입력 추가 3건 · §5 수출단계 v1 · §6 분야 체계·자격 판정 v2·직접 확인·재무 조건 · §7 적합도 v0 · §8 기회비용·공고 비교 · §9 둘러보기 화면 · §10 커뮤니티 화면·경로·사이드바 · §11 화면 반영 | 반영. `npm run verify` 통과 |
| P2 | §9.3 조회 집계 서버 저장 | 미반영. `ViewEventSink` 인터페이스와 저장하지 않는 구현만 있다. Django `ProgramViewEvent` 모델·수집 API·개인정보 안내가 필요하다 |
| P2 | §10.8 커뮤니티 서버 | 미반영. `CommunityRepository` 인터페이스·타입·빈 구현만 있다. 회원 DB와 게시글·댓글·추천·신고·참여 확인 모델·API가 필요하다 |
| P2 | §12 백엔드 계약 | 일부. 공유 판정 사례 `docs/contracts/engine-cases.json`(33개)을 만들고 Vitest로 검사한다. Django 모델 새 필드·마이그레이션 `0002`·`import_test_dataset` 명령·`matching/engine.py` v2와 같은 사례를 읽는 Django 테스트는 아직 없다 |

- 입력 페이지 변경(§4.4): `StepBasicInfo.vue`에 기업 규모 구분 1문항, `StepExportStatus.vue`의 측정 기간 안내에 1문장, 관심 분야 선택지 5개(`constants/options.ts`), 직렬화 기본값(`lib/profile.ts`의 `createEmptyProfile`·`FIELD_STEP`·`deserializeProfile`)만 바뀌었다. 기존 항목·키·검증·저장 로직은 그대로다. 표시 전용으로 `ProfileSummary`에 `기업 규모 구분` 줄을 더했다.
- 배포: 로컬 `frontend/.env.local`에는 `VITE_DATA_SOURCE=test-dataset`이 있다. 현황 조사 때 Vercel 프로젝트 환경변수에는 이 변수가 없었으므로(위 7항), Production·Preview에 추가한 뒤 다시 배포해야 테스트 데이터가 보인다.
