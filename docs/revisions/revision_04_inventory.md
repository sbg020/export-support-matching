# revision_04 현황 조사 (구현 전)

> 조사일 2026-11-11 · 기준 커밋 `ee8ddf6` (`revision-03-test-account`) · 작업 브랜치 `revision-04`
> [REVISION_04.md](REVISION_04.md) §2에 따라 코드를 고치기 전에 확인한 내용이다. 문서의 예상과 다른 점은 실제 값으로 진행하고 아래에 적었다.

## 1. Git

- `revision-04`는 `revision-03-test-account`(`ee8ddf6`, `origin/revision-03-test-account`와 같음)에서 만들었다.
- `revision-03-test-account`는 `main`(`61599df`)보다 24개 커밋 앞서 있고 `main`에는 병합되지 않았다. 운영 사이트는 2026-11-01에 이 브랜치를 CLI로 배포한 상태다(revision_03_test_account_inventory §8).
- 그 밖의 브랜치(`revision-01`, `revision-02`, `revision-02-backend`, `revision-03`, `claude/dreamy-almeida-c75f42`)는 건드리지 않는다.
- 추적하지 않는 파일: `.claude/`, 루트의 `REVISION_04.md`(사본을 `docs/revisions/REVISION_04.md`로 커밋), `EC_정답세트_150건_통합.xlsx`(루트와 `수출 지원사업 공고문/정답세트/`에 같은 이름으로 하나씩, **둘 다 Git 추적 안 함**), `별첨자료2_구현결과/`, `중간발표(10.9.) 발표 자료.pdf`. 이번 개정에서 Git에 추가하지 않는다.

## 2. 바뀌는 것을 쓰는 곳

문서 §2-2 표와 같다. 다른 점만 적는다.

| 바뀌는 것 | 실제 사용처 (문서와 다른 점) |
|---|---|
| `DataSourceNotice` | 문서와 같음 (5개 화면 + `revision02.spec.ts`) |
| `DraftTag` | 문서와 같음. `EligibilityBadge`의 `dataState` prop은 `DraftTag`에만 쓰인다 → prop 삭제, 부르는 곳 3곳(`ProgramCard`, `RecommendationCard`, `ProgramDetailView` 2곳)도 정리 |
| `검수 전 초안` | 문서 목록 + `DataSourceNotice.vue`·`DraftTag.vue`(지울 파일), 테스트(`fixtures.ts`, `revision02.spec.ts`). `DATA_STATE_LABEL`은 공고 상세 `데이터 상태` 행(`dataStateText`)에서 쓰므로 남긴다 |
| `테스트 데이터 기준` | 문서와 같음 |
| `diagnose-result` | 문서와 같음 + `__tests__/revision03.spec.ts`(기업 진단 화면을 직접 마운트하는 테스트) |
| 테스트 데이터셋 | 문서 목록 + **`staticProgramRepository`의 순수 함수를 쓰는 곳**: `ProgramBrowser.vue`(`compareProgramIds`), `lib/programHighlights.ts`, `views/community/CommunityWriteView.vue`, `__tests__/engine.spec.ts` → `lib/programQuery.ts`로 옮긴 함수를 쓰게 바꾼다 |
| 계정 역할 `demo` | 문서와 같음 + `__tests__/testAccount.spec.ts` |

## 3. `샘플 데이터` 문자열

- `frontend/`(node_modules·dist 제외), `docs/`: 0건.
- 운영 사이트 빌드 결과(`index-cIgF3dA2.js`와 거기서 부르는 JS 52개): 0건.
- → 지울 곳이 없다. 참고 화면의 `샘플 데이터` 배지는 넣지 않는다.

## 4. Vercel 환경변수 (이름만)

