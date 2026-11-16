# REVISION_05 반영 현황 — 신청 자격 3탭 · 적합도 v1 · 최종 데이터 연결 · 챗봇 · 공개 API

> 작업일 2026-11-16 · 브랜치 `revision-05` · 지시 문서 [REVISION_05.md](REVISION_05.md) (충돌 시 지시 문서 우선)
> 같은 브랜치의 앞선 작업(수출 로드맵 삭제 · 메인 랜딩 · 블랙·옐로우 · Export Compass 이름)은 [revision_05_landing_record.md](revision_05_landing_record.md)에 따로 적었다.
> 데이터 기준일은 **2026-11-13**으로 고정한다 (시스템 날짜를 쓰지 않는다).

## 1. 코드 수정 전 현황 조사 (§1)

| 항목 | 조사 결과 |
|---|---|
| 1. 판정 엔진 | `frontend/src/lib/engine/eligibility.ts`(v2): 공고의 `eligibilityRules`(필드·연산자·값)를 프로필과 비교. 서버 엔진·정답세트 적재는 없었다. 공고 데이터는 REVISION_04에서 지운 상태(빈 저장소) |
| 2. 기업 프로필 | `types/profile.ts`의 `CompanyProfile`, 6단계 폼(`DiagnoseInputView` + `components/diagnose/steps/*`). 저장은 브라우저 localStorage(`esm.profile.v1`, 계정별 키). 사업자등록번호는 저장하지 않음. 공통 확인 5개(`tax-arrears`·`closure`·`credit`·`sanction`·`financial-health`)는 `selfCheckStore`(`esm.selfChecks.v1`의 `common`)에 저장 |
| 3. 적합도 v0 | `lib/engine/fit.ts`(`ACTIVE_FIT_CRITERIA`: 관심분야·단계·내용 유사도 3요소, 가점 ±보정), 표시는 `FitBreakdownTable.vue`·`RecommendationCard.vue` |
| 4. 맞춤 추천 | `RecommendationList.vue`(탭 3개 신청 가능·확인 필요·신청 불가) · `RecommendationCard.vue` · `ProgramRecommendedView.vue` |
| 5. 인증·권한 | Vercel 서버 함수 `api/auth/[action].ts` + `server/auth/*` (환경변수 계정, HMAC 서명 쿠키). 역할은 `DEMO_LOGIN_*` = admin, `TEST_LOGIN_*` = test. 라우터 가드 `authNavigationTarget`(meta `requiresAuth`·`requiresAdmin`) |
| 6. 관리자 영역 | REVISION_04의 `/admin/*` 6개 화면. `AdminRepository`는 빈 구현(`EmptyAdminRepository`)으로 **실제 서버와 연결되어 있지 않았다** |
| 7. 실행 환경 | **Render 서비스가 없다.** 배포는 Vercel 한 곳(정적 Vue SPA + `frontend/api/` 서버 함수)뿐이고 Django 백엔드는 배포되어 있지 않다. 따라서 영구 디스크·예약 실행도 없다 (§2 아키텍처 결정) |
| 8. 데이터 파일 | `EC_신청자격_정답세트_150건_최종.xlsx`(시트: 공고목록·자격조건·조건유형·문장라벨·가상프로필·판정정답 등), `EC_지원분류_정답세트_150건_최종.xlsx`(공고별 C01–C15 분류). 공고문 폴더 `수출 지원사업 공고문`: 파일 375개(PDF 374 · PNG 1) + zip 1 + 하위 폴더 `정답세트` 1 |

## 2. 아키텍처 결정 (Render 없음 → Vercel 한 곳)

```
[로컬]  Django 관리 명령 (SQLite, DJANGO_DB=sqlite)
        import_eligibility_goldset → ingest_notice_folder → (publish_auto_extracted) → export_public_snapshot
                                                                                         │
                                         frontend/src/data/published/notices.json ◀──────┘ (게시 공고 + 판정식)
                                         frontend/src/data/published/admin-review.json      (검수 대기·추출 불가)
[Vercel] 정적 SPA ─ 브라우저에서 3탭 판정(eligibilityV3.ts)·적합도 v1(fitV1.ts) 계산
         서버 함수 ─ /api/auth/*  · /api/assistant/* (챗봇) · /api/public/* (공개 API) — 같은 스냅샷과 같은 판정 엔진 사용
```

