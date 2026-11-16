"""정답세트로 자격 추출용 분류기를 학습한다 (REVISION_05 §2.7-1). 정해진 설정으로 1번 실행한다.

    cd backend && DJANGO_DB=sqlite python ml/train_eligibility.py

- 문장 라벨 분류기: 문장라벨 → 자격-필수 / 자격-제외 / 가점 / 제출서류 / 기타
- 조건 유형 분류기: 자격조건 근거 문장 → 조건 유형(A01–C09)
- 공고 분야 분류기(C01–C15, 다중 라벨): 기존 모델이 없어 같은 방식으로 정답세트 분야 라벨과 공고 본문으로 학습
- 모두 글자 n-gram(2~4) TF-IDF + 로지스틱 회귀(class_weight=balanced).
- 학습은 split=dev만, 평가는 test(평가용) 1번, '제외(중복)'은 쓰지 않는다.
- 평가 후 dev+test로 최종 모델을 1번 다시 학습해 ml/models/eligibility_v1/ 에 저장한다. 보고하는 수치는 dev만으로 학습한 모델의 것.
"""
from __future__ import annotations

import csv
import json
import os
import sys
from datetime import date
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

import joblib  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import f1_score, recall_score  # noqa: E402
from sklearn.multiclass import OneVsRestClassifier  # noqa: E402
from sklearn.pipeline import Pipeline  # noqa: E402
from sklearn.preprocessing import MultiLabelBinarizer  # noqa: E402

from eligibility.models import Notice  # noqa: E402
from ml.textify import textify  # noqa: E402

GOLD = BACKEND / "data" / "eligibility_goldset"
CACHE = BACKEND / "data" / "cache"
MODEL_DIR = BACKEND / "ml" / "models" / "eligibility_v1"
REPORT = BACKEND.parent / "docs" / "ml" / "eligibility_eval.md"
NOTICE_DIR = BACKEND.parent / "수출 지원사업 공고문"
SENTENCE_LABELS = ["자격-필수", "자격-제외", "가점", "제출서류", "기타"]
ELIGIBILITY_LABELS = {"자격-필수", "자격-제외"}
CATEGORIES = [f"C{i:02d}" for i in range(1, 16)]
RANDOM_STATE = 20261116


def text_pipeline(max_features: int = 60000, multilabel: bool = False) -> Pipeline:
    clf = LogisticRegression(max_iter=2000, class_weight="balanced", C=4.0, random_state=RANDOM_STATE)
    return Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True, max_features=max_features)),
        ("clf", OneVsRestClassifier(clf) if multilabel else clf),
    ])


def norm_label(label: str) -> str | None:
    if label == "자격-필수·제외":
        return "자격-필수"
    return label if label in SENTENCE_LABELS else None


def load_sentences():
    rows = []
    for r in csv.DictReader((GOLD / "sentences.csv").open(encoding="utf-8-sig")):
        label = norm_label(r["label"])
        if label and r["split"] in ("dev", "test") and r["text"].strip():
            rows.append((r["text"], label, r["split"]))
    return rows


def load_conditions():
    rows = []
    for r in csv.DictReader((GOLD / "conditions.csv").open(encoding="utf-8-sig")):
        if r["split"] in ("dev", "test") and r["evidence"].strip() and r["cond_type"]:
            rows.append((r["evidence"], r["cond_type"], r["split"]))
    return rows


def goldset_documents():
    """정답세트 원공고별 본문(공고문 텍스트)과 분야 라벨. 본문은 data/cache 에 저장해 다시 쓴다."""
    CACHE.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE / "goldset_texts.json"
    cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
    docs: dict[str, dict] = {}
    for n in Notice.objects.filter(source="answer-set"):
        d = docs.setdefault(n.parent_id, {"categories": set(), "file": None, "split": n.split})
        d["categories"].update(n.categories or [])
        d["file"] = d["file"] or n.file_name or (n.display or {}).get("sourceFile")
    for parent_id, d in docs.items():
        if parent_id in cache or not d["file"]:
            continue
        path = NOTICE_DIR / d["file"]
        cache[parent_id] = "\n".join(textify(path)["pages"]) if path.exists() else ""
    cache_file.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    return [(cache.get(pid, ""), sorted(d["categories"]), d["split"]) for pid, d in docs.items() if cache.get(pid)]