- `VITE_DATA_SOURCE`: Production·Preview에 있다 → 이번 개정에서 지운다.
- 그 밖: `DEMO_LOGIN_ID`·`DEMO_LOGIN_PASSWORD`·`AUTH_SESSION_SECRET`·`TEST_LOGIN_ID`·`TEST_LOGIN_PASSWORD` (Production·Preview). 바꾸지 않는다.

## 5. 로그인 계정

- 로컬 `frontend/.env.local`의 `DEMO_LOGIN_ID`는 `ADMIN`, `TEST_LOGIN_ID`는 `TEST`다(아이디만 확인, 비밀번호는 확인·기록하지 않음).
- 로컬 `.env.local`에 `VITE_DATA_SOURCE` 줄이 1개 있다 → 지운다(파일 내용은 출력하지 않는다).

## 6. 기업 진단에만 있는 기능

| `DiagnoseResultView.vue`가 쓰는 것 | 다른 사용처 | 처리 |
|---|---|---|
| `ProfileSummary.vue` | 없음 | 쓰는 곳이 없어지므로 **삭제** |
| `ProfileStatusBadge.vue` | 기업 프로필, 맞춤 추천 | 남김 |
| `ExportStageCriteriaNote.vue` | 수출 로드맵 (+ 관리자 기준·설정에서 쓸 예정) | 남김 |
| `StatTile`, `InfoList`, `InfoRow`, `SectionCard`, `NoticeBanner`, `EmptyState` | 여러 화면 | 남김 |
| `lib/profileDisplay.ts` | `ProfileSummary.vue`만 쓴다 | 문서가 지우라고 정한 컴포넌트가 아니므로 남기고, 쓰지 않게 된 코드로 보고한다 |
| `PROFILE_STEPS`, `PROFILE_STATUS_LABEL`, `phaseListText`, `exportStageText` | 다른 화면 | 남김 |

## 7. 그 밖에 확인한 것

- `frontend/vercel.json`의 rewrite는 `/((?!api/).*)`라서 `/admin/*`도 `index.html`로 간다. 바꿀 필요 없다.
- `.vercelignore`는 `revision_01.md`(소문자)만 제외한다. 루트에는 `REVISION_01.md`(대문자)·`REVISION_04.md`·정답세트 xlsx·발표 PDF·`별첨자료2_구현결과/`가 있어 CLI 배포 때 함께 올라간다(사이트에는 나오지 않음). 배포에 필요 없는 파일이므로 `.vercelignore`에 추가한다.
- npm 레지스트리 `xlsx`(SheetJS) 0.18.5는 쓰지 않는다(문서 §11.3). 조사 때는 `exceljs`를 검토했으나 구현에서는 **SheetJS 공식 배포본 0.20.3**을 썼다(아래 반영 현황 §R5에 이유).

---

# 반영 현황 (구현 후)

> 확인일 2026-11-12 · 작업 브랜치 `revision-04` · 로컬 검사: 타입 검사·oxlint·ESLint(`--max-warnings=0`)·vitest 13개 파일 270개 테스트·`npm run build` 통과

## R1. 바뀐 파일 요약