- 공고 데이터는 서버 DB 대신 **게시 스냅샷 JSON**으로 배포한다. 공고 원문에서 정리한 값과 판정식만 들어 있고 사용자 정보는 없다.
- 판정 엔진은 Python(`backend/eligibility/engine.py`)과 TypeScript(`frontend/src/lib/engine/eligibilityV3.ts`) 두 벌이며, 둘 다 정답세트 `reference_eval.py`와 불일치 0건이다.
- 지시 문서의 DRF throttle · drf-spectacular · DB 저장 호출 기록은 Django를 배포할 때의 설계다. 지금은 같은 기능을 Vercel 함수로 만들었다 (§9 아래 차이 표).

## 3. 바뀐 부분

| 영역 | 내용 |
|---|---|
| 정답세트 반입 (§2.2) | `backend/eligibility/` 앱(모델 `ConditionType`·`Notice`·`Condition`·`IngestRecord`), `import_eligibility_goldset`(두 번 실행해도 중복 없음, 빈 중복 행 P005·삭제 표시 P048 건너뜀), 변환 사본 `backend/data/eligibility_goldset/*.csv·json` |
| 판정 엔진 (§2.3·§2.4) | 3값 논리(atom·all·any·not·flag·intent·distributor·check·true), 필수 그룹 내 OR·그룹 간 AND, 제외 조건, `affects_verdict = N` 안내 조건. 실제 사용자용 확장: 미입력 값 = 모름, `answered_flags`, 규모 `중소기업` 일반값. 3탭: 미충족 → 신청 불가 / 주요 조건 모름 → 확인 필요 / 체크리스트만 모름 → 신청 가능 + 체크리스트. 기본 중요도 A01–A11·C01·C05·C09 = 주요, 기업 미입력으로 모르는 A 유형도 주요 |
| 학습·적재 (§2.7) | `backend/ml/train_eligibility.py`(1회, 탐색 없음) → `backend/ml/models/eligibility_v1/`, `ingest_notice_folder`(1회 배치, 해시로 멱등), `publish_auto_extracted`(대상 건수 확인 후 일괄 게시), `export_public_snapshot` |
| 기업 프로필 (§3) | ⑦ `재무·신청 전 확인` 단계 추가(건너뛰기 가능, 기존 6단계 그대로): 재무 6개 금액(음수 허용)과 비율 6개(계산만 하고 저장하지 않음), 신청 전 확인 6개(B01–B05·B08), 수출 의향·참여 조건·자부담 준비 |
| 맞춤 공고 (§5) | 탭 `신청 가능 N`/`확인 필요 N`/`신청 불가 N`, 탭별 정렬, 마감 공고 숨김 + `마감 공고 포함` 토글, 카드: 제목·신청 마감·사업 분류 배지 + 탭별 항목(적합도는 신청 가능만), `자동 추출 · 검수 전` 배지 |
| 상세 (§5.3) | `EligibilityTabPanel.vue`: 조건별 원문 문장·쪽, 확인 필요 조건 `충족함/충족하지 않음` 체크(이 기기에만 저장) → 탭 즉시 이동·취소 가능, 제출 서류 체크리스트, 적합도 계산 방법 |
| 적합도 v1 (§6) | `fitV1.ts`: 관심 분야 0.25 · 업종 0.20 · 수출단계 0.25 · 재무 0.25 · 가점 0.05, 빠진 요소는 빼고 다시 나눔, 2요소 미만이면 점수 없음, 신청 가능 공고만. 재무 원형은 19개 군집 기준표가 없어 `기준 미등록` → 재무 요소 제외. 화면에 `fit-v1 · 검증 전 시험값`과 재무 가정 문구 |
| 관리자 (§7) | 역할: `OPS_LOGIN_*` = admin, `DEMO_LOGIN_*`(ADMIN) = member, `TEST_LOGIN_*` = test. 관리자 화면은 스냅샷을 읽기 전용으로 보여 줌(`SnapshotAdminRepository`): 대시보드 건수, 검수 대기 165건·추출 불가 35건, 공고 관리 목록(출처 `공고 폴더 적재`·`KITA` 추가). **KITA 업로드** 화면 추가(KOTRA와 같은 컴포넌트, 출처만 다름). 기준·설정: 적합도 v1 가중치, 매칭표 2개, 재무 원형 기준표 상태, 조건 유형별 기본 중요도, 공개 API 키 안내 |
| 챗봇 (§8) | `api/assistant/[action].ts` + `server/assistant/handlers.ts`, 화면 `components/assistant/AssistantWidget.vue` |
| 공개 API (§9) | `api/public/index.ts` + `server/public/*`, 화면 `/developers`(메뉴에 없음, 바닥글 링크) |
| TEST 계정 (§10) | 테스트 프로필에 ⑦단계 값(2025년 기준 재무, 신청 전 확인 모두 `해당 없음`, 수출 의향·참여 조건·자부담 준비 `예`). 이미 저장된 TEST 프로필에는 ⑦단계 값만 비어 있을 때 채운다 |

