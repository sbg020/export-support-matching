# 테스트 데이터셋 만들기

정답 세트 초안(xlsx)을 웹에서 읽는 JSON으로 바꾼다. 기준 문서: [REVISION_02 §3·§13.1](../../docs/revisions/REVISION_02.md).

| 파일 | 역할 |
|---|---|
| `build_test_dataset.py` | xlsx → `frontend/src/data/test-dataset.json`, `test-dataset.meta.json`, `docs/data/test-dataset-report.md` |
| `check_dataset_fresh.py` | JSON에 기록된 입력 파일 SHA-256과 지금 xlsx를 비교 (정답 세트를 고치고 다시 만들지 않았는지 확인) |
| `../requirements.txt` | 변환 도구 전용 의존성 (`openpyxl`). 백엔드 requirements와 섞지 않는다 |

Vercel 빌드에서는 Python 변환을 실행하지 않는다. 생성된 JSON을 커밋한다.

## 준비 (처음 한 번)

```bash
python -m venv tools/.venv
tools/.venv/Scripts/python -m pip install -r tools/requirements.txt   # macOS·Linux: tools/.venv/bin/python
```

Python 3.12 기준이다. Windows에서 `py`가 3.14를 가리키면 `py -3.12 -m venv tools/.venv`로 만든다.

## 다시 만들기

저장소 루트에서 실행한다.

```bash
tools/.venv/Scripts/python tools/dataset/build_test_dataset.py \
  --input "수출 지원사업 공고문/정답세트/EC_정답세트_초안_30건.xlsx" \
  --input "수출 지원사업 공고문/정답세트/EC_정답세트_초안_랜덤30건.xlsx" \
  --inventory-from "수출 지원사업 공고문/정답세트/EC_정답세트_초안_랜덤30건.xlsx" \
  --source-urls "수출 지원사업 공고문/정답세트/source_urls.csv" \
  --as-of 2026-10-30 \
  --out frontend/src/data/test-dataset.json \
  --report docs/data/test-dataset-report.md
```

- 같은 입력이면 같은 바이트가 나온다(ID순 정렬, 빌드 시각 대신 입력 SHA-256 기록). 두 번 실행해 `sha256sum`이 같은지로 확인할 수 있다.
- 변환을 멈추는 오류: 파일 간 `program_id` 중복, 없는 공고를 가리키는 규칙·서류·가점, 사전에 없는 `field`·`op`, C01~C15 밖의 분류 코드, 최종 평가용 test 공고(`inventory_150` split에 `test`) 포함.
- 경고로 남기고 진행: 숫자가 아닌 금액, 근거 문장·쪽이 빈 규칙, 게시일·접수기간이 없는 공고. 모두 보고서 3절에 나온다.
- `수출 지원사업 공고문/정답세트/EC_정답세트_초안(2).xlsx`는 최종 평가용 test 30건 초안이다. 입력에 넣지 않으며 Git에도 올리지 않는다.

## 기준일 바꾸기

접수상태(`접수중/접수예정/마감`)와 마감 여유, '새로 올라온 공고'는 `--as-of`로 준 **데이터 기준일**로 계산한다(시스템 날짜를 쓰지 않는다). 새 초안을 받으면 그 작성일로 바꾸고, 화면의 기준일 표시는 JSON `meta.asOf`를 따라 바뀐다.

## 검수 후 다시 만들기

1. 검수자가 xlsx의 `review_status`를 `확인`·`수정`·`추가`로 바꾼다(`삭제` 행은 변환에서 빠진다).
2. 원문 URL을 확인했으면 `수출 지원사업 공고문/정답세트/source_urls.csv`에 `program_id,source_url,checked_at`로 적는다. 세부사업 공통이면 원공고 ID(`P022`)로 적어도 된다. URL을 추측해 적지 않는다.
3. 위 명령으로 다시 만든다. 공고의 programs·rules·documents 행이 모두 검수되면 `reviewed`, 여기에 URL과 확인일이 있으면 `verified`가 된다.
4. `check_dataset_fresh.py`로 JSON이 최신인지 확인하고, JSON·meta·보고서를 함께 커밋한다.

```bash
tools/.venv/Scripts/python tools/dataset/check_dataset_fresh.py
```