| 묶음 | 파일 |
|---|---|
| 공통 표시 정리 (§3.1·§3.2) | 삭제 `components/common/DataSourceNotice.vue`, `components/common/DraftTag.vue` · 수정 `EligibilityBadge.vue`(`dataState` prop 삭제), `ProgramCard.vue`, `ProgramCardFieldGuide.vue`, `ProgramDetailView.vue`, `ProgramListView.vue`, `ProgramCalendarView.vue`, `ProgramRecommendedView.vue`, `RoadmapView.vue`, 주석 `composables/useProgramEvaluations.ts`·`lib/engine/opportunityCost.ts`(주석만, 계산 로직은 그대로) |
| 공고 데이터 삭제 (§3.3) | 삭제 `data/test-dataset.json`, `data/test-dataset.meta.json`, `repositories/staticProgramRepository.ts`, `types/dataset.ts` · 새 파일 `lib/programQuery.ts`(순수 함수 이동), `types/answerSet.ts` · 수정 `repositories/index.ts`, `repositories/programRepository.ts`(`not-connected`\|`api`, `dataBasisDate()`는 항상 `null`), `ProgramBrowser.vue`·`lib/programHighlights.ts`·`CommunityWriteView.vue`(import 경로), `env.d.ts`, `vitest.config.ts`, `.env.example`, `frontend/.env.example`, `docs/data/test-dataset-report.md`·`tools/dataset/README.md`(맨 위 한 줄) |
| 기업 진단 삭제·로드맵 (§4.1~§4.3) | 삭제 `views/diagnose/DiagnoseResultView.vue`, `components/diagnose/ProfileSummary.vue` · 수정 `router/index.ts`(`/diagnose/result` → `moved('roadmap')`), `constants/navigation.ts`, `DiagnoseInputView.vue`, `RoadmapView.vue`(`판정 대상 공고` 카드, `단계 가중치 버전` 카드·`기업 진단 보기` 버튼 삭제) |
| 맞춤 추천 (§4.4) | 새 파일 `components/programs/RecommendationList.vue` · 수정 `RecommendationCard.vue`(오른쪽 위 적합도, 정보 4칸, `추천 이유` 삭제), `ProgramBrowser.vue`(전체 공고 전용), `ProgramRecommendedView.vue`, `lib/programDisplay.ts`(`supportContentLine`, 신청 마감 표시) |
| 역할·이동 규칙 (§5) | `server/auth/core.ts`·`handlers.ts`(`admin`\|`test`), `stores/authStore.ts`(`admin`\|`test`\|`member`, `isAdmin`), `stores/accountScope.ts`·`lib/storageScope.ts`(주석), `lib/redirect.ts`, `router/index.ts`(`requiresAdmin`, `isAdminDenied`, 탭 제목), `views/LoginView.vue`(안내 한 줄), `components/layout/ProfileMenu.vue`(관리자: `관리자 홈`·`로그아웃`) |
| 관리자 공통 (§6) | 새 파일 `components/layout/AdminHeader.vue`, `AdminNav.vue`, `constants/adminNavigation.ts`, `constants/adminOptions.ts`, `components/admin/AdminStoreNotice.vue`·`StoreButton.vue`·`AdminTable.vue`·`AdminFilePicker.vue`, `repositories/admin/*`, `types/admin.ts` · 수정 `App.vue`, `MobileNavDrawer.vue`·`SidebarNav.vue`(관리자 서랍), `BrandLink.vue`(`관리자` 글자) |
| 관리자 화면 (§7~§12) | 새 파일 `views/admin/AdminHomeView.vue`·`AdminBizinfoView.vue`·`AdminKotraView.vue`·`AdminReviewView.vue`·`AdminNoticesView.vue`·`AdminSettingsView.vue`, `components/admin/AnswerSetSection.vue`, `lib/admin/csv.ts`·`kotraCsv.ts`·`answerSet.ts`·`readWorkbook.ts`·`settings.ts`·`download.ts` · 의존성 `xlsx`(SheetJS 공식 배포본 0.20.3) |
| 문서·테스트·배포 설정 | `CLAUDE.md`(개정 목록 한 줄), `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/revisions/REVISION_04.md`(루트 원본과 같은 내용, 비밀값 없음), 이 문서, `.vercelignore`(루트 개정 원본·xlsx·pdf·`별첨자료2_구현결과`·`.claude` 제외), 테스트(R7) |

**`샘플 데이터` 재검색 (구현 후):** `frontend/src`·`server`·`api`·`docs`와 새 빌드 결과(`frontend/dist/assets/*.js`)에서 `테스트 데이터`·`PoC 데이터 기준`·`초안 기준`·`샘플 데이터`가 화면 문자열로 나오지 않는다. 남은 `검수 전 초안`은 `constants/options.ts`의 `DATA_STATE_LABEL.draft` 하나이며, 문서 §3.1대로 공고 상세 `데이터 상태` 행(`dataStateText`)이 쓰므로 남겼다. 모든 라우트를 마운트해 네 문구가 없는지 확인하는 테스트가 있다(`revision04.spec.ts`).