### 챗봇·공개 API의 지시 문서와 다른 점 (서버 DB가 없어서)

| 지시 | 지금 구현 | 서버 DB를 붙이면 |
|---|---|---|
| 사용자별 하루 호출 수 (기본 20) | 서버 함수 메모리로 센다. Vercel 인스턴스가 바뀌면 다시 0부터 센다 (근사 제한) | 호출 기록 테이블로 정확히 센다 |
| 호출 수 집계 기록 (사용자·시각·토큰 수), 모델명·프롬프트 버전 기록 | Vercel 함수 로그에 한 줄 JSON(`assistant_call`)으로 남긴다. 질문·답변 본문은 남기지 않는다 | DB 테이블 |
| DRF throttle | 키별 분당 호출 수 `PUBLIC_API_RATE_PER_MINUTE`(기본 60), 메모리 기준 | DRF throttle |
| 관리자가 `/admin/settings`에서 키 발급·폐기 | 환경변수 `PUBLIC_API_KEYS`(쉼표로 여러 개)로 관리, 화면에는 안내와 비활성 버튼 | 키 테이블 + 화면 발급 |
| drf-spectacular `/api/public/docs` | 같은 주소에 OpenAPI 3.1 문서 + Swagger UI(서버 함수) | drf-spectacular |
| 프로필로 판정 (서버) | 챗봇·공개 API 모두 서버에서 같은 TS 엔진으로 판정. 챗봇의 적합도는 브라우저가 계산한 값을 신청 가능 공고에만 붙인다 | Python 엔진 |

챗봇 흐름: 질문 → 게시 공고 TF-IDF(글자 2-gram) 최대 5개 → 서버에서 이 기업의 3탭·확인할 조건·근거 문장·쪽·제출 서류 계산 → Claude API(모델 `ASSISTANT_MODEL`, 기본 `claude-sonnet-5-5`, JSON 스키마 출력, 서버 측 대체 모델 `fallbacks: "default"`) → 형식 오류면 1번 다시 요청 → 답변의 공고명·탭·적합도·근거 문장·쪽은 서버가 판정 값으로 다시 채움(모델이 바꿀 수 없음, 전달하지 않은 공고는 버림). 보내는 기업 정보는 판정 항목만(사업자등록번호·대표자명·연락처 없음). 키가 없으면 버튼이 `준비 중`이고 비활성.

## 4. 기존 공통 확인 5개 항목을 옮긴 결과 (§12-2)

| 기존 공통 확인 (selfChecks.common) | 신청 전 확인 코드 |
|---|---|
| `tax-arrears` 세금 체납 | B01 |
| `closure` 휴·폐업 | B02 |
| `credit` 신용 | B04 |
| `sanction` 참여 제한·제재 | B05 |
| `financial-health` 재무 상태 | 옮기지 않음 (결격 문항이 아니며 ⑦단계 재무 금액으로 대체) |

- **저장값은 복사·삭제하지 않았다.** 프로필의 `preApplyChecks`가 비어 있으면 판정할 때 기존 공통 확인 답을 위 표대로 읽는다(`engineProfile.ts`의 `preApplyAnswers`). 사용자가 ⑦단계에서 답하면 그 값이 우선한다. 기존 `esm.selfChecks.v1`의 `common`은 그대로 남아 있다.
- B03(파산·회생)·B08(사회적 물의)은 기존 항목에 없어 새로 묻는다.

## 5. 판정 엔진 테스트 결과 (§12-3)

- 엄격 판정 회귀: 가상 프로필 16개 × 정답세트 공고 = **2,544조합, `reference_eval.py`와 불일치 0건** (Python `backend/eligibility/tests.py`, TypeScript `frontend/src/__tests__/revision05.engine.spec.ts`). `reference_eval.py`는 엑셀 `판정정답`을 그대로 재현한다.
- 3탭 분류 단위 테스트(§2.6): Python 6건 · TypeScript 4건 통과.
- 백엔드 `manage.py test` 18건 통과, 프론트엔드 vitest 299건 통과 (§8).

## 6. 사이킷런 추출기 평가 (§12-4)