def main() -> None:
    sentences = load_sentences()
    conditions = load_conditions()
    documents = goldset_documents()

    # 1) 문장 라벨
    s_dev = [(t, y) for t, y, s in sentences if s == "dev"]
    s_test = [(t, y) for t, y, s in sentences if s == "test"]
    sent_model = text_pipeline()
    sent_model.fit([t for t, _ in s_dev], [y for _, y in s_dev])
    pred = sent_model.predict([t for t, _ in s_test])
    gold = [y for _, y in s_test]
    sent_macro = f1_score(gold, pred, labels=SENTENCE_LABELS, average="macro", zero_division=0)
    sent_per = dict(zip(SENTENCE_LABELS, f1_score(gold, pred, labels=SENTENCE_LABELS, average=None, zero_division=0)))
    elig_gold = [y in ELIGIBILITY_LABELS for y in gold]
    elig_pred = [y in ELIGIBILITY_LABELS for y in pred]
    elig_recall = recall_score(elig_gold, elig_pred, zero_division=0)

    # 2) 조건 유형
    c_dev = [(t, y) for t, y, s in conditions if s == "dev"]
    c_test = [(t, y) for t, y, s in conditions if s == "test"]
    type_model = text_pipeline(max_features=30000)
    type_model.fit([t for t, _ in c_dev], [y for _, y in c_dev])
    type_pred = type_model.predict([t for t, _ in c_test])
    type_gold = [y for _, y in c_test]
    type_labels = sorted(set(type_gold))
    type_macro = f1_score(type_gold, type_pred, labels=type_labels, average="macro", zero_division=0)
    type_acc = float(np.mean([a == b for a, b in zip(type_gold, type_pred)]))

    # 3) 공고 분야 (다중 라벨)
    mlb = MultiLabelBinarizer(classes=CATEGORIES)
    d_dev = [(t, y) for t, y, s in documents if s and "test" not in s]
    d_test = [(t, y) for t, y, s in documents if s and "test" in s]
    cat_model = text_pipeline(max_features=60000, multilabel=True)
    cat_model.fit([t for t, _ in d_dev], mlb.fit_transform([y for _, y in d_dev]))
    cat_pred = cat_model.predict([t for t, _ in d_test])
    cat_gold = mlb.transform([y for _, y in d_test])
    cat_micro = f1_score(cat_gold, cat_pred, average="micro", zero_division=0)
    cat_macro = f1_score(cat_gold, cat_pred, average="macro", zero_division=0)

    # 최종 모델: dev + test
    final_sent = text_pipeline().fit([t for t, _, _ in sentences], [y for _, y, _ in sentences])
    final_type = text_pipeline(max_features=30000).fit([t for t, _, _ in conditions], [y for _, y, _ in conditions])
    final_cat = text_pipeline(max_features=60000, multilabel=True).fit(
        [t for t, _, _ in documents], mlb.fit_transform([y for _, y, _ in documents]))
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_sent, MODEL_DIR / "sentence_label.joblib", compress=3)
    joblib.dump(final_type, MODEL_DIR / "condition_type.joblib", compress=3)
    joblib.dump({"model": final_cat, "classes": CATEGORIES}, MODEL_DIR / "category.joblib", compress=3)
    meta = {
        "version": "eligibility_v1",
        "trained_on": "dev+test (최종), 평가 수치는 dev만으로 학습한 모델",
        "date": date.today().isoformat(),
        "counts": {"sentences": len(sentences), "conditions": len(conditions), "documents": len(documents)},
    }
    (MODEL_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# 자격 추출 분류기 평가 (eligibility_v1)",
        "",
        "> `backend/ml/train_eligibility.py` 1회 실행 결과. 학습 split=dev, 평가 split=test(평가용), '제외(중복)' 미사용.",
        "> 설정: 글자 n-gram(2~4) TF-IDF(char_wb, min_df=2, sublinear_tf) + 로지스틱 회귀(class_weight=balanced, C=4). 하이퍼파라미터 탐색 없음.",
        "> 최종 저장 모델(`backend/ml/models/eligibility_v1/`)은 평가 뒤 dev+test로 다시 학습했다. 아래 수치는 dev만으로 학습한 모델의 것이다.",
        "",
        "## 1. 문장 라벨 (자격-필수 / 자격-제외 / 가점 / 제출서류 / 기타)",
        "",
        f"- 학습 {len(s_dev):,}문장 · 평가 {len(s_test):,}문장 ('검수 필요' 라벨 제외)",
        f"- **Macro F1 {sent_macro:.3f}**",
        f"- **자격 문장 재현율 {elig_recall:.3f}** (정답이 자격-필수·자격-제외인 문장 중 자격 문장으로 고른 비율)",
        "",
        "| 라벨 | F1 |",
        "|---|---|",
        *[f"| {k} | {v:.3f} |" for k, v in sent_per.items()],
        "",
        "## 2. 조건 유형 (29종 중 데이터가 있는 유형)",
        "",
        f"- 학습 {len(c_dev):,}조건 · 평가 {len(c_test):,}조건 (근거 문장 → 유형)",
        f"- **Macro F1 {type_macro:.3f}** (평가에 나온 {len(type_labels)}개 유형 기준) · 정확도 {type_acc:.3f}",
        "",
        "## 3. 공고 분야 C01–C15 (다중 라벨, 공고 본문)",
        "",
        f"- 학습 {len(d_dev)}건 · 평가 {len(d_test)}건 (원공고 단위)",
        f"- Micro F1 {cat_micro:.3f} · Macro F1 {cat_macro:.3f}",
        "",
        "## 해석",
        "",
        "- 판정은 규칙(판정식)으로만 한다. 분류기는 자격 문장 찾기·유형 지정·분야 분류에만 쓰고, 값·판정식을 만들지 못한 조건은 `check(원문 문장)`으로 남긴다.",
        "- 자동 추출 공고는 '검수 대기'로 들어가며, 관리자 검수(또는 일괄 게시) 전에는 사용자에게 보이지 않는다.",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"문장 Macro F1 {sent_macro:.3f} · 자격 문장 재현율 {elig_recall:.3f} · 유형 Macro F1 {type_macro:.3f} · "
          f"분야 Micro F1 {cat_micro:.3f} (학습 문장 {len(s_dev)}, 조건 {len(c_dev)}, 공고 {len(d_dev)})")


if __name__ == "__main__":
    main()