## R2. 지운 것과 남긴 것

| 지운 것 | 남긴 것 |
|---|---|
| 파일: `DataSourceNotice.vue`, `DraftTag.vue`, `ProfileSummary.vue`, `DiagnoseResultView.vue`, `test-dataset.json`, `test-dataset.meta.json`, `staticProgramRepository.ts`, `types/dataset.ts` | 원문 PDF(`수출 지원사업 공고문/`), 정답세트 xlsx 2개(둘 다 Git 추적 안 함, 이번에도 추가하지 않음), `tools/dataset/`, `docs/contracts/engine-cases.json`, `backend/`, 기존 문서, `docs/data/test-dataset-report.md`(기록용 표시) |
| 경로: `diagnose-result` (주소 `/diagnose/result`는 수출 로드맵으로 리다이렉트) | 브라우저 저장 키 `export-support-matching:profile:v1`, `esm.applicationRecords.v1`, `esm.selfChecks.v1`, `esm.compareSelection.v1`, `<기존 키>:account:<아이디>` — 이름·형식·값 그대로 |
| 환경변수: `VITE_DATA_SOURCE` (`.env.example` 2곳, `vitest.config.ts`, `env.d.ts`, 로컬 `frontend/.env.local`, Vercel Production·Preview — R10) | `DEMO_LOGIN_ID`·`DEMO_LOGIN_PASSWORD`(이름 그대로, 역할만 `admin`), `TEST_LOGIN_*`, `AUTH_SESSION_SECRET` |
| 코드: `lib/profileDisplay.ts`는 `ProfileSummary.vue`만 쓰던 파일이라 지금은 쓰는 곳이 없다 | 문서가 지우라고 정한 파일이 아니므로 남겼다(쓰지 않게 된 코드로 보고) |

## R3. 기업 진단에서 사라진 정보와 대신 볼 수 있는 위치

| 기업 진단에 있던 것 | 지금 볼 수 있는 곳 |
|---|---|
| 현재 수출단계, 근거, 측정 기간 안내, 기준 안내(`ExportStageCriteriaNote`) | 수출 로드맵 상단 지표와 `수출단계 기준` 안내 (관리자는 `기준·설정` §12.2에서도) |
| 다음 단계 조건, 권장 지원 단계 | 수출 로드맵 단계 카드 |
| `판정 대상 공고` 수 | 수출 로드맵 상단 지표 4번째 카드(공고 연결 전 `-`·`공고 등록 전`) |
| `확인이 필요한 항목`(빠진 필수 항목) | 기업 프로필의 완료 확인 패널(단계별) |
| `입력한 기업정보` 요약 | 기업 프로필(`/profile`) |
| `다음으로 할 일` | 사용자 지시로 없앰 (대신하는 화면 없음) |
| `단계 가중치 버전(stage-phase-v0)` 카드(로드맵) | 관리자 `기준·설정` §12.3 단계 가중치 표 |

## R4. 맞춤 추천 전후

| | 전 (revision_03) | 후 (revision_04) |
|---|---|---|
| 구성 | 검색창, 좌측 필터(모바일 `필터` 버튼), 결과 바(`추천 결과 n건`, 정렬 선택, 적용한 조건 칩, 필터 초기화), `전체` 탭 포함 상태 탭, 한 목록 정렬(신청 가능 → 확인 필요 → 신청 불가) | `신청 가능 n` · `확인 필요 n` · `신청 불가 n` 탭 3개(`?tab=`), 정렬 안내 한 줄, 카드 목록, 추천 기준 안내, 하단 비교 바. 검색·필터·정렬·결과 건수 없음 |
| 카드 | 배지·공고명·기관, 기본 정보 4가지, `추천 이유` 줄 | 왼쪽 위 배지·공고명·기관, **오른쪽 위 적합도 `n점` + `시험용 기준`**(없으면 `-` + 사유 2가지), 정보 4칸 `신청 마감 · 지원 내용 · 지원금 · 자부담`, `계산 근거 보기`, 버튼 3개. `추천 이유` 없음 |
| 공고 없음 (지금) | `추천 결과 -건`과 빈 상태 | 탭 건수 `-`, `현재 등록된 지원사업 공고가 없습니다.` + `기업정보 확인하기` |

