# 설계 안내

이 문서는 공고 데이터를 연결하거나 판정 기능을 구현할 개발자를 위한 안내입니다.

## 1. 기본 원칙

1. **신청 자격과 적합도는 분리합니다.** 설명 순서는 `실제 신청 자격 → 적합도 → 준비 부담/기회비용`입니다.
2. **근거 없이 판정·추정하지 않습니다.** 공고 원문, 검증일, 규칙·기준 버전이 없으면 결과는 `null`이고 화면에는 `-`입니다.
3. **결측은 `null`입니다.** `''`, `0`, 오늘 날짜, 임의 URL을 결측 대신 저장하지 않습니다. 숫자 `0`과 `false`는 유효한 값입니다(예: 수출액 `0 USD`).
4. **가상 데이터를 만들지 않습니다.** 빈 배열은 빈 상태 컴포넌트로 보여 주며, 샘플 공고·회사·일정을 채우지 않습니다.

## 2. 경로

| 경로 | 이름 | 화면 |
|---|---|---|
| `/` | `home` | 메인 (소개·3단계 흐름·CTA·전체 메뉴) |
| `/diagnose/input` | `diagnose-input` | 기업정보 6단계 입력 (`?step=1~6`) |
| `/diagnose/result` | `diagnose-result` | 기업 진단 |
| `/programs` | `programs` | 전체 공고 (필터는 URL 쿼리: `q`, `status`, `stage`, `agency`, `region`, `method`, `sort`) |
| `/programs/recommended` | `programs-recommended` | 맞춤 추천 |
| `/programs/compare` | `programs-compare` | 공고 비교 (`?ids=a,b,c`, 최대 4개) |
| `/programs/:id` | `program-detail` | 공고 상세 (없는 ID는 "해당 공고를 찾을 수 없습니다.") |
| `/roadmap` | `roadmap` | 수출 로드맵 |
| `/mypage` 외 6개 | `mypage-*` | 마이페이지 홈·프로필·관심·준비·일정·이력·서류함 |

Vue Router history 모드이며, 배포 환경에서는 모든 경로를 `index.html`로 되돌리는 SPA fallback이 필요합니다(`frontend/vercel.json`).

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

- 계정·DB가 없으므로 기업 프로필은 사용자가 `다음`·`건너뛰기`·`임시 저장`·`저장`을 누를 때 **이 브라우저의 localStorage**에만 저장합니다(`export-support-matching:profile:v1`). 서버로 보내지 않으며 화면에 이 사실을 표시합니다.
- **사업자등록번호는 저장하지 않습니다.** 형식(숫자 10자리)만 확인하고 현재 화면 세션에서만 유지합니다.
- 서류 원본은 업로드·저장하지 않습니다(파일 저장소 미연결).
- 프로필 상태는 `입력 전 / 입력 중 / 입력 완료`이며 이는 입력 진행 상태일 뿐 신청 자격 판정이 아닙니다. KSIC·HS 코드를 모르거나 임시 입력하면 `입력 중`으로 남습니다.

## 7. 화면 공통 컴포넌트

`frontend/src/components/`

- 표시: `DataValue`(결측 → `-`), `InfoList`/`InfoRow`, `StatTile`, `StatusBadge`(색 + 글자 + 아이콘), `EmptyState`, `NoticeBanner`
- 동작: `ActionButton`(비활성 시 `aria-disabled` + 이유 연결), `DisabledReason`, `TabNav`(방향키 이동), `SegmentedControl`, `AppModal`(포커스 가두기·Esc 닫기)
- 도메인: 단계 폼(`diagnose/steps/*`, `StepProgress`), 필터(`ProgramFilters`), 공고 카드(`ProgramCard`, 실제 공고가 있을 때만 렌더링), 비교 표(`CompareTable`), 캘린더(`MonthCalendar`)
- 디자인 토큰: `frontend/src/styles/tokens.css` (색·간격·반경·그림자·타이포). 브랜드 색은 채움·아이콘에 쓰고, 작은 글자·흰 글자 버튼에는 대비 4.5:1 이상인 `*-strong` 색을 씁니다.

## 8. 공고 데이터를 연결할 때 할 일

1. 공고 원문을 수집해 `Program`·`EligibilityRule`·`RequiredDocument`로 정형화하고, 사람이 원문과 대조한 뒤 `verified_at`과 `*_verified` 플래그를 채웁니다.
2. PostgreSQL을 연결해 `python manage.py migrate`를 실행하고, 검증된 공고만 저장합니다.
3. 프론트엔드 배포 환경변수 `VITE_API_BASE_URL`에 API 주소를 넣습니다.
4. 적합도·수출단계 기준은 근거와 버전을 정한 뒤 `ACTIVE_FIT_CRITERIA` / `ACTIVE_EXPORT_STAGE_CRITERIA`에 등록합니다.
5. 관심 저장·준비·이력·서류함은 계정 기능과 함께 서버 저장으로 옮깁니다(`stores/trackingStore.ts`의 빈 목록 교체).