[docs/ml/eligibility_eval.md](../ml/eligibility_eval.md) — 학습 dev, 평가 test(평가용 원공고 30건 · 세부사업 포함 문장 단위). 지시 문서의 '평가용 33건'은 세부사업 행 기준이며 원공고 단위로는 30건이다.

| 과제 | 결과 |
|---|---|
| 문장 라벨 5종 | Macro F1 **0.677**, 자격 문장 재현율 0.727 (자격-필수 0.584 · 자격-제외 0.750 · 가점 0.400 · 제출서류 0.692 · 기타 0.959) |
| 조건 유형 | Macro F1 **0.424**, 정확도 0.494 (26개 유형) |
| 공고 분야 C01–C15 | Micro F1 **0.500**, Macro F1 0.225 |

판정은 규칙으로만 하며, 분류기는 자격 문장 찾기·유형·분야에만 쓴다. 최종 모델은 dev+test로 1번 다시 학습해 저장했다.

## 7. 공고 폴더 적재 결과 (§12-5)

[docs/ml/batch_report.md](../ml/batch_report.md) — 1회 배치.

| 항목 | 건수 |
|---|---|
| 실제 파일 | 375 (PDF 374 · PNG 1, zip·하위 폴더 제외) |
| 정답세트와 겹침 (정답세트 데이터 사용) | 149 |
| 같은 내용 중복 파일 (해시 동일) | 26 |
| 신규 자동 추출 → 검수 대기 | 165 (조건 1,328개, 평균 confidence 0.284) |
| 추출 실패 (텍스트 추출 불가) | 35 |

다시 실행해도 공고 359건 · 조건 2,611개 · 적재 기록 375건 그대로(중복 없음). **사이트에 게시된 공고는 정답세트 159건**(원공고 149 + 세부사업)이다. 자동 추출 165건은 검수 대기이며 아직 게시하지 않았다 (평균 confidence가 낮아 일괄 게시는 사용자가 결정, §11).

## 8. TEST 계정 기준 결과 (§12-6)

데이터 기준일 2026-11-13, TEST 프로필 + ⑦단계 값, 직접 확인 답 없음.

| 탭 | 전체 159건 | 기본 화면 (마감 공고 숨김, 114건) |
|---|---|---|
| 신청 가능 | 12 | 4 |
| 확인 필요 | 6 | 4 |
| 신청 불가 | 141 | 106 |
| 합계 | **159 = 게시 공고 수** | 114 |

적합도 상위 5개 (전체 기준, 재무 요소는 원형 기준표 미등록으로 제외):

| 순위 | 공고 | 적합도 | 접수 |
|---|---|---|---|
| 1 | P002 미국 동부 K-Food 유통망 입점지원 사업 | 100 | 마감 |
| 2 | P006 해외 온라인 플랫폼 입점지원 사업 참여 소상공인 모집(2차) | 71 | 마감 |
| 3 | P008 해외 온라인 플랫폼 활용지원 사업 참여 소상공인 모집(3차) | 71 | 마감 |
| 4 | P037 2026년 수출 패키지 지원 참가기업 모집 | 67 | 마감 |
| 5 | P034 2026년 이천시 해외규격인증 지원사업(5차) | 60 | 마감 |

기본 화면(마감 숨김)의 신청 가능 4건: P001 일반 물류바우처(2차) 46 · P063 중소기업 해외세일즈 개별 출장 지원 24 · P053 FTA 맞춤형 컨설팅 13 · P060 원산지확인서 제3자 확인 컨설팅 13.

## 9. 완료 체크리스트 (§11)