지금은 공고 데이터가 없어 카드가 실제로 그려지는 화면은 볼 수 없다(TEST 계정도 빈 상태). 카드 배치·탭 건수·기본 탭·탭 안 정렬·`?tab=` 동기화·판정 없는 공고 안내는 테스트 전용 공고로 컴포넌트 테스트에서 확인했다(`revision04.recommend.spec.ts`).

## R5. 관리자 화면별 동작

| 화면 | 지금 실제로 동작 | 저장소 연결 후 켜질 것 (지금 비활성 + 이유) |
|---|---|---|
| 공통 | `ADMIN` 로그인 → `/admin`, 관리자 메뉴 6개(`aria-current`·굵게·밑줄), `사용자 화면 보기`, 프로필 팝업 `관리자 홈`·`로그아웃`, 991px 이하 서랍(관리자 메뉴 6개 + 사용자 화면 보기), 비로그인 → 로그인 후 원래 관리자 화면, 비관리자 → 로드맵 + 토스트, 저장소 연결 상태 안내, 표 가로 스크롤(`role="region"`, `tabindex="0"`) | 서버 집계 시각과 모든 수치 |
| 관리자 홈 | 지표 4개 카드 이동, 데이터 흐름 5단계 표시 | 지표·단계 건수, 검수 대기·마감 임박·수집 오류 목록, `다시 수집` |
| 기업마당 API 수집 | 수집 주기·시각·수정공고 선택, 지원분야 체크(처음엔 `수출`만), 키워드 입력 검증(1~20자, 중복 제거, 최대 50개, 기본값 비움) | `지금 수집`, `인증키 등록`, `연결 확인`, `주기 저장`, `필터 저장`, 수집 로그 (인증키 입력칸은 두지 않음) |
| KOTRA CSV 업로드 | 4단계 표시(`aria-current="step"`), `CSV 양식 내려받기`(UTF-8 BOM + 머리글, `kotra_notices_template.csv`), 파일 선택·끌어다 놓기(.csv, 5MB, 1,000행), UTF-8 → EUC-KR 재시도, 머리글 검사, 행 검사 8규칙·중복 의심, 요약·배지·보기 선택, `취소` | `오류 행 빼고 n건 반영하기`, 저장된 공고와의 중복 확인, 업로드 이력·`되돌리기` |
| 공고 검수 | 빈 대기 목록, 상세 구조(공고 정보·원문·자동 추출 조건·분류 라벨·승인/반려) 표시 | 원문·추출 값 편집, 지원 분야 칩, 수출단계, 지원 내용 한 줄, 검토 메모·반려 사유, `반려`, `승인하고 게시` |
| 공고 관리 | 출처·상태 필터와 공고명 검색이 주소 쿼리(`source`·`status`·`q`·`page`)와 맞물림, `전체 -건 중 -건 표시`, 정답세트 xlsx 읽기·검사·결과 표(`#bulk`) | 목록·`게시 중지`·`다시 게시`, 중복 병합(`다른 공고로 유지`·`하나로 병합`), 수정공고 버전·`두 버전 비교`, `검사 결과대로 반영하기` |
| 기준·설정 | 코드 상수에서 읽은 기준 표시: 수출단계 `export-stage-v1`(5구간·확인일·근거), 적합도 `fit-v0`(0.40·0.30·0.30, 보정 ±10, `검증 전 가설`), 단계 가중치 `stage-phase-v0` 표, 세부 분야 → 지원 단계 `category-phase-v0`(접기), 공통 확인 5가지, 15개 분야 키워드 사전(키워드 `-`), 19개 전략표 빈 구조와 `표 내려받기`(머리글 CSV). 가중치 입력(0.00~1.00, 0.05 단위)과 합계 실시간 검증, 기준일 방식 선택 | `기준 저장`, `가중치 저장`, `키워드 추가`, `전략 추가`, 판정 기준일(`-`)과 기준 마지막 변경 |

