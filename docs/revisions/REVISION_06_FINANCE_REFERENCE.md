# REVISION_05 보완 — 재무 원형 기준표(v4) 연결

> 대상: 적합도 v1의 재무 요소 (`frontend/src/constants/fitV1.ts`, `frontend/src/lib/engine/fitV1.ts`)
> 함께 전달하는 파일: `archetype_reference_v4.json` (재무 유형 군집화 v4 결과로 만든 기준표, 약 270KB)
> 이 문서와 JSON에는 비밀번호·키가 없다. 그대로 커밋해도 된다. 업체명도 들어 있지 않다.

## 0. 왜 바꾸는가

- 지금은 `ARCHETYPE_REFERENCE = null`이라 재무 요소(비중 25%)가 모든 공고에서 `기준 미등록`으로 빠진다. 빠진 비중이 나머지 요소에 나눠지면서 100점이 많이 나온다.
- 팀의 군집 분석(v4)은 현재 코드가 가정한 방식과 다르다. **인터페이스부터 바꿔야 한다.**

| 항목 | 현재 코드의 가정 | 실제 군집 분석 v4 |
|---|---|---|
| 4번째 변수 | 매출액순이익률 `netMargin` | **영업외수지** `nonOpBalance` = 순이익률 − 영업이익률 (%p) |
| 전처리 | 원값을 평균·표준편차로 표준화 | **업종 내 백분위**(0~1)로 바꾼 뒤 **수출단계별** 평균·표준편차로 표준화 |
| 군집 | 19개 군집 하나의 목록 | **수출단계별로 따로** (내수 4, 초보 4, 유망 4, 성장 4, 강소 3) |
| 예외 기업 | 자본잠식만 제외 | 7개 사전분리 규칙 (아래 §3) |

## 1. 파일 배치

- `archetype_reference_v4.json` → `frontend/src/data/archetypeReferenceV4.json`
- `fitV1.ts`의 `ARCHETYPE_REFERENCE`는 이 JSON을 import해서 쓴다. 관리자 화면의 CSV 등록은 서버 저장소를 연결한 뒤의 일로 남겨 둔다. 지금은 코드에 넣은 기준표가 기본값이고, `기준·설정` 화면의 배지는 `등록됨 (fin-archetype-v4-2025)`으로 보인다.

## 2. JSON 구조

```
version, source, status('검증 전 시험값'), variables, method, archetypeRule
specialRules[]            사전분리 규칙 7개 (order 순서대로 검사)
ksicMidToGroup            KSIC 중분류 코드('C10') → 업종 그룹 id ('C10' 또는 대분류 문자 'C')
groupFallback             설명 문자열
industryGroups[id]        { label, level, n, quantiles: { growth|opMargin|debtRatio|nonOpBalance: number[101] | null } }
                          id: 중분류('C10'), 대분류 대체('C' = 같은 대분류의 소규모 중분류 모음), 'BIG:C'(대분류 전체), 'ALL'
stages[ExportStage]       { stageLabel, k, stability, zStats{변수:{mean,sd}}, clusters[{id,name,archetype,n,share,center{변수},medians{변수}}] }
verificationCases[]       검증 표본 39건 (군집마다 2건 + TEST 계정), 기대 군집 id 포함
```

- 모든 값의 단위는 **%** (예: 영업이익률 4.0% → `4.0`). `financeSummary()`는 비율(0.04)을 돌려주므로 **×100** 해서 쓴다.
- `ExportStage` 키(`domestic`·`beginner`·`promising`·`growth`·`strong`)는 앱의 수출단계 진단 값과 같다.

## 3. 판정 순서 (`financeArchetype`)

함수 시그니처를 `financeArchetype(profile, stage: ExportStage | null)`로 바꾼다. `computeFitV1Factors`는 `context.diagnosis?.stage`를 넘긴다.

1. 재무 값이 모자라면 → `재무 미입력` (지금과 같음)
2. **사전분리** (`specialRules`, 앞에서부터 처음 걸리는 것): 매출소멸(당기 매출 0) → 자본잠식(자본총계 ≤ 0) → 매출 1억 원 미만 → 부채비율 1,000% 초과 → 영업이익률 −100% 미만 → 매출액증가율 300% 초과. 걸리면 원형 없음, 사유는 규칙의 `label`
3. 수출단계가 없으면 → `수출단계 미확정` (원형 없음)
4. 네 변수 계산: growth = (매출 − 전년 매출) / 전년 매출 × 100, opMargin, debtRatio, nonOpBalance = netMargin − opMargin (모두 %). 전년 매출이 없거나 0이면 growth = null (3개 변수로 진행)
5. **업종 그룹**: 프로필의 KSIC 코드에서 중분류(영문 대분류 1자 + 숫자 2자리, 예 `C10`)를 뽑아 `ksicMidToGroup` → 없으면 `BIG:<대분류 문자>` → 그것도 없거나 업종 코드를 모르면 `ALL`. **프로필의 KSIC 저장 형식(`C10`, `10`, `C10111`, 5자리 숫자 등)을 먼저 확인**하고 정규화 함수를 만든다. 숫자만 있으면 KSIC 11차 표로 대분류 문자를 붙인다(`constants/ksic*` 참고)
6. **백분위**: 변수마다 `quantiles`(0%~100%, 1% 간격 101개)에서 선형 보간. 값이 여러 칸과 같으면 그 칸들의 가운데. 범위 밖은 0 또는 1. 결과는 0~1
7. **표준화**: `z = (백분위 − stages[stage].zStats[변수].mean) / sd`
8. **최근접 군집**: 같은 단계 `clusters` 가운데 `center`와의 유클리드 거리 제곱합이 가장 작은 군집. growth가 null이면 나머지 3개 변수로만 계산
9. 반환: `{ archetype, clusterId, clusterName, industryGroupLabel, stability, reason }`. 화면 근거에는 `재무 원형 확장형 (내수 고성장·고부채 확장형, 비교 업종: 식료품 제조업)`처럼 군집명과 비교 업종을 함께 적는다