| 항목 | 결과 |
|---|---|
| 정답세트 두 번 반입해도 중복 없음 | 통과 (`import_eligibility_goldset` 2회) |
| 엄격 판정 회귀 불일치 0건 | 통과 (2,544조합) |
| 3탭 분류 단위 테스트 | 통과 |
| 학습 1회 + 평가 문서 | 통과 (`docs/ml/eligibility_eval.md`) |
| 적재 1회 + 보고서, 재실행 중복 없음 | 통과 (`docs/ml/batch_report.md`) |
| TEST 맞춤 공고: 모든 게시 공고가 3탭 중 하나, 합 = 게시 공고 수 | 통과 (12 + 6 + 141 = 159) |
| 카드: 제목·신청 마감·사업 분류, 적합도는 신청 가능만 | 통과 (테스트 + 브라우저) |
| 신청 가능 상세: 적합도 계산 방법·자격 체크리스트·제출 서류 | 통과 |
| 확인 필요 → 주요 조건 모두 충족함 → 신청 가능, 취소하면 복귀 | 통과 (브라우저) |
| 신청 불가 상세: 미충족 조건 원문 문장·쪽 | 통과 |
| `자동 추출 · 검수 전` 배지는 일괄 게시 공고에만 | 통과 (게시된 자동 추출 공고 0건 → 배지 0개) |
| 기존 6단계 그대로 + ⑦ 건너뛰기 | 통과 |
| 재무 금액 하나라도 비면 `재무 미입력`, 재무 요소 제외 | 통과 |
| 적합도 화면 5요소 값·비중·이유, 빠진 요소 사유, 버전, `검증 전 시험값`, 재무 가정 문구 | 통과 |
| `/admin`은 운영자 계정만 (ADMIN·TEST 불가) | 통과 (역할 테스트). 운영 사이트는 `OPS_LOGIN_*` 설정 전까지 관리자 화면에 들어갈 계정이 없다 |
| 키 없으면 챗봇 `준비 중` | 통과 (로컬·배포) |
| `/developers`, `/api/public/docs` 열림, 키 없이 `401` | 통과 (로컬·배포) |
| `dist`·Git 이력에 키·비밀번호 없음, 서버 변수에 `VITE_` 없음 | 통과 (아래 §10) |
| 빌드·타입 검사·린트·백엔드 테스트 각 1번 | 통과 |

## 10. 보안 확인

- 서버 전용 변수(`OPS_LOGIN_*`, `DEMO_LOGIN_*`, `TEST_LOGIN_*`, `AUTH_SESSION_SECRET`, `ANTHROPIC_API_KEY`, `ASSISTANT_*`, `PUBLIC_API_KEYS`, `PUBLIC_API_RATE_PER_MINUTE`, `BIZINFO_API_KEY`)에 `VITE_` 접두사가 없다.
- `frontend/dist`에서 위 변수 이름·키 형식(`sk-ant-`)을 찾아 0건임을 확인했다.
- 기업마당 API 키는 서버 전용이라 브라우저에서 설정 여부를 알 수 없다. 관리자 화면은 수집 기능 자체가 서버 저장소 연결 전이라 `미연동`으로 표시한다.

## 11. 사용자가 직접 할 일 (§12-7)

지시 문서의 'Render 대시보드'는 지금 배포 구조에서 **Vercel 프로젝트 설정 → Environment Variables (Production·Preview)** 이다. 넣은 뒤 다시 배포해야 적용된다.

1. `OPS_LOGIN_ID`, `OPS_LOGIN_PASSWORD` — 운영자 계정. **넣기 전에는 운영 사이트의 `/admin`에 들어갈 수 있는 계정이 없다** (`ADMIN` 계정은 이번 개정으로 일반 사용자가 됨).
2. `ANTHROPIC_API_KEY` (필요하면 `ASSISTANT_MODEL`, `ASSISTANT_DAILY_LIMIT`) — 넣으면 챗봇 버튼의 `준비 중`이 사라진다.
3. `PUBLIC_API_KEYS` — 공개 API를 쓸 키(16자 이상, 쉼표로 여러 개). 예: `openssl rand -hex 24`.
4. `BIZINFO_API_KEY` — 기업마당 수집은 서버 저장소 연결 후에 쓴다.
5. `/admin/settings`의 재무 원형 기준표(19개 군집) CSV 준비 — 서버 저장소가 없어 지금은 화면에서 등록할 수 없다. 파일을 주면 `ARCHETYPE_REFERENCE`(코드)로 넣어 배포할 수 있다.
6. 자동 추출 공고 165건: 개별 검수할지, `python manage.py publish_auto_extracted`로 일괄 게시할지 결정 (일괄 게시하면 `자동 추출 · 검수 전` 배지가 붙은 채 사용자 화면에 나온다).

## 12. 남은 일 (서버 저장소가 필요한 것)

- 관리자 쓰기 동작(승인·반려·일괄 게시·수집·업로드 반영·키 발급) — 지금은 로컬 관리 명령 + 스냅샷 재배포.
- KOTRA·KITA 업로드의 §7.4 새 열 구성(`source_notice_id, title, organizer, operator, posted_at, apply_start, apply_end, source_url, file_name, memo`)과 공고문 파일 연결 — 지금 화면은 REVISION_04 양식으로 미리보기만 한다.
- 챗봇 호출 수·공개 API 호출 제한의 정확한 집계(DB).