**xlsx 파서 선택:** SheetJS 공식 배포본 0.20.3(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, `package-lock.json`에 integrity 기록). npm 레지스트리의 0.18.5에 남은 CVE-2023-30533(0.19.3에서 수정)·CVE-2024-22363(0.20.2에서 수정)이 고쳐진 버전이고, 의존성이 없는 단일 모듈이라 브라우저 번들에 Node 내장 모듈 대체물이 필요 없다. `readWorkbook`에서 `import('xlsx')`로 지연 로드하며, 빌드 결과에서 이 청크(`xlsx-*.js`, 약 490kB)는 `AdminNoticesView`만 불러온다(사용자 화면 첫 로드에 포함되지 않음). 주의: 설치 시 `cdn.sheetjs.com`에서 받으므로 Vercel 빌드(`npm ci`)가 그 주소에 접근할 수 있어야 한다.

## R6. 정답세트 `EC_정답세트_150건_통합.xlsx` 검사 결과 (루트 파일)

| 항목 | TS 검사 (`validateAnswerSet`, 관리자 화면) | Python 스크립트 (`build_test_dataset.py` 변환 로직, 검사만) |
|---|---|---|
| 공고(원공고) | 150 | 150 |
| 공고 행(세부사업 포함) | 160 | 160 |
| 규칙 | 1,281 | 1,281 |
| 가점 | 151 | 151 |
| 서류 | 1,220 | 1,220 |
| 오류 | 0 | 0 (변환을 멈추는 오류 없음, 평가용 공고 제외) |
| 게시일 없음 | 경고 57 | 경고 57 |
| 접수기간 없음 | 경고 32 | 경고 32 |
| 평가용(test) 공고 | 33 (경고 1줄로 묶음) | 33 (`split 'test 후보'`, 원래 스크립트는 여기서 변환을 멈춘다) |
| 검수대기로 남은 행 | 2,812 (경고 1줄) | (세지 않음) |
| 알 수 없는 단위 | (검사 규칙에 없음) | 경고 2 (`MTI`, 규칙 2개) |
| 경고 합계 | 91 | 124 |
| `삭제` 행 | 0 | 0 |
| `support_summary` 열 | 없음 → 카드 지원 내용은 세부 분야 이름으로 표시 | - |

- 공고·행·규칙·가점·서류 수와 오류 목록(0건)이 같다. 경고 수가 다른 것은 묶는 방식 차이다: TS는 평가용 공고·검수대기 행을 각각 한 줄로 묶고, Python은 평가용 공고를 공고마다 한 줄씩 적으며 단위 경고(`MTI`)를 더 낸다. 단위는 문서 §11.3 검사 규칙에 없어 TS에 넣지 않았다.
- 공고별 표: 160행 중 결과 `정상` 88 · `경고` 72 · `오류` 0. 모든 행의 검수가 끝나지 않아(`검수대기`) 검수 끝난 비율은 모두 0%다.
- Python 비교는 저장소 스크립트를 고치지 않고, 임시 래퍼에서 평가용 공고 중단만 경고로 바꿔 실행했다(출력은 저장소 밖 임시 폴더). 로컬 개발 서버의 관리자 `공고 관리 #bulk`에서 같은 파일을 올려 같은 요약(`공고 150건 · 세부사업 포함 160행 · 규칙 1281 · 가점 151 · 서류 1220 · 오류 0 · 경고 91`)이 나오는 것을 확인했다.