- `stability`가 `낮음(해석 주의)`(초보·유망)이면 근거 문장 끝에 `(이 단계의 재무 유형은 참고용)`을 붙인다. 점수 계산은 같다.
- 원형 × 사업 분류 매칭표(`ARCHETYPE_CATEGORY`)와 비중(25%)은 바꾸지 않는다.

## 4. 함께 고칠 곳

- `ArchetypeReferenceTable` 인터페이스를 §2 구조에 맞게 다시 정의한다 (`netMargin` → `nonOpBalance`, 단계별 군집, 업종 그룹).
- `AdminSettingsView.vue`의 기준표 안내 문구: `4개 변수(매출액증가율·매출액영업이익률·부채비율·영업외수지)의 업종 내 백분위 → 수출단계별 표준화 → 단계별 군집 중심`으로 고치고, 버전·출처·단계별 안정성을 보여 준다.
- 기업 프로필 ⑦단계 화면에 재무 원형을 보여 주는 곳이 있으면 같은 함수를 쓴다.
- `FINANCE_ASSUMPTION_NOTE`, `FIT_V1_STATUS_LABEL`(`검증 전 시험값`)은 그대로 둔다.

## 5. 테스트

`frontend/src/lib/engine/__tests__/`에 추가한다.

- `verificationCases` 39건 전부 `expectedCluster`와 같은 군집이 나온다 (기준표 작성 시 39/39 확인함).
- TEST 계정 프로필(C10, 내수, 증가율 18.0% · 영업이익률 4.0% · 부채비율 135% · 영업외수지 −1.0%p) → `1_내수-C3` `확장형`.
- 사전분리 7개 규칙이 각각 원형 없음 + 해당 사유로 끝난다. 순서도 검사한다 (예: 자본잠식이면서 매출 1억 미만 → `자본잠식`).
- 업종 대체 경로: 표에 있는 중분류 / 대분류 대체 중분류(`C34` → `C`) / 표에 없는 중분류 → `BIG:` / 코드 없음 → `ALL`.
- growth가 null이면 3개 변수로 배정된다.
- 수출단계가 없으면 원형 없음.
- 재무 요소가 들어가면서 TEST 계정의 맞춤 공고 적합도가 달라진다. 확장형의 핵심 분류는 C14·C13·C10이라, C02만 있는 공고는 재무 요소가 0.3이 된다. 기존 테스트 기대값이 바뀌면 이유를 확인한 뒤 고친다.

## 6. 마무리

1. `frontend`에서 `npm run test`, 타입 검사, 린트, `npm run build`를 `package.json`의 실제 스크립트 이름으로 실행한다.
2. TEST 계정으로 `/programs/recommended`를 열어 적합도 근거에 재무 원형 줄이 나오고 100점 쏠림이 줄었는지 확인한다.
3. `docs/revisions/revision_05_inventory.md`에 반영 현황을 적는다.
4. 커밋까지만 하고, 배포는 사용자가 요청할 때 한다.

## 참고: 기준표를 만든 방법 (재현 검증)

- 원자료: 재무 유형 군집화 v4 엑셀(`기업별결과` 시트, 정상기업 29,621곳).
- 업종 내 백분위는 정상기업만으로 `비교업종`(중분류, 정상기업 30곳 미만이면 대분류) 안에서 계산했다. 표준화는 수출단계별로 했다. 이 조합에서 엑셀의 군집 배정과 내수 99.94%, 나머지 단계 100% 일치했다(다른 조합은 76~98%).
- 앱에서 쓰는 101개 분위수 근사로 다시 배정하면 내수 99.78%, 나머지 단계 100% 일치한다.
- 군집 중심은 단계별로 엑셀 배정 기준의 표준화 값 평균이다. 원형은 군집명에 따라 연결했다: 내수-C1 우량형, 강소-C2 정체형, 나머지는 스타·보수·확장·위축형.
