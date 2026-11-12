# REVISION_04 — 테스트 데이터 정리 · 기업 진단 삭제 · 맞춤 추천 개편 · 관리자 영역(화면·동작 골격)

> **사용 방법**
> 이 파일을 프로젝트 루트(`CLAUDE.md`와 같은 위치)에 두고 Claude Code에 다음과 같이 요청한다.
> `CLAUDE.md, docs/revisions/revision_01.md, docs/revisions/REVISION_02.md, docs/revisions/REVISION_03.md, docs/revisions/REVISION_03_TEST_ACCOUNT.md, REVISION_04.md를 모두 읽고 REVISION_04를 로컬과 배포 사이트에 반영해줘.`
>
> **우선순위**
> `CLAUDE.md`와 이전 개정 문서의 서비스 원칙(가상 데이터 금지, 결측값 `-`, 자격·적합도 분리, 근거 없는 점수 금지, 기존 저장 키 보존, 접근성)은 그대로 유지한다. 이 문서와 충돌하는 부분은 이 문서를 따른다. 이 문서에는 비밀값이 없다.
>
> **배포 대상**
> 로컬 개발 환경과 기존 배포 사이트 `https://exportsupportmatching.vercel.app/`를 모두 갱신한다. 이번 요청은 커밋·푸시·배포까지 포함한다. `main` 병합은 하지 않는다. 작업 브랜치는 `revision-04`(현재 `revision-03-test-account`에서 분기)다.
>
> **이번 개정의 성격**
> 1. **전체 공통 정리:** 테스트 데이터 안내 카드와 `초안 기준`·`샘플 데이터` 표시를 없애고, 지금 들어 있는 공고 데이터(테스트 데이터셋)를 모두 지운다. 검수 완료된 최종 데이터는 곧 관리자 화면에서 올린다.
> 2. **기업 맞춤 지원사업:** `기업 진단` 화면을 없애고 `맞춤 추천`만 남긴다. 맞춤 추천은 상태 탭 3개와 새 카드(우측 상단 적합도 점수, 지원 내용 한 줄)로 바꾼다.
> 3. **관리자 영역 신설:** `ADMIN` 계정 전용 6개 화면을 만든다. **공고 저장소(DB)는 이번에 연결하지 않는다(사용자 결정).** 화면 구성과 브라우저 안에서 끝나는 동작(파일 선택·미리보기·검사, 양식 내려받기, 입력 검증, 필터)은 실제로 동작하게 만들고, 저장이 필요한 동작은 비활성 상태와 이유로 보여 준다.
>
> **참고 화면**
> `EC 웹서비스 와이어프레임 v3 (사이트맵 반영)` 캔버스(https://claude.ai/artifact/HT9xoA9ySQi6fDs2LqnoX4)의 `맞춤 공고`, `관리자 홈`, `기업마당 API 수집`, `KOTRA CSV 업로드`, `공고 검수`, `공고 관리`, `기준·설정` 화면. **구조만 참고한다.** 디자인은 현재 사이트의 디자인 토큰(`styles/tokens.css`)과 공통 컴포넌트로 만든다. 참고 화면에 적힌 예시 값은 하나도 가져오지 않는다(§1 제약 2, 부록 C).

---

## 0. 이 문서가 바꾸는 기존 조항

| 기존 조항 | 변경 내용 |
|---|---|
| `CLAUDE.md` §4 경로 표 `기업 진단 /diagnose/result`, §5.C 기업 진단 | **기업 진단 화면을 없앤다.** `/diagnose/result`는 수출 로드맵(`/roadmap`)으로 리다이렉트한다. 진단 결과(현재 수출단계·다음 단계 조건·기준)는 이미 수출 로드맵에 있다 (§4.1) |
| `CLAUDE.md` §5.D "전체 공고·맞춤 추천: 검색창, 필터, 정렬 UI", 공고 카드의 `추천 이유` | **맞춤 추천에서** 검색창·필터·정렬·결과 건수를 없애고, 카드의 `추천 이유`를 `지원 내용` 한 줄로 바꾼다. 전체 공고는 그대로다 (§4.4) |
| REVISION_02 §3 테스트 데이터셋 연결(`VITE_DATA_SOURCE=test-dataset`), §3.6 데이터 상태와 화면 표시(`DataSourceNotice`, `초안 기준`) | **테스트 데이터셋과 그 표시를 모두 없앤다** (§3) |
| REVISION_02 §7.1 맞춤 추천 정렬 "신청 가능 → 확인 필요 → 신청 불가를 한 목록에" | **상태 탭 3개로 나누고**, 탭 안에서는 적합도 높은 순 → 마감 빠른 순 → ID 순이다 (§4.4.2) |
| REVISION_03 §3.1 `기업 맞춤 지원사업` 하위 메뉴 "기업 진단 · 맞춤 추천", 주 메뉴를 누르면 `/diagnose/result` | 하위 메뉴는 **맞춤 추천 하나**이고, 주 메뉴를 누르면 `/programs/recommended`가 열린다 (§4.1) |
| REVISION_03 §1 제약 "`frontend/src/data/`(테스트 데이터 JSON)는 지우지 않는다" | 사용자 지시로 **이번 개정에서 지운다**. 지우는 대상은 §3.3 목록뿐이다 |
| REVISION_03 §4 "로그인 후 첫 화면은 수출 로드맵" | 관리자 계정은 **관리자 홈(`/admin`)**으로 간다. 그 밖의 계정은 그대로 수출 로드맵이다 (§5.2) |
| `frontend/server/auth/core.ts` "두 계정 모두 관리자 권한이 없다(관리자 기능 자체가 없다)", README "관리자 계정은 만들어 두지 않았습니다" | 데모 계정(`DEMO_LOGIN_ID`, 현재 `ADMIN`)의 역할을 **`admin`**으로 바꾸고 관리자 영역을 연다. 환경변수 이름은 그대로다 (§5.1) |
| REVISION_03_TEST_ACCOUNT §6 기대 결과(추천 9건), §7 기준일 `2026-10-15 (PoC 데이터 기준)` | 공고 데이터를 지우므로 **적용하지 않는다.** TEST 계정과 그 기업 프로필은 그대로 둔다 (§3.3) |

---

## 1. 목표와 반드시 지킬 제약

**목표**

1. 화면 어디에도 테스트 데이터 안내 카드, `초안 기준`, `샘플 데이터` 표시가 남지 않는다.
2. 사용자 화면의 공고 데이터가 비어 있고, 모든 공고 영역이 `-`와 빈 상태로 정상 표시된다.
3. `기업 맞춤 지원사업`에는 `맞춤 추천`만 남고, 기업 진단의 `판정 대상 공고` 카드는 수출 로드맵으로 옮겨진다.
4. 맞춤 추천은 `신청 가능 n` · `확인 필요 n` · `신청 불가 n` 탭과, 우측 상단에 적합도 점수가 있는 카드로 바뀐다.
5. `ADMIN` 계정으로 로그인하면 관리자 영역(관리자 홈 · 기업마당 API 수집 · KOTRA CSV 업로드 · 공고 검수 · 공고 관리 · 기준·설정)이 열린다. 다른 계정과 비로그인 사용자는 관리자 화면에 들어갈 수 없다.

**반드시 지킬 제약**

1. **지우는 것은 이 문서가 정한 것뿐이다.**
   - 지우는 파일·설정은 §3.1~§3.3, §4.1에 적은 것뿐이다.
   - 브라우저 저장 키 `export-support-matching:profile:v1`, `esm.applicationRecords.v1`, `esm.selfChecks.v1`, `esm.compareSelection.v1`(sessionStorage)와 테스트 계정 전용 키(`<기존 키>:account:<아이디>`)의 이름·형식·값을 바꾸거나 지우지 않는다. 관리 기록에 지금은 없는 공고 ID가 남아 있어도 지우지 않고, 화면에서 `공고를 찾을 수 없음`으로 처리한다.
   - 원문 PDF(`수출 지원사업 공고문/`), 정답세트 xlsx, `tools/dataset/`, `docs/contracts/engine-cases.json`, `backend/`, 기존 문서는 지우지 않는다.
   - Git 이력을 고치지 않는다. 강제 푸시, 기존 커밋·브랜치 삭제를 하지 않는다.
2. **가상 데이터를 만들지 않는다.** 참고 화면의 예시 값을 가져오지 않는다. 예: 공고명(`B2C 해외쇼핑몰 판매지원`, `(샘플)`이 붙은 공고 등), 건수(`12`, `7`, `3`, `1`, `214건`, `58건`), 날짜·시각, `관리자 김샘플`·`이샘플`, 인증키 `samplekey…`, 파일명 `kotra_notices_1106.csv`, 전략명, 키워드 연결 공고 수, `샘플 데이터` 배지. 관리자 화면의 수치는 저장소가 연결되기 전까지 `-`이고, 목록은 빈 상태다.
3. **동작을 꾸미지 않는다.** 저장소가 없어 결과를 남길 수 없는 버튼(지금 수집, 반영, 되돌리기, 승인, 반려, 병합, 게시 중지, 기준 저장 등)은 `ActionButton`의 비활성 상태와 `DisabledReason`으로 이유를 보여 준다. 누르면 성공한 것처럼 보이는 토스트나 가짜 진행 표시를 넣지 않는다. 브라우저 안에서 끝나는 동작(파일 선택·읽기·검사, 양식 내려받기, 입력 검증, 필터·탭)은 실제로 동작해야 한다.
4. **디자인은 현재 사이트에 맞춘다.** 참고 화면의 검은 알약 버튼, Inter 글꼴, 20px 카드 반경, `Export Compass` 로고, 노란 `샘플 데이터` 배지는 쓰지 않는다. 기존 `PageHeader`, `SectionCard`, `StatTile`, `StatusBadge`, `TabNav`, `SegmentedControl`, `EmptyState`, `NoticeBanner`, `DataValue`, `ActionButton`, `DisabledReason`, `AppModal`, 폼 컴포넌트(`form/*`)를 쓴다.
5. **비밀값을 남기지 않는다.** 인증키·비밀번호를 코드·Git·`frontend/dist`·로그에 남기지 않는다. 이번 개정에서는 관리자 화면에서 인증키를 입력받지 않는다(§8.2).
6. **바꾸지 않는 것:** 자격 판정·적합도·수출단계 진단·기회비용 계산 로직(`lib/engine/*`), 전체 공고·공고 달력·공고 상세·비교·지원사업 관리·커뮤니티의 동작. 이 문서가 지정한 문구와 연결 대상만 고친다.
7. **접근성을 유지한다.** 키보드로 모든 메뉴·탭·파일 선택·표를 쓸 수 있고, 현재 위치는 `aria-current`와 글자 굵기·밑줄로도 구분하며, 상태는 색만으로 구분하지 않는다.

---

## 2. 코드 수정 전 현황 조사

수정 전에 아래를 확인하고 `docs/revisions/revision_04_inventory.md`에 기록한다. 기록 후 바로 구현을 진행하며 중간 승인을 요청하지 않는다.

1. **Git:** 현재 브랜치(`revision-03-test-account`, 2026-11-01 운영 배포)와 `main`의 관계. 여기서 `revision-04` 브랜치를 만든다.
2. **바뀌는 것을 쓰는 곳:** 이 문서를 쓸 때 확인한 목록이다. 실제와 다르면 실제 목록으로 진행하고 차이를 기록한다.

   | 바뀌는 것 | 쓰는 파일 |
   |---|---|
   | `DataSourceNotice` | `ProgramRecommendedView.vue`, `ProgramListView.vue`, `ProgramCalendarView.vue`, `ProgramDetailView.vue`, `RoadmapView.vue`, `__tests__/revision02.spec.ts` |
   | `DraftTag`(`초안 기준`) | `EligibilityBadge.vue`, `ProgramCard.vue`, `ProgramDetailView.vue` |
   | 문구 `검수 전 초안` | `ProgramRecommendedView.vue`(추천 기준 안내), `ProgramDetailView.vue`(적합도 영역), `constants/options.ts`(`DATA_STATE_LABEL`) |
   | 문구 `테스트 데이터 기준` | `RoadmapView.vue`(우선 단계 공고 힌트), `DiagnoseResultView.vue`(판정 대상 공고 힌트) |
   | 경로 이름 `diagnose-result` | `constants/navigation.ts`, `router/index.ts`, `RoadmapView.vue`(기업 진단 보기), `DiagnoseInputView.vue`(입력 완료·'입력 중' 상태로 보기), 테스트 |
   | 테스트 데이터셋 | `data/test-dataset.json`, `data/test-dataset.meta.json`, `repositories/index.ts`, `repositories/staticProgramRepository.ts`, `repositories/programRepository.ts`(`test-dataset` kind, `dataBasisDate`), `types/dataset.ts`, `__tests__/revision02.spec.ts`, `__tests__/testAccount.spec.ts`, `.env.example`, `vitest.config.ts` |
   | 계정 역할 `demo` | `server/auth/core.ts`, `server/auth/handlers.ts`, `stores/authStore.ts`, `stores/accountScope.ts`, `server/__tests__/auth.spec.ts` |

3. **`샘플 데이터` 문자열:** 이 문서를 쓸 때 `frontend/src`에서는 찾지 못했다(참고 화면의 배지 문구). `frontend/`, `docs/`, 운영 사이트 빌드 결과까지 다시 검색해 위치를 기록하고, 있으면 지운다.
4. **Vercel 환경변수:** `VITE_DATA_SOURCE`가 Production·Preview에 있는지(값 이름만 기록).
5. **로그인 계정:** `DEMO_LOGIN_ID`가 `ADMIN`인지 확인한다. 비밀번호는 확인하거나 기록하지 않는다.
6. **기업 진단에만 있는 기능:** `DiagnoseResultView.vue`가 쓰는 컴포넌트(`ProfileSummary`, `ProfileStatusBadge`, `ExportStageCriteriaNote` 등) 중 다른 화면에서 쓰지 않게 되는 것을 적는다. 다른 곳에서 쓰면 남기고, 쓰는 곳이 없어지면 지운다.

---

## 3. 전체 공통

### 3.1 테스트 데이터 안내 카드 삭제

`테스트 데이터 · 기업마당 수출지원 공고 60건(검수 전 초안) · 기준일 2026-10-15 (PoC 데이터 기준)`과 `자세히` 펼침을 보여 주는 카드를 모든 화면에서 없앤다.

- `components/common/DataSourceNotice.vue`를 지우고, 사용하는 5개 화면(맞춤 추천, 전체 공고, 공고 달력, 공고 상세, 수출 로드맵)에서 import와 태그를 뺀다. 빠진 자리에 빈 간격이 남지 않게 정리한다.
- `DATA_STATE_LABEL`이 다른 곳(공고 상세의 데이터 상태 행 등)에서 쓰이면 남긴다.

### 3.2 `초안 기준`·`샘플 데이터` 삭제

- `components/common/DraftTag.vue`를 지우고 `EligibilityBadge.vue`, `ProgramCard.vue`, `ProgramDetailView.vue`에서 뺀다. `EligibilityBadge`의 `dataState` prop이 다른 용도로 쓰이지 않으면 함께 정리한다.
- 문구를 다음과 같이 고친다.

  | 위치 | 지금 | 바뀐 뒤 |
  |---|---|---|
  | 맞춤 추천 `추천 기준 안내` 마지막 목록 | `모든 판정에는 데이터 상태(검수 전 초안 등), 기준일, 판정 기준 버전을 함께 표시합니다.` | `모든 판정에는 기준일과 판정 기준 버전을 함께 표시합니다.` |
  | 공고 상세 `얼마나 잘 맞나요?` 안내 | `검수 전 초안 데이터로 계산한 점수입니다 [초안 기준]. 재무 상태는 …` | 앞 문장(`검수 전 초안 데이터로 …[초안 기준].`)만 지우고 뒤 문장은 그대로 |
  | 수출 로드맵 `우선 단계 공고` 힌트 | `신청 불가 제외 · 테스트 데이터 기준` | `신청 불가 제외` |
  | 컴포넌트 주석(JSDoc) | 테스트 데이터·초안 설명 | 실제 동작에 맞게 갱신 |

- `샘플 데이터`: §2-3에서 찾은 곳이 있으면 지운다. 참고 화면의 `샘플 데이터` 배지는 넣지 않는다.
- **그대로 두는 것:** 적합도의 `시험용 기준 v0 · 검증 전`, `시험용 v0`처럼 **계산 기준의 상태**를 알리는 표시는 REVISION_02 §7.6에 따라 유지한다. 이것은 데이터가 초안이라는 표시가 아니다.

### 3.3 공고 데이터 전부 삭제

**지우는 것**

| 대상 | 처리 |
|---|---|
| `frontend/src/data/test-dataset.json`, `test-dataset.meta.json` | 삭제 |
| `repositories/index.ts`의 `VITE_DATA_SOURCE=test-dataset` 분기 | 삭제. 저장소 선택은 `VITE_API_BASE_URL`이 있으면 API, 없으면 빈 저장소 |
| `StaticProgramRepository` 클래스와 `loadTestDataset` | 삭제. 순수 함수(`filterPrograms`, `sortPrograms`, `matchesKeyword`, `compareProgramIds`, `normalizeDatasetProgram`→`normalizeProgram`)는 `lib/programQuery.ts`로 옮겨 남긴다. 전체 공고 정렬과 다음 개정의 API 저장소·관리자 화면에서 다시 쓴다 |
| `DataSourceStatus`의 `test-dataset` kind | 삭제 → `not-connected` \| `api`. `dataBasisDate()`는 지금 항상 `null`을 돌려준다. 다음 개정에서 API 응답의 기준일(`meta.asOf`)을 쓰도록 자리만 남긴다(주석) |
| `types/dataset.ts` | 관리자 정답세트 검사(§11.3)에서 형식 타입이 필요하면 `types/answerSet.ts`로 옮겨 쓰고, 필요 없으면 삭제 |
| `.env.example`의 `VITE_DATA_SOURCE` 항목, `vitest.config.ts`의 같은 env | 삭제 |
| 로컬 `frontend/.env.local`의 `VITE_DATA_SOURCE` 줄 | 삭제(파일 내용을 출력하지 않는다) |
| Vercel 환경변수 `VITE_DATA_SOURCE` (Production·Preview) | 저장소 루트에서 `npx vercel env rm VITE_DATA_SOURCE production`, `… preview` 후 다시 배포. 권한이 없으면 사용자가 할 일로 보고 |

**지우지 않고 표시만 하는 것**

- `docs/data/test-dataset-report.md`: 맨 위에 `> REVISION_04에서 앱의 공고 데이터에서 제거되었습니다. 기록용으로 남깁니다.` 한 줄을 넣는다.
- `tools/dataset/README.md`: 맨 위에 `> 앱은 REVISION_04부터 이 JSON을 읽지 않습니다. 변환 규칙은 관리자 화면의 정답세트 검사(REVISION_04 §11.3) 기준으로 남깁니다.`를 넣는다.

**삭제 후 화면 상태 (모두 확인)**

- 전체 공고·맞춤 추천·공고 달력·둘러보기: 결과 건수 `-`, `현재 등록된 지원사업 공고가 없습니다.` 빈 상태. `0건`으로 표시하지 않는다.
- 수출 로드맵: `우선 단계 공고`·`판정 대상 공고`·단계별 공고 수 `-`(`공고 등록 전`).
- `/programs/P001` 등 예전 공고 주소: `해당 공고를 찾을 수 없습니다.` (크래시 없음)
- 지원사업 관리에 남은 예전 공고 기록: 오류 없이 `공고를 찾을 수 없음`으로 표시되고 기록은 지워지지 않는다.
- TEST 계정: 로그인과 기업 프로필(`EC 테스트식품(주)`), 수출 로드맵의 현재 단계 `내수`는 그대로다. 추천은 공고가 없으므로 빈 상태다.

**테스트:** 테스트 데이터셋에 기대던 테스트(`revision02.spec.ts`, `testAccount.spec.ts` 등)는 `__tests__/fixtures.ts`의 테스트 전용 공고로 바꾼다. 테스트 전용 공고는 앱 번들에 들어가지 않아야 한다. REVISION_03_TEST_ACCOUNT §6(추천 9건) 검증 테스트는 지우거나 fixture 기반 엔진 테스트로 대체하고 inventory에 적는다.

---

## 4. 기업 맞춤 지원사업

### 4.1 기업 진단 삭제

- `views/diagnose/DiagnoseResultView.vue`와 경로 `diagnose-result`를 없앤다. `/diagnose/result`는 `moved('roadmap')`으로 **수출 로드맵**에 보낸다(쿼리·해시 유지). 예전 주소 `/diagnose`, `/diagnose/input`은 지금처럼 기업 프로필로 간다.
- `constants/navigation.ts`의 `find` 섹션 하위 메뉴를 `[{ label: '맞춤 추천', routeName: 'programs-recommended' }]` 하나로 바꾼다. 상단 하위 메뉴 패널, 모바일 서랍, 화면 안 하위 메뉴(`SectionNav`)는 이 정의를 따르므로 자동으로 바뀐다. 하위 메뉴가 하나여도 탭 1개를 그대로 보여 준다(수출 로드맵과 같음). 주 메뉴 `기업 맞춤 지원사업`을 누르면 `/programs/recommended`가 열린다.
- 기업 프로필(`DiagnoseInputView.vue`)의 이동과 문구:

  | 위치 | 지금 | 바뀐 뒤 |
  |---|---|---|
  | `입력 완료` 후 이동 | 기업 진단 | 수출 로드맵 (토스트 `기업정보 입력을 마쳤습니다.` 그대로) |
  | 빠진 항목 안내 버튼 | `'입력 중' 상태로 진단 화면 보기` → 기업 진단 | `'입력 중' 상태로 수출 로드맵 보기` → 수출 로드맵 |
  | 빠진 항목 안내 문장 | `지금 진단 화면을 보면 프로필은 '입력 중'으로 표시되며, …` | `지금 수출 로드맵을 보면 프로필은 '입력 중'으로 표시되며, …` |

- 기업 진단에만 있던 `확인이 필요한 항목`, `입력한 기업정보` 요약, `다음으로 할 일`은 사용자 지시대로 함께 없앤다. 빠진 필수 항목은 기업 프로필의 완료 확인 패널이 이미 단계별로 보여 준다. 수출단계·다음 단계 조건·측정 기간 안내(`periodNote`)·기준 안내(`ExportStageCriteriaNote`)는 수출 로드맵에 이미 있다.
- 테스트: `diagnose-result`를 여는 테스트를 리다이렉트 테스트로 바꾼다.

### 4.2 `판정 대상 공고` 카드를 수출 로드맵으로 옮기기

`RoadmapView.vue` 상단 지표 4개 중 마지막 `단계 가중치 버전` 카드를 지우고, 그 자리에 기업 진단의 `판정 대상 공고` 카드를 넣는다.

| 순서 | 카드 | 비고 |
|---|---|---|
| 1 | 현재 수출단계 | 그대로 |
| 2 | 우선 지원 단계 | 그대로 |
| 3 | 우선 단계 공고 | 힌트만 `신청 불가 제외`로 (§3.2) |
| 4 | **판정 대상 공고** (새로 옮김) | 아래 |

- 값: 공고가 연결되어 있고 계산이 끝났으면 `신청 불가`를 뺀 공고 수(`n건`), 아니면 `null` → `-`. 계산식은 기업 진단의 `recommendableCount`를 그대로 옮긴다.
- 아이콘 `IconReportAnalytics`, 톤 `neutral`, 힌트: 공고 연결 시 `신청 불가 제외`, 아니면 `공고 등록 전`. 공고 연결 시 카드를 누르면 맞춤 추천으로 간다(`to`).
- `단계 가중치(stage-phase-v0)` 버전은 사용자 화면에서 카드로 보여 주지 않고 관리자 `기준·설정`에서 보여 준다(§12.3). 로드맵 상단 `로드맵을 볼 때` 안내 문장은 그대로 둔다.

### 4.3 수출 로드맵의 `기업 진단 보기` 버튼 삭제

`RoadmapView.vue`의 `PageHeader` `#actions`(기업 진단 보기 버튼)를 지운다. 쓰지 않게 된 import는 정리한다.

### 4.4 맞춤 추천 개편

#### 4.4.1 화면 구성 (위에서 아래로)

1. **제목 영역(`PageHeader`):** 제목 `맞춤 추천`. 설명을 `입력한 기업정보를 기준으로 공고를 신청 가능 여부와 적합도 순으로 보여 드립니다.`로 바꾼다. 기준 프로필(기업명·프로필 상태·기업정보 입력/수정 링크)은 그대로다.
2. **공통 확인 사항(`CommonChecksPanel`):** 지금처럼 공고가 연결되어 있을 때만 보인다.
3. **상태 탭 3개:** `신청 가능 n` · `확인 필요 n` · `신청 불가 n` (§4.4.2).
4. **정렬 안내 한 줄:** `적합도가 높은 순으로, 같으면 마감이 가까운 순으로 보여 드립니다.`
5. **카드 목록:** 선택한 탭의 공고 (§4.4.3).
6. **추천 기준 안내(펼침):** 유지, 문구만 고친다 (§4.4.5).
7. **하단 비교 바(`CompareDock`):** 유지.

**없애는 것:** 검색창, 좌측 필터, 모바일 `필터` 버튼과 필터 창, 결과 바(`추천 결과 n건`, 정렬 선택, 정렬 비활성 이유, `적용한 조건` 칩, `필터 초기화`, `전국 대상 공고도 함께 표시됩니다.`), `전체` 탭.

**구현 방식**

- 맞춤 추천을 `ProgramBrowser`의 `mode="recommended"`에서 떼어 새 컴포넌트 `components/programs/RecommendationList.vue`로 만든다. `ProgramBrowser`는 전체 공고 전용으로 단순화한다(전체 공고의 검색·필터·정렬·카드·비교는 그대로).
- 맞춤 추천은 `useProgramFilters`를 쓰지 않는다. 공고 목록은 필터와 무관한 전체 공고(`useProgramEvaluations()`의 공고와 판정 결과)를 쓴다.
- 주소: `/programs/recommended?tab=eligible|needs-check|ineligible`. 예전 쿼리(`q`, `status`, `stage`, `cat`, `agency`, `region`, `method`, `sort`)가 붙어 와도 무시하고 오류 없이 열린다.

#### 4.4.2 상태 탭

- 순서와 이름은 `ELIGIBILITY_STATUS_OPTIONS` 그대로(`신청 가능` · `확인 필요` · `신청 불가`), 이름 옆에 건수 숫자를 붙인다(`TabNav`의 `count`). 건수는 전체 공고 중 그 상태의 공고 수다.
- 공고가 연결되지 않았거나 계산 전이면 건수는 `-`(0이 아님)이고, 패널에는 지금의 빈 상태(`현재 등록된 지원사업 공고가 없습니다.` + `기업정보 확인하기`)를 보여 준다.
- **기본 탭:** 쿼리 `tab`이 없으면 `신청 가능` → `확인 필요` → `신청 불가` 순서로 1건 이상인 첫 탭을 연다. 모두 0건이거나 `-`이면 `신청 가능`을 연다.
- 탭을 바꾸면 `router.replace`로 쿼리를 바꾸고 스크롤 위치는 유지한다. 방향키 이동 등 키보드 동작은 지금 `TabNav` 그대로다.
- 0건인 탭도 고를 수 있고, 패널에는 `이 상태에 해당하는 공고가 없습니다.`를 보여 준다.
- 탭 안 정렬: `compareRecommended`(적합도 높은 순 → 마감 빠른 순 → ID). 정렬 선택은 없다.
- **판정 결과가 없는 공고**(자격 규칙이 없어 `eligibility`가 `null`): 어느 탭에도 넣지 않는다. 그런 공고가 1건 이상이면 탭 아래에 `자격 조건이 등록되지 않아 판정하지 않은 공고 n건이 있습니다.`와 `전체 공고에서 보기` 링크를 보여 준다. `확인 필요`로 대신 분류하지 않는다(CLAUDE.md §2-1).

#### 4.4.3 카드 (`RecommendationCard.vue` 개편)

참고 화면의 카드 구조를 따른다. 데스크톱 배치:

```
┌────────────────────────────────────────────────────────────┐
│ [신청 가능]                                         적합도 │
│ 공고명 (상세로 가는 링크)                             82점 │
│ 주관기관 · 수행기관                              시험용 기준 │
│ ────────────────────────────────────────────────────────── │
│ 신청 마감            지원 내용          지원금      자부담  │
│ 12월 18일 (42일 남음) 국제운송          최대 …      30%     │
│ ────────────────────────────────────────────────────────── │
│ 계산 근거 보기 ▾                                            │
│ [자세히 보기]  [관심사업 저장]  [비교에 추가]               │
└────────────────────────────────────────────────────────────┘
```
(위 숫자는 배치 설명용이다. 화면에는 실제 계산 값만 나온다.)

| 위치 | 항목 | 값 | 값이 없을 때 |
|---|---|---|---|
| 왼쪽 위 | 신청자격 배지 | `EligibilityBadge` (직접 확인 n개 포함 표시는 유지, `초안 기준`은 없음) | `-` |
| 왼쪽 위 | 공고명 | `programTitleText`, `h3` 안의 링크 → 공고 상세(`?from=recommended`) | `공고명 없음` |
| 왼쪽 위 | 기관 | `agencyText`(주관 · 수행) | `-` |
| **오른쪽 위** | **적합도** | 작은 글자 `적합도` + 큰 숫자 `Math.round(fit.score)` + `점`, 그 아래 작은 글자 `시험용 기준` (REVISION_02 §7.6) | 큰 자리에 `-`, 아래 작은 글자로 사유: 신청 불가 → `신청 불가 공고는 계산하지 않습니다`, 그 밖 → `반영할 수 있는 항목이 부족합니다`(`FIT_UNAVAILABLE_REASON`) |
| 정보 칸 1 | 신청 마감 | 마감일이 있으면 `M월 D일`(기준일과 연도가 다르면 `YYYY년 M월 D일`), 데이터 기준일이 있으면 뒤에 `(n일 남음)`·`(오늘 마감)`·`(마감)` | 마감일이 없으면 기간 메모(`applyPeriodNote`, 예: 예산 소진 시까지), 그것도 없으면 `-` |
| 정보 칸 2 | **지원 내용** | 한 줄 (§4.4.4) | `-` |
| 정보 칸 3 | 지원금 | `maxAmountText`(최대 n원), 없으면 금액 메모(`amountNote`) | `-` |
| 정보 칸 4 | 자부담 | `selfPaymentText` | `-` |
| 아래 | 계산 근거 보기 | 지금 그대로(`FitBreakdownTable`) | |
| 아래 | 버튼 | `자세히 보기`(주 버튼, 공고 상세로), `관심사업 저장`(관리 기록이 있으면 `관리 상태: …`), `비교에 추가`/`비교에서 빼기` — 동작은 지금 그대로 | |

- **`추천 이유` 줄을 지운다.** 적합도 근거 문장(`fit.reasons`)은 `계산 근거 보기` 표에서 계속 볼 수 있다.
- 남은 일수는 **데이터 기준일**로 계산한다. 기준일이 없으면 `(n일 남음)`을 붙이지 않는다. 시스템 날짜로 대신하지 않는다.
- 적합도 숫자: `--color-primary-strong`, 굵게, 32~36px. 화면낭독기용 이름은 `적합도 82점, 100점 만점, 시험용 기준`처럼 읽히게 한다. 점수 막대·별점 같은 장식은 넣지 않는다.
- 지원 내용·지원금이 길면 한 줄 말줄임(`…`)과 `title` 속성으로 전체를 보여 준다.
- 모바일(575px 이하): 위쪽은 `[배지·공고명·기관 | 적합도]` 두 열을 유지하되 적합도 열 최소 너비 72px, 숫자 28px. 정보 칸 4개는 2열, 버튼은 줄바꿈한다.
- 카드 바탕·테두리·반경·간격은 지금 `surface-card`와 토큰을 쓴다.

#### 4.4.4 지원 내용 한 줄

`lib/programDisplay.ts`에 `supportContentLine(p: Program | null): string | null`을 새로 만든다. (이름이 비슷한 기존 `supportSummaryText`는 다른 화면에서 쓰므로 바꾸지 않는다.)

1. `summaryEasy`가 있으면(앞뒤 공백 제거 후 빈 문자열이 아니면) 그 값. 관리자 검수의 `지원 내용 한 줄`, KOTRA CSV의 `지원 내용` 칸, 정답세트의 선택 열(§11.3)에서 들어올 값이다.
2. 없으면 세부 분야 이름(`supportCategories` → `categoryName`): 앞의 2개를 ` · `로 잇고, 나머지는 ` 외 n개`. 예: `해외규격인증 · 홍보/광고 외 1개`.
3. 둘 다 없으면 `null` → `-`.

새 문장을 지어내거나 원문을 자동 요약하지 않는다. 테스트로 세 경우를 모두 확인한다.

> 참고: 지금 정답세트(`EC_정답세트_150건_통합.xlsx`)의 `programs` 시트에는 한 줄 요약 열이 없다. 그대로 올리면 2번(세부 분야 이름)으로 표시된다.

#### 4.4.5 추천 기준 안내 문구

| 지금 | 바뀐 뒤 |
|---|---|
| `목록은 신청 가능 → 확인 필요 → 신청 불가 순서이고, 같은 상태 안에서는 적합도 높은 순 → 마감 빠른 순입니다.` | `신청 가능 · 확인 필요 · 신청 불가 탭으로 나누어 보여 드리고, 탭 안에서는 적합도 높은 순 → 마감 빠른 순입니다.` |
| `모든 판정에는 데이터 상태(검수 전 초안 등), 기준일, 판정 기준 버전을 함께 표시합니다.` | `모든 판정에는 기준일과 판정 기준 버전을 함께 표시합니다.` |

나머지 안내(신청 자격·적합도·준비 부담 설명, 가중치·버전 표시)는 그대로다.

---

## 5. 관리자 계정·권한·이동

### 5.1 역할

- `server/auth/core.ts`: `AccountRole`을 `'admin' | 'test'`로 바꾼다. `DEMO_LOGIN_ID`·`DEMO_LOGIN_PASSWORD` 계정(현재 `ADMIN`)의 역할이 `admin`이다. **환경변수 이름은 바꾸지 않는다**(Vercel 설정 변경 불필요). 파일 머리 주석과 `handlers.ts`의 응답 설명(`role: demo | test`)을 `admin | test`로 고친다.
- TEST 계정(`TEST_LOGIN_*`)은 역할 `test`(일반 기업 회원 권한)로 그대로 둔다.
- `/api/auth/login`, `/api/auth/me`는 `user: { id, role }`에서 `role: 'admin' | 'test'`를 돌려준다.
- `stores/authStore.ts`: `AuthRole = 'admin' | 'test' | 'member'`. `readUser`는 `'admin'` → `admin`, `'test'` → `test`, **그 밖의 모든 값 → `member`**(관리자로 보지 않는다. `member`는 앞으로 회원가입 회원용). `isAdmin` 계산값을 내보낸다.
- `stores/accountScope.ts`: 관리자 계정은 지금 데모 계정처럼 기기 공용 키를 쓴다(동작 변경 없음).
- **보안 메모:** 브라우저의 역할은 화면 이동에만 쓴다. 이번 개정에는 관리자 데이터 API가 없으므로 서버에 관리자 데이터도 없다. 다음 개정에서 `/api/admin/*`을 만들면 서버 함수가 세션 주체의 역할을 다시 확인하고 관리자가 아니면 403을 돌려준다(§13).

### 5.2 경로와 이동 규칙

| 화면 | 경로 | 이름 |
|---|---|---|
| 관리자 홈 | `/admin` | `admin-home` |
| 기업마당 API 수집 | `/admin/bizinfo` | `admin-bizinfo` |
| KOTRA CSV 업로드 | `/admin/kotra` | `admin-kotra` |
| 공고 검수 | `/admin/review` (`?id=`) | `admin-review` |
| 공고 관리 | `/admin/notices` (`?source=`, `?status=`, `?q=`, `?page=`) | `admin-notices` |
| 기준·설정 | `/admin/settings` | `admin-settings` |

- 라우트 `meta`: `{ title, layout: 'admin', adminMenu: '<키>', requiresAdmin: true }`. `RouteMeta` 타입에 `layout`, `adminMenu`, `requiresAdmin`을 추가한다. 관리자 경로는 `NavSectionKey`(사용자 섹션)를 쓰지 않는다.
- `frontend/vercel.json`의 SPA rewrite가 `/admin/*`도 `index.html`로 보내는지 확인한다(지금 규칙은 `/api/`만 제외하므로 바꿀 필요가 없을 것이다). Django의 `/admin/`은 별도 백엔드 도메인이므로 겹치지 않는다.
- 이동 규칙(`router/index.ts`의 `authNavigationTarget`, `lib/redirect.ts`의 `safeRedirect`·`afterLoginPath`를 역할을 받도록 확장하고 순수 함수 테스트로 확인):

  | 상황 | 결과 |
  |---|---|
  | 비로그인으로 `/admin/*` | `/login?redirect=<그 경로>` |
  | 관리자가 아닌 계정으로 `/admin/*` | `/roadmap`으로 보내고 토스트 `관리자 계정만 볼 수 있는 화면입니다.` |
  | 관리자가 `/` | `/admin` |
  | 관리자가 `/login` | 안전한 redirect 또는 `/admin` |
  | 관리자 로그인 성공, redirect 없음·거부 | `/admin` |
  | 관리자 로그인 성공, redirect가 사용자 화면 | 그 화면 (사용자 화면 미리보기) |
  | 관리자가 아닌 계정 로그인 성공, redirect가 `/admin/*` | redirect 거부 → `/roadmap` |
  | 그 밖의 계정 | 지금 규칙 그대로 (REVISION_03 §4) |
  | 로그아웃 (모든 계정) | `/` (지금 그대로) |
  | `/admin/없는-경로` | `페이지를 찾을 수 없음` |

- 관리자도 사용자 화면을 열 수 있다(관리자 헤더의 `사용자 화면 보기`). 사용자 화면에서 관리자의 프로필 팝업 항목은 `관리자 홈` · `로그아웃`이다(기업 프로필 항목은 관리자에게 보이지 않는다).
- 로그인 화면 안내에 한 줄을 추가한다: `기업 회원은 수출 로드맵으로, 관리자 계정은 관리자 홈으로 이동합니다.`

### 5.3 관리자 메뉴는 사용자 메뉴에 넣지 않는다

`NAV_SECTIONS`(사용자 주 메뉴 5개)는 §4.1의 수정 외에 바꾸지 않는다. 관리자 메뉴는 별도 상수 `ADMIN_NAV_ITEMS`(`constants/adminNavigation.ts`)로 정의하고, 사용자 헤더·서랍·하위 메뉴 패널에는 어떤 관리자 항목도 나오지 않는다.

---

## 6. 관리자 영역 공통

### 6.1 레이아웃과 헤더

- `App.vue`: `route.meta.layout === 'admin'`이면 사용자 `AppHeader` 대신 `AdminHeader`를 쓴다. 본문 폭(`--content-max`)·좌우 여백(`--page-gutter`)·바닥글은 사용자 화면과 같다.
- `AdminHeader` 한 줄 배치: `[로고: 아이콘 + 수출지원사업 매칭 + '관리자' 글자 → /admin] [관리자 메뉴 6개] ………… [사용자 화면 보기 → /roadmap] [프로필 버튼 → 팝업 '관리자 홈'·'로그아웃']`.
- 관리자 메뉴(순서 고정, 하위 메뉴 없음): `관리자 홈` · `기업마당 수집` · `KOTRA 업로드` · `공고 검수` · `공고 관리` · `기준·설정`. 현재 화면은 `aria-current="page"`, 굵은 글씨, 강조 글자색, 3px 밑줄(사용자 상단 메뉴와 같은 표시). `<nav aria-label="관리자 메뉴">`.
- 991px 이하와 터치 기기: 메뉴 버튼으로 여는 서랍(`MobileNavDrawer` 재사용, 항목은 관리자 메뉴 6개 + `사용자 화면 보기`). 992px에서 한 줄에 넘치면 REVISION_03 §3.1처럼 상단 메뉴가 나오는 최소 폭을 1200px로 올리고 보고서에 적는다.
- 각 화면: `PageHeader`(제목 + 한 줄 설명). 관리자 화면에는 `SectionNav`가 없다.
- 브라우저 탭 제목: `<화면 제목> | 관리자 | 수출지원사업 매칭`.
- 표는 기존 표 스타일을 쓰고, 좁은 화면에서는 표 상자 안에서 가로 스크롤(`tabindex="0"`, `role="region"`, `aria-label`)한다.

### 6.2 저장소 연결 상태 안내

- 모든 관리자 화면의 제목 바로 아래에 `NoticeBanner`(tone `neutral`) 하나를 둔다.
  - 제목: `공고 저장소가 연결되지 않았습니다`
  - 본문: `수집·업로드·검수 결과를 저장할 서버 저장소가 아직 없습니다. 화면 구성과 파일 확인은 지금 쓸 수 있고, 저장이 필요한 기능은 저장소를 연결한 뒤 켜집니다.`
- 저장이 필요한 버튼은 `ActionButton` 비활성 + `DisabledReason`(`aria-describedby` 연결). 기본 이유 문구: `공고 저장소를 연결한 뒤 사용할 수 있습니다.` 화면마다 더 구체적인 이유가 있으면 그 문구를 쓴다.
- 저장소가 없을 때 수치는 `-`(`DataValue`), 목록은 `EmptyState`(compact)로 `표시할 내용이 없습니다` + `공고 저장소를 연결하면 이곳에 표시됩니다.`처럼 보여 준다. `0건`으로 표시하지 않는다.

### 6.3 관리자 데이터 경계 (`AdminRepository`)

공고 저장소(`ProgramRepository`)와 같은 방식으로 관리자 화면 전용 읽기·쓰기 경계를 만든다.

- 위치: `src/repositories/admin/` — `adminRepository.ts`(인터페이스), `emptyAdminRepository.ts`(지금 구현), `index.ts`(선택).
- `source: { kind: 'not-connected' } | { kind: 'api'; baseUrl: string }`, `canWrite: boolean`.
- 읽기: `getDashboard()`, `getCollectionSettings()`, `listCollectionRuns()`, `listUploads(kind)`, `listReviewQueue()`, `getReviewItem(id)`, `listNotices(query)`, `listDuplicateGroups()`, `listNoticeVersions(id)`, `getCriteriaSettings()`.
- 쓰기(인터페이스에만 선언): `runCollection()`, `saveCollectionSettings()`, `applyUpload()`, `revertUpload()`, `approve()`, `reject()`, `suspend()`, `republish()`, `merge()`, `keepSeparate()`, `saveCriteriaSettings()`.
- `EmptyAdminRepository`: `canWrite: false`. 읽기는 수치 `null`, 목록 `[]`를 돌려준다. 쓰기 메서드는 호출되지 않아야 하며(화면이 `canWrite`로 비활성 처리), 호출되면 `Error('not-connected')`를 던진다. 성공을 흉내 내지 않는다.
- 타입은 §13.1. 이번 개정에서 `/api/admin/*` 서버 함수와 `HttpAdminRepository`는 만들지 않는다.

### 6.4 공통 용어

| 구분 | 값 | 화면 이름 |
|---|---|---|
| 출처 | `bizinfo` · `kotra` · `answer-set` | 기업마당 · KOTRA · 정답세트 |
| 공고 상태 | `pending-review` · `published` · `suspended` · `rejected` · `merged` | 검수 대기 · 게시 중 · 게시 중지 · 반려 · 병합됨 |
| 접수 상태 (공고 상태와 별개) | `open` · `upcoming` · `closed` | 접수중 · 접수예정 · 마감 |
| 데이터 흐름 5단계 | | 수집 → 원문 저장 → 자동 추출·분류 → 관리자 검수 승인 → 사용자 반영 |

사용자 화면(맞춤 추천·전체 공고·달력·상세)에는 `published` 공고만 보인다(다음 개정에서 API가 지킨다).

---

## 7. 관리자 홈 (`/admin`)

설명: `오늘 수집한 공고와 검수할 일을 한눈에 확인합니다.` 제목 영역 메타에 `집계 시각` `-`(저장소 연결 후 서버 집계 시각).

1. **지표 4개**(`StatTile`, 누르면 해당 화면으로 이동). `검수 대기`는 테두리를 강조한다(참고 화면).

   | 지표 | 정의 (저장소 연결 후) | 보조 문구 | 이동 | 지금 |
   |---|---|---|---|---|
   | 오늘 수집 건수 | 한국 시간 오늘 0시부터 새로 저장된 공고 수 | `기업마당 n · KOTRA n` | 기업마당 수집 | `-` |
   | 검수 대기 | 상태가 `검수 대기`인 공고 수 | `가장 오래된 건 n일 전 수집` | 공고 검수 | `-` |
   | 마감 임박 (7일 이내) | 게시 중이고 마감일이 기준일부터 7일 이내 | `게시 중인 공고 기준` | 공고 관리(`?status=published`) | `-` |
   | 수집 오류 | 최근 수집 실행의 해결되지 않은 오류 수 | 마지막 오류 한 줄 | 기업마당 수집 | `-` |

2. **공고 데이터 흐름**(`SectionCard`, 설명 `사용자는 관리자가 승인한 공고만 봅니다. 단계별 현재 건수입니다.`): 5단계를 가로로(모바일은 세로) 보여 주는 `ol`. 단계 사이 화살표는 `aria-hidden`. `관리자 검수 승인` 단계를 강조한다.

   | 단계 | 설명 | 건수 (저장소 연결 후) |
   |---|---|---|
   | 수집 | 기업마당 API 자동, KOTRA CSV 수동 | 오늘 수집 |
   | 원문 저장 | 공고문과 첨부 파일 보관 | 누적 저장 |
   | 자동 추출·분류 | 자격 조건, 지원 분야 읽기 | 처리 중 |
   | 관리자 검수 승인 | 원문과 비교해 확인 | 검수 대기 |
   | 사용자 반영 | 맞춤 추천·전체 공고에 게시 | 게시 중 |

   지금 건수는 모두 `-`다.

3. **두 열:** `검수 대기`(최근 5건: 공고 · 출처 · 수집일, `전체 검수하기` → 공고 검수) / `마감 임박`(공고 · 마감 · 출처, `공고 관리로` → 공고 관리). 둘 다 지금은 빈 상태. 참고 화면의 `관심 저장 n개 기업` 열은 넣지 않는다(관심 기록은 각 사용자 브라우저에만 있어 집계할 수 없다).
4. **수집 오류** 표: 일시 · 출처 · 내용 · 상태 · 동작(`다시 수집` 비활성). 지금은 빈 상태.

---

## 8. 기업마당 API 수집 (`/admin/bizinfo`)

설명: `기업마당 공고를 정해진 주기에 자동으로 가져옵니다. 수출 분야 공고만 걸러 검수 대기로 보냅니다.`

### 8.1 수집 상태

- 연결 상태 배지 `연결 전`(neutral, 글자+아이콘). 저장소·인증키 연결 후에는 `연결됨`/`오류`.
- 값 4개: 마지막 수집 · 다음 수집 · 오늘 새 공고(수출 분야 n건) · 오류. 지금 모두 `-`.
- 오른쪽 위 주 버튼 `지금 수집` 비활성. 이유: `인증키와 공고 저장소를 연결한 뒤 사용할 수 있습니다.`

### 8.2 인증키

- 상태: `등록 안 됨`(StatusBadge).
- **이번 개정에서는 입력칸을 두지 않는다.** 저장할 수 없는 화면에 비밀값을 입력하게 하지 않기 위해서다.
- 안내: `인증키는 기업마당에서 발급받습니다. 저장소를 연결한 뒤 이 화면에서 등록하며, 서버에만 보관하고 화면에는 끝 4자리만 보여 줍니다. 코드와 Git에는 넣지 않습니다.`
- 버튼 `인증키 등록`, `연결 확인` 비활성.

### 8.3 수집 주기

- `주기` 선택(`매일` / `평일만` / `매주 월요일`), `시각` 선택(`오전 6시` / `오전 9시` / `오후 6시`), 체크 `수정공고도 다시 가져오기`.
- 화면에서 바꿀 수는 있지만 저장되지 않는다. 상태 배지 `저장 안 됨`, 버튼 `주기 저장` 비활성. 시각은 한국 시간 기준이라고 적는다.

### 8.4 수출 분야 필터

- 설명: `아래 조건 중 하나라도 맞는 공고만 검수 대기로 보냅니다. 나머지는 원문만 저장합니다.`
- 기업마당 지원분야 체크박스: `금융` · `기술` · `인력` · `수출` · `내수` · `창업` · `경영` · `기타`. 처음에는 `수출`만 체크한다(분야 코드는 §13.3, 구현 전 기업마당 공식 안내로 확인).
- `제목·본문 키워드`: 기존 `TagInput`으로 입력. **기본값은 비워 두고** 자리표시자 `예: 수출, 해외, 바이어`만 보여 준다. 입력 검증(1~20자, 중복 제거, 최대 50개)은 화면에서 실제로 동작한다.
- `키워드 사전은 기준·설정에서 함께 관리합니다.` + `기준·설정으로` 링크.
- `필터 저장` 비활성.

### 8.5 수집 로그

표: 일시 · 방식(`자동`/`지금 수집`) · 가져온 공고 · 수출 분야 · 수정공고 · 결과(`정상`/`오류 n건`). 오류가 있으면 표 아래에 오류 내용과 다음 처리(예: 다음 수집 때 다시 시도)를 한 줄로 보여 주는 자리. 지금은 빈 상태 `수집 기록이 없습니다.`

---

## 9. KOTRA CSV 업로드 (`/admin/kotra`)

설명: `KOTRA 공고는 정해진 양식의 CSV 파일로 직접 올립니다. 올린 공고는 검수 대기로 들어갑니다.`

### 9.1 단계 표시

`양식 내려받기`(선택) → `파일 올리기` → `미리보기·오류 확인` → `반영` 4단계를 `ol`로 보여 주고 지금 단계에 `aria-current="step"`과 강조를 준다. 파일을 고르기 전에는 `파일 올리기`, 검사가 끝나면 `미리보기·오류 확인`이 지금 단계다. `반영`은 저장소 연결 후에만 지금 단계가 될 수 있다.

### 9.2 양식 내려받기 (실제 동작)

- 안내: `양식의 열 이름과 순서를 바꾸지 마세요. 날짜는 2026-12-18처럼 씁니다.`
- 열 설명 표:

  | 열 | 필수 | 쓰는 법 | 저장 필드 |
  |---|---|---|---|
  | 공고명 | 필수 | 원문 제목 그대로 | `title` |
  | 주관기관 | 필수 | 예: KOTRA | `ministry` |
  | 수행기관 | 선택 | | `agency` |
  | 접수 시작일 | 선택 | `YYYY-MM-DD` | `applyStart` |
  | 마감일 | 필수 | `YYYY-MM-DD`, 또는 `예산 소진 시` · `연중 상시` · `연중 수시` 중 하나 | `applyEnd` 또는 `applyPeriodNote` |
  | 지역 | 필수 | `전국` 또는 시·도 이름. 여러 개는 `;`로 구분 | `regions` |
  | 지원 대상 | 선택 | 원문 문장 요약 | `targetDescription` |
  | 지원 분야 | 선택 | `C01`~`C15` 코드 또는 분야 이름. 여러 개는 `;` | `supportCategories` |
  | 지원 내용 | 선택 | 한 줄 요약(40자 이내 권장) | `summaryEasy` |
  | 원문 링크 | 필수 | `https://`로 시작 | `sourceUrl` |

- `CSV 양식 내려받기`: 브라우저에서 파일을 만든다. UTF-8 BOM + 머리글 한 줄만(예시 행 없음), 파일명 `kotra_notices_template.csv`.

### 9.3 파일 올리기 (실제 동작)

- 끌어다 놓는 영역 + `파일 선택`(`<label for>`로 연결된 숨긴 `input type="file"`, 키보드로 열 수 있음). `.csv`만, 5MB·1,000행까지.
- 안내: `파일은 서버로 보내지 않고 이 브라우저에서만 읽어 확인합니다.`
- 인코딩: UTF-8(BOM 유무 모두)로 먼저 읽고, 깨진 글자(`�`)가 나오면 EUC-KR(`TextDecoder('euc-kr')`)로 다시 읽는다. 엑셀의 `CSV (쉼표로 분리)` 저장 파일을 위해서다.
- CSV 해석은 따옴표 안의 쉼표·줄바꿈을 처리하는 파서로 한다(예: `papaparse`를 관리자 화면에서만 지연 로드).
- 고른 뒤: 파일명 · 읽은 시각 · 행 수, `다른 파일 선택`, `선택 지우기`.
- 머리글이 양식과 다르면(필수 열 없음, 이름·순서 다름) 표 대신 파일 단위 오류를 보여 준다.

### 9.4 미리보기·오류 확인 (실제 동작)

- 요약: `n행 중 정상 a행, 오류 b행, 중복 의심 c행입니다.` + 배지 3개(`정상` · `오류` · `중복 의심`, 글자+아이콘).
- 보기 선택(`SegmentedControl`): 전체 · 오류만 · 중복 의심만.
- 표: 행(파일 행 번호, 머리글이 1행) · 공고명 · 주관기관 · 마감일 · 지역 · 확인 결과(배지 + 사유). 오류 행은 옅은 오류 배경과 글자 사유를 함께 보여 준다.
- 행 검사 규칙(순수 함수 `validateKotraCsv`, 규칙마다 테스트):

  | 규칙 | 결과 | 사유 문구 예 |
  |---|---|---|
  | 필수 칸이 비어 있음 | 오류 | `공고명 칸이 비어 있음` |
  | 날짜가 `YYYY-MM-DD`가 아니거나 없는 날짜 | 오류 | `마감일 형식이 맞지 않음` |
  | 마감일 칸이 날짜도 허용 메모 3개도 아님 | 오류 | `마감일 형식이 맞지 않음` |
  | 접수 시작일이 마감일보다 늦음 | 오류 | `접수 시작일이 마감일보다 늦음` |
  | 지역이 `전국`·시·도 이름 밖 | 오류 | `지역 이름을 확인할 수 없음` |
  | 지원 분야가 C01~C15 코드·이름 밖 | 오류 | `지원 분야를 확인할 수 없음` |
  | 원문 링크가 `https://`로 시작하지 않음 | 오류 | `원문 링크 형식이 맞지 않음` |
  | 같은 파일 안에서 공고명·주관기관(공백·기호 정규화)과 마감일이 같음 | 두 번째 행부터 중복 의심 | `n행과 같은 공고로 보임` |

- 이미 저장된 공고(기업마당 수집 등)와의 중복은 저장소 연결 후 확인한다. 지금은 `저장된 공고와의 중복은 저장소를 연결한 뒤 확인합니다.` 한 줄을 보여 준다.
- 안내: `오류 행은 반영하지 않습니다. 파일을 고쳐 다시 올리거나, 오류 행만 빼고 반영할 수 있습니다. 중복 의심 행은 반영 후 공고 관리에서 병합 여부를 정합니다.`
- 버튼: `취소`(선택 지우기, 실제 동작), `오류 행 빼고 n건 반영하기`(n = 정상 + 중복 의심) **비활성**.

### 9.5 업로드 이력

- 설명: `반영을 되돌리면 그 파일로 들어온 공고가 모두 검수 대기와 게시에서 빠집니다.`
- 표: 일시 · 파일 · 반영 건수 · 올린 사람(계정 아이디) · 상태(`반영됨`/`되돌림`) · `되돌리기`. 지금은 빈 상태.
- 되돌리기 규칙(다음 개정): 확인 대화상자(`AppModal`) 필수. 그 파일로 들어온 공고 중 이미 승인·게시된 공고 수를 대화상자에 알린다.

---

## 10. 공고 검수 (`/admin/review`)

설명: `자동으로 읽은 자격 조건을 원문과 나란히 비교해 확인한 뒤 승인합니다. 승인한 공고만 사용자에게 보입니다.`

배치: 992px 이상은 왼쪽 대기 목록(약 1/3) + 오른쪽 상세, 그 아래는 목록 위·상세 아래.

### 10.1 대기 목록

- 제목 `대기 목록` + 건수 배지(`-`).
- 항목: 공고명 + 확인할 점 한 줄(예: 스캔 문서라 글자 인식 결과 확인, 표가 깨져 금액 확인). 수집일이 오래된 순. 선택 항목은 `aria-current="true"`와 강조, 주소 `?id=`.
- 지금은 빈 상태 `검수 대기 공고가 없습니다.`

### 10.2 상세

선택한 공고가 없으면 맨 위에 `왼쪽 목록에서 검수할 공고를 선택하세요.`를 보여 주고, 아래 구조는 `-`와 비활성 상태로 그대로 보여 준다(앞으로 쓸 기능의 위치를 알 수 있게).

1. **머리:** 공고명 · 주관기관 · 출처 · 수집일 · 접수 상태, 오른쪽에 확인할 점 배지.
2. **원문과 자동 추출 조건 나란히(2열, 좁으면 위아래):**
   - `공고 원문`: 원문 텍스트를 쪽 번호와 함께 스크롤 영역(최대 높이 480px)에 보여 주고, 추출에 쓰인 문장을 `mark`로 강조한다. `원문 전체와 첨부 파일 보기` 링크는 원문 주소가 있을 때만 활성.
   - `자동 추출 조건`: 행마다 `항목 · 값(입력칸) · 확실성(명확/애매) · 원문에서 보기`. 항목은 기존 자격 규칙 필드에 맞춘다: 본사 소재지, 공장 소재지, 기업 유형·규모, 업력, 매출액, 수출액, 업종, 인증, 마감일, 제외 조건(공통 확인 5가지), 우대 조건(가점·감점), 지원금. `원문에서 보기`를 누르면 왼쪽 원문의 그 문장으로 스크롤하고 강조한다. 안내 `수정한 값은 원문의 문장과 함께 저장됩니다.`
3. **분류 라벨 수정:**
   - `지원 분야`: 15개(C01~C15) 다중 선택 칩(`button` + `aria-pressed`).
   - `맞는 수출단계`: 내수 · 초보 · 유망 · 성장 · 강소 다중 선택(→ `targetExportStages`).
   - `지원 내용 한 줄`: 입력칸(40자 권장, 글자 수 표시) → `summaryEasy`. 맞춤 추천 카드의 `지원 내용`(§4.4.4 1번)으로 쓰인다.
   - 참고 화면의 `맞는 추천 경로`는 이번에 넣지 않는다. 추천 경로 목록이 확정되면(부록 B-2) 추가한다.
4. **승인 또는 반려:**
   - `검토 메모`(입력칸), `반려 사유`(선택: 수출 분야가 아님 · 마감된 공고 · 중복 공고 · 원문 확인 불가 · 기타 — `기타`면 메모 필수).
   - 버튼 `반려`, `승인하고 게시` 비활성.
   - 안내: `검토일과 검토자(계정 아이디)는 저장할 때 기록됩니다.`
   - 규칙(다음 개정): 승인 → 상태 `게시 중`, `dataState`는 `reviewed`(원문 주소와 검수일이 있으면 `verified`), 검토일·검토자 기록, 사용자 화면에 반영. 반려 → 상태 `반려`, 사유 필수. 둘 다 공고 관리에서 되돌릴 수 있다.

선택한 공고가 없거나 저장소가 없으면 입력칸·칩·버튼은 모두 비활성이다.

---

## 11. 공고 관리 (`/admin/notices`)

설명: `수집한 모든 공고를 출처와 상태별로 관리합니다. 중복 공고를 합치고, 수정공고의 버전을 확인합니다.`

### 11.1 공고 목록

- 필터: `출처`(전체 · 기업마당 · KOTRA · 정답세트), `상태`(전체 · 게시 중 · 검수 대기 · 게시 중지 · 반려 · 마감) — `SegmentedControl`. `공고명 검색`(공고명 또는 주관기관). 필터는 주소 쿼리(`source`, `status`, `q`, `page`)와 맞물리고 실제로 동작한다(빈 목록에 적용). `마감`은 공고 상태가 아니라 접수 상태(`closed`) 필터다.
- 건수: `전체 -건 중 -건 표시`.
- 표: 공고 · 출처 · 상태(배지) · 마감 · 버전 · 검토일 · 동작. 동작은 상태별로 `검수`(→ `/admin/review?id=`), `게시 중지`, `다시 게시`, 마감·병합됨은 없음. 페이지당 20건.
- 안내: `게시 중지한 공고는 사용자 맞춤 추천과 전체 공고에서 바로 빠집니다. 관심 공고로 저장한 기업은 그 공고를 다시 열 때 게시 중지 안내를 봅니다.`
- `게시 중지`는 확인 대화상자(사유 입력)를 거친다(다음 개정). 지금은 빈 상태 `표시할 공고가 없습니다.`

### 11.2 중복 병합 · 수정공고 버전 (두 열)

- **중복 병합:** 후보 그룹마다 두 공고(출처 · 수집일 · 공고명 · 마감 · 지역)와 같다고 본 이유(예: `공고명, 주관기관, 마감일이 같습니다.`), 버튼 `다른 공고로 유지` · `하나로 병합`. 후보 기준은 KOTRA 미리보기와 같은 정규화 함수를 쓴다. 병합 규칙(다음 개정): 남길 공고를 고른다(기본: 먼저 수집된 공고). 다른 쪽은 `병합됨`으로 숨기되 원문·출처 기록은 남기고, 되돌릴 수 있다. 지금은 빈 상태 `중복 의심 공고가 없습니다.`
- **수정공고 버전:** 목록의 `버전` 숫자를 누르면 그 공고의 버전 이력을 보여 준다(버전 n · 날짜 · 바뀐 점, 예: 마감일 a → b). 사용자에게는 최신 버전만 보인다. 버튼 `두 버전 비교`(항목별 차이 표), `원문 보기`. 지금은 `공고를 선택하면 버전 이력을 보여 드립니다.` 수정공고 판정(다음 개정): 기업마당 같은 공고 ID를 다시 가져왔을 때 내용이 바뀌었으면 새 버전.

### 11.3 검수 완료 데이터 일괄 반영 (정답세트)

사용자 결정: **검수 완료된 최종 공고 데이터는 관리자 화면에서 올린다.** 사이트맵에 별도 화면이 없으므로 `공고 관리` 화면 맨 아래 `SectionCard`로 둔다(제목 `검수 완료 데이터 일괄 반영`, 앵커 `#bulk`, 목록 위에 `검수 완료 데이터 올리기` 버튼으로 이동).

- **대상 파일:** 정답세트 xlsx — `programs` · `rules` · `bonuses` · `documents` 시트(1행 한글 머리글, 2행 영문 머리글, 3행부터 값), 참조용 `dictionary`·`inventory_150` 시트. 현재 형식 기준은 루트의 `EC_정답세트_150건_통합.xlsx`다.
- **흐름:** 파일 선택 → 브라우저에서 읽기 → 검사 결과 → 반영(**비활성**, 저장소 연결 후).
- **검사 규칙:** `tools/dataset/build_test_dataset.py`의 규칙을 TS 순수 함수 `validateAnswerSet`으로 옮긴다.

  | 결과 | 규칙 |
  |---|---|
  | 오류 (반영 막음) | 필수 시트·열 없음, `program_id` 중복, 없는 공고를 가리키는 `rules`·`bonuses`·`documents` 행, 사전(`dictionary`)에 없는 `field`·`op`, C01~C15 밖의 분류 코드 |
  | 경고 (반영 가능) | 숫자가 아닌 금액, 근거 문장·쪽이 빈 규칙, 게시일·접수기간 없음, `review_status`가 `검수대기`로 남은 행 수, 평가용 공고(`inventory_150`의 제안 split이 `test`) 포함 수 |
  | 제외 | `review_status`가 `삭제`인 행은 세지 않는다 |

  Python 스크립트는 평가용(test) 공고가 있으면 변환을 멈추지만, 서비스 데이터에 넣을지는 사용자가 정한다(부록 B-4). 그래서 여기서는 경고로 둔다.
- **결과 화면:** 요약(공고 n건 · 세부사업 포함 m행 · 규칙 a · 가점 b · 서류 c · 오류 x · 경고 y)과 공고별 표(공고ID · 공고명 · 규칙 수 · 검수 끝난 비율 · 결과), 오류·경고 목록(시트 · 행ID · 내용).
- **선택 열:** `programs` 시트에 `support_summary`(지원 내용 한 줄) 열이 있으면 `summaryEasy`로 읽는다. 없으면 `null`(§4.4.4 2번으로 표시).
- **반영 규칙(다음 개정):** 오류 0건일 때만. 검수가 끝난 공고는 바로 `게시 중`(`dataState` `reviewed`, 원문 주소·검수일이 있으면 `verified`), 검수 대기 행이 남은 공고는 `검수 대기`. 출처 `정답세트`. 업로드 이력·되돌리기는 KOTRA와 같다.
- **파서:** xlsx 읽기 라이브러리는 관리자 화면에서만 지연 로드한다. npm 레지스트리의 `xlsx`(SheetJS) 0.18.5는 알려진 취약점(CVE-2023-30533 등)이 있으므로 쓰지 않는다. `exceljs`처럼 유지되는 라이브러리나 SheetJS 공식 배포본(취약점이 고쳐진 버전)을 쓰고 선택 이유를 보고서에 적는다.
- **확인:** 같은 xlsx를 Python 스크립트(검사만)와 TS 검사로 각각 돌려 공고·규칙·가점·서류 수와 오류 목록이 같은지 비교하고 결과를 보고서에 적는다. 단위 테스트는 테스트 코드에서 만든 작은 xlsx로 한다. 루트의 정답세트 xlsx를 Git에 새로 추가하지 않는다(현재 추적 여부를 inventory에 기록).

---

## 12. 기준·설정 (`/admin/settings`)

설명: `수출단계 판정, 공고 분류, 적합도 계산에 쓰는 기준을 확인합니다. 바꾼 기준은 저장한 뒤 다음 계산부터 적용됩니다.`

**원칙:** 지금 코드에 있는 실제 기준을 상수에서 읽어 보여 준다(숫자를 화면 코드에 다시 적지 않는다). 편집 칸은 입력·검증까지만 동작하고 저장은 비활성이다. 참고 화면의 값(가중치 5개 항목, `[확인 필요]` 경계값, 14개 분야, 전략 예시)은 쓰지 않는다.

### 12.1 기준 시점

| 항목 | 표시 | 비고 |
|---|---|---|
| 판정 기준일 | 공고 데이터의 기준일(`dataBasisDate`). 지금 `-`(`공고 데이터 연결 후 표시`) | 접수 상태·남은 일수·업력 계산에 쓰인다 |
| 기준일 정하는 방식 | 선택 `고정 날짜` / `매일 자동 (한국 시간 오늘)` + 날짜 입력. 저장 비활성 | 안내: `시스템 날짜를 기준일로 쓰려면 '매일 자동'을 고르세요. 어느 방식이든 화면에 기준일을 함께 표시합니다.` (CLAUDE.md §2-6은 관리자가 이 방식을 고를 때만 바뀐다) |
| 수출실적 기준 연도 | `판정 기준일의 직전 연도` — 기준일이 없으면 기준표 연도(`programYear`) − 1 = 2025년 | `diagnoseExportStage` 규칙 그대로 |
| 기준 마지막 변경 | `-` | 저장소 연결 후 일시·계정 |

`기준 저장` 비활성.

### 12.2 수출단계 기준

- `ACTIVE_EXPORT_STAGE_CRITERIA`(`export-stage-v1`)의 구간을 표로: 단계 · 전년도 수출액(달러) 구간 · 상태(`확인됨`, 확인일 `verifiedAt`).
- 아래에 근거(공고명·쪽·원문 문구, 사본 주소 안내)를 보여 준다. 기존 `ExportStageCriteriaNote`를 쓸 수 있다.
- 지금 기준은 다섯 단계의 경계가 모두 원문으로 확인되어 있으므로 참고 화면의 `[확인 필요]`는 쓰지 않는다. 읽기 전용.

### 12.3 적합도 가중치

- `ACTIVE_FIT_CRITERIA` 항목 3개를 표로: 관심분야 일치도 `0.40` · 단계 일치도 `0.30` · 내용 유사도(시험용) `0.30`, 가점·감점 보정 상한 `±10`, 기준 버전 `fit-v0` · 상태 `검증 전 가설`.
- 가중치 입력칸(0.00~1.00, 0.05 단위)은 편집할 수 있고, 합계를 실시간으로 보여 준다. 합계가 1.00이 아니면 `합계가 1.00이어야 저장할 수 있습니다.` `가중치 저장` 비활성(이유: 저장소 연결 후. 저장하면 새 버전으로 기록되고 사람 평가 전까지 `검증 전`).
- **단계 가중치 표**(`STAGE_PHASE_WEIGHTS`, `stage-phase-v0`): 행 수출단계 5개 × 열 지원 단계 4개, 값 `◎ 1` · `○ 0.5` · `· 0.2`. 수출 로드맵에서 뺀 `단계 가중치 버전`(§4.2)을 여기서 보여 준다. 읽기 전용.
- **세부 분야 → 지원 단계 매핑**(`CATEGORY_PHASES`, `category-phase-v0`): 접어 두는 표(`details`), 읽기 전용.
- 참고 화면의 5개 항목(추천 경로, 우대 조건 충족 등)은 지금 엔진에 없는 항목이므로 쓰지 않는다.

### 12.4 제외코드

- 표: 코드 · 제외 조건(`COMMON_CHECK_KEY_LABEL`: 휴·폐업, 국세·지방세 체납, 금융 연체·신용, 참여제한·제재, 재무 상태(결산 기준)) · 판정에 쓰는 회사 정보(`공통 확인 사항 — 기업이 직접 답함`) · 연결된 규칙 수(공고 데이터 연결 후, 지금 `-`).
- 안내: `공통 확인으로 덮이지 않는 제외 조건(예: 4대보험 미납)은 공고별 직접 확인으로 판정합니다. 업종 제외 같은 조건은 각 공고의 자격 규칙으로 판정합니다.`
- 제외코드를 늘리려면 판정 엔진을 바꿔야 하므로 이번 개정에서는 화면에서 추가하는 버튼을 두지 않는다.

### 12.5 키워드 사전

- 표: 15개 지원 분야(C01~C15, `SUPPORT_CATEGORIES`) · 키워드 · 연결된 공고. 정해 둔 키워드가 아직 없으므로 키워드와 연결된 공고는 `-`.
- 설명: `기업마당에서 수집한 공고의 제목·본문 단어를 지원 분야로 분류(자동 추출 초안)하고, 수출 분야 필터에 쓸 키워드입니다.`
- `키워드 추가` 비활성. 15개를 모두 보여 준다(참고 화면은 14개 중 5개).

### 12.6 19개 전략표

- 구조만 만든다. 열: 번호 · 전략명 · 수출단계 · 추천 경로 · 지금 할 일 · 다음 목표 · 연결 지원 분야(C01~C15).
- 지금은 행이 없다. 빈 상태: `전략표가 아직 입력되지 않았습니다. 19개 전략의 이름·추천 경로·연결 분야가 확정되면 입력합니다.`
- `표 내려받기`: 머리글만 있는 CSV(UTF-8 BOM)를 브라우저에서 만든다(실제 동작). `전략 추가` 비활성.
- 주의: REVISION_02 §7.2에서 뺀 재무 군집 전략(A~D)·`전략 일치도`와 다른 것이다. 이번 개정에서는 적합도·로드맵 계산에 연결하지 않는다. 연결은 전략표 확정 후 별도 개정에서 한다.

---

## 13. 다음 개정을 위한 데이터 모델과 서버 계약 (타입과 문서만)

이번 개정에서는 아래 타입을 `src/types/admin.ts`에 정의하고 `EmptyAdminRepository`와 화면이 쓰게 한다. 서버 API는 문서로만 남긴다(`docs/architecture.md`에 추가).

### 13.1 타입

```ts
export type AdminNoticeSource = 'bizinfo' | 'kotra' | 'answer-set'
export type AdminNoticeStatus = 'pending-review' | 'published' | 'suspended' | 'rejected' | 'merged'

export interface AdminNoticeSummary {
  id: string
  title: string | null
  source: AdminNoticeSource
  sourceRef: string | null          // 기업마당 공고 ID, 업로드 ID 등
  status: AdminNoticeStatus
  receptionStatus: ReceptionStatus | null
  applyEnd: IsoDateTime | null
  applyPeriodNote: string | null
  version: number
  collectedAt: IsoDateTime
  reviewedAt: IsoDateTime | null
  reviewedBy: string | null
}

export interface AdminDashboard {
  asOf: IsoDateTime | null
  todayCollected: { bizinfo: number; kotra: number } | null
  pendingReview: number | null
  oldestPendingCollectedAt: IsoDateTime | null
  closingSoon: number | null
  collectionErrors: number | null
  pipeline: { collected: number; stored: number; extracting: number; pendingReview: number; published: number } | null
}

export interface CollectionSettings {
  schedule: 'daily' | 'weekdays' | 'weekly-mon'
  time: '06:00' | '09:00' | '18:00'          // 한국 시간
  refetchRevisions: boolean
  categories: string[]                         // 기업마당 지원분야
  keywords: string[]
  apiKeyStatus: 'missing' | 'registered' | 'invalid'
  apiKeyLast4: string | null
}

export interface CollectionRun {
  id: string
  trigger: 'schedule' | 'manual'
  startedAt: IsoDateTime
  finishedAt: IsoDateTime | null
  fetched: number
  exportMatched: number
  revised: number
  errors: { noticeRef: string | null; message: string; resolved: boolean }[]
}

export interface UploadRecord {
  id: string
  kind: 'kotra-csv' | 'answer-set'
  fileName: string
  uploadedAt: IsoDateTime
  uploadedBy: string
  appliedCount: number
  status: 'applied' | 'reverted'
}

export interface NoticeVersion {
  version: number
  publishedAt: IsoDate | null
  note: string | null                          // 최초 공고 / 수정공고
  changes: { field: string; before: string | null; after: string | null }[]
}
```

검수 항목(`ReviewItem`: 공고 요약 + 원문 쪽별 텍스트 + 추출 값과 근거 위치 + 라벨 + 메모), 중복 후보(`DuplicateGroup`), 기준 설정(`CriteriaSettings`)도 같은 파일에 정의한다. 필드 이름은 기존 `Program`·`EligibilityRule`과 맞춘다.

### 13.2 서버 API (다음 개정, 모두 관리자 세션 필요 — 서버가 역할을 확인하고 아니면 403)

| 메서드 · 경로 | 용도 |
|---|---|
| `GET /api/admin/dashboard` | 관리자 홈 |
| `GET·PUT /api/admin/bizinfo/settings` | 수집 주기·필터 |
| `POST /api/admin/bizinfo/key` | 인증키 등록(응답에 키를 돌려주지 않음) |
| `POST /api/admin/bizinfo/run` · `GET /api/admin/bizinfo/runs` | 지금 수집 · 수집 로그 |
| `POST /api/admin/uploads` · `GET /api/admin/uploads` · `POST /api/admin/uploads/:id/revert` | KOTRA CSV·정답세트 반영, 이력, 되돌리기 |
| `GET /api/admin/review` · `GET /api/admin/review/:id` · `POST /api/admin/review/:id/approve` · `…/reject` | 공고 검수 |
| `GET /api/admin/notices` · `POST /api/admin/notices/:id/suspend` · `…/republish` · `GET /api/admin/notices/:id/versions` | 공고 관리 |
| `GET /api/admin/duplicates` · `POST /api/admin/duplicates/:id/merge` · `…/keep` | 중복 병합 |
| `GET·PUT /api/admin/settings` | 기준·설정 |
| `GET /api/programs`, `GET /api/programs/:id` | 사용자 화면용, **게시 중 공고만**. 응답에 기준일(`meta.asOf`)을 넣어 `dataBasisDate`가 쓰게 한다 |

저장소는 다음 개정에서 사용자가 정한다(부록 B-1). 예약 수집은 한국 시간 설정을 UTC로 바꿔 등록한다.

### 13.3 기업마당 지원사업정보 API 참고 (구현 전 공식 안내로 다시 확인)

- 요청: `GET https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` — `crtfcKey`(인증키), `dataType=json`, `searchCnt`, `searchLclasId`(지원분야: 01 금융 · 02 기술 · 03 인력 · 04 수출 · 05 내수 · 06 창업 · 07 경영 · 09 기타로 알려져 있음), `hashtags`, `pageUnit`, `pageIndex`.
- 응답 필드 → 저장 필드: `pblancId` → 출처 ID(`sourceRef`), `pblancNm` → `title`, `jrsdInsttNm` → `ministry`, `excInsttNm` → `agency`, `reqstBeginEndDe` → `applyStart`·`applyEnd`(날짜가 아니면 `applyPeriodNote`), `pblancUrl` → `sourceUrl`, `creatPnttm` → `sourcePublishedAt`, `bsnsSumryCn`·`trgetNm` → 원문 텍스트(검수 화면), `pldirSportRealmLclasCodeNm`·`hashTags` → 수출 분야 필터 판단.

---

## 14. 문서·테스트·배포

### 14.1 문서

- `CLAUDE.md` 머리의 개정 반영 목록에 한 줄 추가: `테스트 데이터 정리·기업 진단 삭제·맞춤 추천 개편·관리자 영역은 docs/revisions/REVISION_04.md가 대체한다(충돌 시 개정 문서 우선). 반영 현황은 docs/revisions/revision_04_inventory.md 참고.`
- `docs/architecture.md`: 메뉴·경로 표(기업 진단 삭제, `/diagnose/result` 리다이렉트, 관리자 경로), 역할(§5), 데이터 경계(테스트 데이터셋 삭제, `AdminRepository`), 관리자 API 계약(§13), §8 `공고 데이터를 연결할 때 할 일`을 관리자 업로드 기준으로 갱신.
- `docs/deployment.md`: 환경변수 표에서 `VITE_DATA_SOURCE` 삭제, `DEMO_LOGIN_ID` 설명을 `관리자 계정 아이디`로, 배포 후 확인 목록 갱신(§14.3).
- `README.md`: 환경변수 표를 갱신하고, `관리자 계정은 만들어 두지 않았습니다` 줄을 `DEMO_LOGIN_*로 설정한 계정(ADMIN)이 웹 관리자 영역(/admin)을 씁니다`로 고친다.
- `docs/revisions/REVISION_04.md`: 이 문서 사본(비밀값이 없으므로 같은 내용). `docs/revisions/revision_04_inventory.md`: §2 조사와 반영 현황.

### 14.2 테스트 (vitest)

- 어떤 사용자·관리자 화면에도 `테스트 데이터`, `PoC 데이터 기준`, `초안 기준`, `샘플 데이터`가 렌더링되지 않는다(모든 라우트를 마운트해 텍스트 검사).
- 저장소 기본값이 빈 저장소이고 `test-dataset` 분기·데이터 파일 import가 없다. 빌드 결과에 테스트 데이터셋 청크가 없다.
- `/diagnose/result` → `/roadmap`(쿼리·해시 유지). `기업 맞춤 지원사업` 하위 메뉴는 맞춤 추천 1개, 주 메뉴는 `/programs/recommended`. 기업 프로필 `입력 완료`·`'입력 중' 상태로 수출 로드맵 보기` → `/roadmap`.
- 수출 로드맵: `판정 대상 공고` 카드가 있고 `단계 가중치 버전` 카드·`기업 진단 보기` 버튼이 없다.
- 맞춤 추천: 검색창·필터·정렬·`추천 결과` 문구·`전체` 탭이 없다. 탭 3개와 건수(데이터 없음 `-`). fixture로 탭 건수, 기본 탭 규칙, 탭 안 정렬, `?tab=` 동기화, 판정 없는 공고 안내를 확인한다.
- 카드: 적합도 `n점`과 `시험용 기준`, `fit`이 `null`일 때 `-`와 사유 2종, `추천 이유` 없음, 신청 마감 표시 규칙(기준일 유무), 지원 내용 3단계 우선순위, 지원금·자부담 `-`.
- 인증: 역할 `admin`·`test`·알 수 없는 값(`member`), §5.2 이동 규칙 표 전부(`authNavigationTarget`, `afterLoginPath`). 서버 테스트(`server/__tests__/auth.spec.ts`)의 역할 기대값 갱신.
- 관리자: 6개 경로 렌더링, 관리자 메뉴 `aria-current`, 비관리자·비로그인 접근 처리, 사용자 메뉴에 관리자 항목 없음, 저장이 필요한 버튼이 모두 `disabled`이고 이유가 연결됨, 참고 화면 예시 값(`샘플`, `김샘플`, `214`, `samplekey`)이 없음, `EmptyAdminRepository` 쓰기 메서드가 화면에서 호출되지 않음.
- CSV: 양식 머리글과 BOM, EUC-KR 파일 읽기, §9.4 규칙별 사례, 중복 의심.
- 정답세트 검사: §11.3 오류·경고 규칙별 사례(테스트 코드에서 만든 작은 xlsx).
- 가중치 합계 검증.
- 기존 테스트 중 테스트 데이터셋·기업 진단에 기대던 것을 바꾸고 무엇을 바꿨는지 inventory에 적는다.
- `npm run build`, 타입 검사, 린트, 전체 테스트가 통과한다.

### 14.3 Git·배포

1. `revision-03-test-account`에서 `revision-04` 브랜치를 만든다. 커밋은 작은 단위로 나눈다(공통 표시 정리 / 공고 데이터 삭제 / 기업 진단 삭제·로드맵 / 맞춤 추천 / 역할·이동 규칙 / 관리자 공통 / 관리자 화면별 / 문서·테스트).
2. Vercel 환경변수 `VITE_DATA_SOURCE`를 Production·Preview에서 지운 뒤, 저장소 루트에서 `npx vercel deploy --prod`로 운영 배포한다. `main`에는 병합하지 않는다.
3. 배포 후 새 탭에서 직접 열고 새로고침해 확인한다(`docs/deployment.md`에도 반영).
   - `/programs`, `/programs/recommended`, `/programs/calendar`, `/roadmap`: 테스트 데이터 카드 없음, 공고 없음 빈 상태, 건수 `-`.
   - `/programs/P001`: `해당 공고를 찾을 수 없습니다.`
   - `/diagnose/result` → `/roadmap`, 상단 `기업 맞춤 지원사업` 하위 메뉴가 맞춤 추천 하나.
   - `ADMIN` 로그인 → `/admin`. 관리자 메뉴 6개 화면, `사용자 화면 보기`, 로그아웃 → `/`.
   - `TEST` 로그인 → `/roadmap`(현재 단계 `내수`). 이 상태로 `/admin`을 열면 로드맵과 안내 토스트.
   - 비로그인 `/admin/review` → 로그인 화면 → `ADMIN`으로 로그인하면 `/admin/review`로 돌아온다.
   - `/admin/kotra`: 양식 내려받기, CSV 미리보기·오류 표시. `/admin/notices#bulk`: `EC_정답세트_150건_통합.xlsx` 검사 결과(수치를 보고서에 기록).
   - 모바일 360px: 관리자 서랍 메뉴, 표 가로 스크롤, 맞춤 추천 카드 배치.
   - 배포 JS에서 비밀번호·인증키·세션 키가 검색되지 않고, 서버 전용 변수에 `VITE_` 접두사가 없다(기존 검사 반복).

---

## 15. 완료 체크리스트

- [ ] 화면 어디에도 테스트 데이터 안내 카드, `초안 기준`, `샘플 데이터`가 없다.
- [ ] 테스트 데이터셋 파일·분기·환경변수가 없고, 모든 공고 영역이 `-`와 빈 상태로 정상 표시된다(크래시 없음).
- [ ] 브라우저 저장 데이터(기업 프로필·관리 기록·직접 확인 답·비교 선택·테스트 계정 프로필)가 그대로다.
- [ ] `기업 맞춤 지원사업`에는 `맞춤 추천`만 있고, `/diagnose/result`는 `/roadmap`으로 간다.
- [ ] 수출 로드맵에 `판정 대상 공고` 카드가 `단계 가중치 버전` 자리에 있고, `기업 진단 보기` 버튼이 없다.
- [ ] 맞춤 추천에 검색창·좌측 필터·정렬·`추천 결과 n건`이 없고, `신청 가능 n` · `확인 필요 n` · `신청 불가 n` 탭이 있다.
- [ ] 맞춤 추천 카드 우측 상단에 적합도 점수(또는 `-`와 사유)가 있고, `추천 이유` 대신 `지원 내용` 한 줄이 있다.
- [ ] `ADMIN`은 로그인하면 관리자 홈으로 가고, 6개 관리자 화면을 쓸 수 있다. 다른 계정·비로그인은 관리자 화면에 들어갈 수 없다.
- [ ] 관리자 화면에 참고 화면의 예시 값이 없고, 저장이 필요한 버튼은 모두 비활성 + 이유다.
- [ ] KOTRA 양식 내려받기, CSV 읽기·검사·미리보기, 정답세트 xlsx 검사, 관리자 필터·탭·입력 검증이 실제로 동작한다.
- [ ] 기준·설정이 코드의 실제 기준(수출단계 v1, 적합도 fit-v0, 단계 가중치 stage-phase-v0, 공통 확인 5가지, 15개 분야)을 보여 준다.
- [ ] 빌드·타입 검사·린트·테스트 통과, 운영 배포와 §14.3 확인 완료, 문서 갱신 완료.

---

## 16. 작업 후 보고할 내용

1. inventory 요약: 바뀐 파일, `샘플 데이터` 검색 결과, 지운 파일·환경변수와 남긴 것.
2. 기업 진단에서 사라진 정보와 대신 볼 수 있는 위치.
3. 맞춤 추천 전후 비교(데스크톱·모바일 화면 캡처, TEST 계정 기준).
4. 관리자 화면별로 **지금 실제로 동작하는 것**과 **저장소 연결 후 켜질 것**.
5. `EC_정답세트_150건_통합.xlsx` 검사 결과: 공고·세부사업·규칙·가점·서류 수, 오류·경고 수, 검수 대기 행 수, 평가용(test) 공고 수, Python 스크립트와의 비교 결과, 선택한 xlsx 파서와 이유.
6. 테스트·빌드 결과, 커밋 목록, 배포 URL.
7. 사용자 결정이 필요한 사항(부록 B).

---

## 부록 A. 이 문서가 정한 결정 사항

| 번호 | 결정 | 이유 |
|---|---|---|
| A-1 | 관리자 영역은 화면·동작 골격만, 저장이 필요한 동작은 비활성 | 사용자 결정 |
| A-2 | 맞춤 추천의 검색창·정렬도 없앤다 | 사용자 결정(참고 화면 구조, 전체 공고와 중복 방지) |
| A-3 | 최종 데이터 일괄 반영은 `공고 관리` 화면의 한 영역으로 둔다 | 사용자 결정(관리자 화면에서 업로드) + 사이트맵에 별도 화면 없음 |
| A-4 | `/diagnose/result`와 기업 프로필 완료 후 이동은 수출 로드맵 | 진단 결과가 로드맵에 있다 |
| A-5 | `전체` 탭 없음, 기본 탭은 1건 이상인 첫 탭 | 참고 화면 구조, 빈 탭에서 시작하지 않게 |
| A-6 | 판정 결과가 없는 공고는 탭에 넣지 않고 안내 | `확인 필요`를 근거 없이 쓰지 않는다(CLAUDE.md §2-1) |
| A-7 | 카드에 지원금·자부담 칸을 둔다 | 참고 화면의 카드 구조 |
| A-8 | 적합도 아래 `시험용 기준` 작은 글자를 남긴다 | REVISION_02 §7.6 (계산 기준 상태 표시) |
| A-9 | 관리자 = `DEMO_LOGIN_*` 계정(ADMIN), 환경변수 이름 유지 | 지금 ADMIN 계정을 바꾸라는 지시, 배포 설정 변경 최소화 |
| A-10 | 관리자가 아닌 계정의 `/admin` 접근은 로드맵 + 안내 | 관리자 화면 존재를 자세히 노출하지 않으면서 길을 잃지 않게 |
| A-11 | 인증키 입력칸을 두지 않는다 | 저장할 수 없는 화면에 비밀값을 입력하게 하지 않는다 |
| A-12 | 수집 필터 키워드 기본값은 비운다 | 근거 없는 설정값을 미리 채우지 않는다 |
| A-13 | 참고 화면의 적합도 5개 항목·`맞는 추천 경로` 라벨·제외코드 6개는 쓰지 않는다 | 지금 엔진에 없는 항목 |

## 부록 B. 사용자 결정이 필요한 사항

1. **공고 저장소:** 관리자 화면에서 최종 데이터를 실제로 반영하려면 서버 저장소가 필요하다(후보: Vercel에 연결하는 Postgres(Neon 등), 또는 기존 `backend/` Django + PostgreSQL 배포). 저장소를 연결하는 다음 개정 전까지 사용자 화면은 공고 없음 상태다.
2. **19개 전략표와 추천 경로 목록:** 전략명·수출단계·추천 경로·지금 할 일·다음 목표·연결 분야 값. 참고 화면의 추천 경로(첫 수출 준비 · 첫 거래 확보 · 직수출 전환 · 시장 다변화 · 현지화·확대)를 쓸지.
3. **지원 내용 한 줄:** 정답세트 `programs` 시트에 `support_summary` 열을 추가할지. 추가하지 않으면 카드의 지원 내용은 세부 분야 이름으로 표시된다.
4. **평가용(test split) 공고:** 서비스 데이터에 포함할지(포함하면 적합도 Precision@5 평가와 겹칠 수 있다).
5. **판정 기준일 방식:** 고정 날짜(데이터 기준일)와 매일 자동(한국 시간 오늘) 중 무엇을 기본으로 할지.

## 부록 C. 참고 화면 대응표

| 참고 화면 | 가져오는 것 (구조) | 가져오지 않는 것 |
|---|---|---|
| 맞춤 공고 | 상태 탭 3개와 건수, 카드 우측 상단 적합도, 정보 4칸(신청 마감·지원 내용·지원금·자부담), 자세히 보기·관심 저장 버튼 | 헤더(`Export Compass`, 회사명, `샘플 데이터`), 카드 아래 이유 문장, 확인 필요·신청 불가의 표 형식, 예시 공고·점수·날짜, 바닥글 기준일 문구 |
| 관리자 홈 | 지표 4개, 데이터 흐름 5단계, 검수 대기·마감 임박 목록, 수집 오류 표 | 모든 숫자·공고명·날짜, `관심 저장 n개 기업` 열 |
| 기업마당 API 수집 | 수집 상태, 인증키, 수집 주기, 수출 분야 필터, 수집 로그 | 인증키 값과 입력칸, 예시 키워드 기본값, 로그 행 |
| KOTRA CSV 업로드 | 4단계 표시, 양식·파일 올리기·미리보기(정상·오류·중복 의심)·반영, 업로드 이력·되돌리기 | 예시 파일명·행·올린 사람 |
| 공고 검수 | 대기 목록, 원문과 추출 조건 나란히, 분류 라벨, 승인·반려 | 예시 공고와 원문, `맞는 추천 경로` |
| 공고 관리 | 출처·상태 필터 목록, 중복 병합, 수정공고 버전, 게시 중지 | 예시 행, `전체 214건` |
| 기준·설정 | 기준 시점, 수출단계 기준, 적합도 가중치, 제외코드, 키워드 사전, 19개 전략표 | 참고 화면의 가중치 5개 항목, `[확인 필요]` 경계값, 예시 제외코드·키워드·전략 |