## R7. 테스트 변경

| 파일 | 바꾼 것 |
|---|---|
| `revision02.spec.ts` | 테스트 데이터셋 묶음(meta 건수·기준일, null 값, 파생 필드, 접수상태 분포, 공통 확인 키, 정산 방식, 실제 건수 검색)과 `데이터 출처 안내` 묶음 삭제. 지역 필터·둘러보기 30일 창은 `__tests__/fixtures.ts`의 테스트 전용 공고로 바꿈 |
| `testAccount.spec.ts` | REVISION_03_TEST_ACCOUNT §6 기대 결과(추천 9건, 신청 불가 14개, 확인 필요 12개, 기준일 2026-10-15) 검증 삭제. 대신 공고가 없어도 수출단계 `내수`(기준일이 없으면 기준표 연도의 직전 연도 2025년), 관심 분야가 맞는 공고의 적합도가 더 높다는 것을 테스트 전용 공고로 확인. 업종 사전(C10) 확인은 규칙 단위 테스트로 남김. `데모 계정` → `관리자 계정` |
| `revision03.spec.ts` | 상단 하위 메뉴 항목 9개 → 8개(기업 진단 삭제), `기업 진단 → 기업 프로필 연결` 묶음 삭제 |
| `revision.spec.ts` | 카드 기본 정보 4가지 → 정보 4칸(신청 마감·지원 내용·지원금·자부담) |
| `app.spec.ts`, `engine.spec.ts` | 지운 경로·import 정리(`compareProgramIds`는 `lib/programQuery.ts`) |
| `server/__tests__/auth.spec.ts` | 역할 기대값 `demo` → `admin` |
| 새 파일 `revision04.spec.ts`(63개), `revision04.recommend.spec.ts`, `revision04.adminFiles.spec.ts` | 문서 §14.2 항목 (공통 표시, 저장소 기본값, 리다이렉트, 로드맵, 맞춤 추천, 카드, 역할·이동 규칙 표, 관리자 6개 경로·메뉴·권한·비활성 버튼과 이유·참고 화면 예시 값 없음·쓰기 메서드 미호출, CSV·정답세트·가중치·키워드·전략표 CSV) |

## R8. 그 밖의 결정

- 관리자 상단 메뉴는 992px부터 한 줄에 나온다. 1279px 이하에서는 메뉴 좌우 여백만 줄여(`--admin-nav-pad`) 넘치지 않게 했으므로 최소 폭을 1200px로 올리지 않았다.
- `/api/admin/*` 서버 함수와 `HttpAdminRepository`는 만들지 않았다(문서 §6.3). 계약은 `docs/architecture.md` §7-1.
- 관리자가 아닌 계정의 `/admin` 접근 안내 토스트 문구는 `constants/adminNavigation.ts`의 `ADMIN_ONLY_MESSAGE`.
- 로컬 브라우저 확인은 실제 비밀번호 대신 그 세션에서만 만든 임시 비밀번호로 개발 서버를 띄워 했다(저장소·로그에 남기지 않음).

## R9. 사용자 결정이 필요한 사항 (문서 부록 B 그대로)

1. 공고 저장소(Vercel에 연결하는 Postgres 또는 기존 `backend/` Django + PostgreSQL). 연결 전까지 사용자 화면은 공고 없음 상태다.
2. 19개 전략표와 추천 경로 목록의 값.
3. 정답세트 `programs` 시트에 `support_summary`(지원 내용 한 줄) 열을 추가할지. 지금 파일에는 없다.
4. 평가용(test split) 공고 33건을 서비스 데이터에 넣을지.
5. 판정 기준일 방식(고정 날짜 / 매일 자동)의 기본값.
