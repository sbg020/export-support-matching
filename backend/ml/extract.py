"""공고 텍스트 → 자격 조건·제출 서류·분야 초안 (REVISION_05 §2.7-2).

공고 텍스트 → 문장 분류기로 자격·서류 문장 선택 → 유형 분류기로 유형 지정 → 사전·정규식으로 값 추출
(지역, 기업 유형, 업종, 금액, 연수, 수출액) → 판정식(JSON).
값이나 판정식을 만들 수 없는 조건은 check("원문 문장")으로 두고 importance는 유형 기본값을 쓴다.
조건마다 source = 자동추출(eligibility_v1) 과 분류기 확률(confidence)을 남긴다. 판정은 하지 않는다.
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import joblib

from eligibility.engine import default_importance
from ml.textify import split_sentences

MODEL_DIR = Path(__file__).resolve().parent / "models" / "eligibility_v1"
SOURCE = "자동추출(eligibility_v1)"
SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
SIDO_LONG = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
    "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북",
    "충청남도": "충남", "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남",
    "제주특별자치도": "제주",
}
COMPANY_TOKENS = ["중소기업", "중견기업", "소상공인", "소기업", "창업기업", "벤처기업", "대기업", "상장기업", "공공기관", "비영리·단체",
                  "개인사업자", "법인사업자", "농어업 생산자"]
INDUSTRY_TAGS = {
    "식품": ["식품", "농식품", "K-Food", "K-푸드"], "농수산물": ["농수산", "농산물", "수산물"], "화장품": ["화장품", "뷰티"],
    "의료기기": ["의료기기"], "바이오·의약": ["바이오", "제약", "의약"], "ICT·SW": ["ICT", "소프트웨어", "SW", "IT기업", "AI"],
    "콘텐츠": ["콘텐츠"], "자동차부품": ["자동차부품", "자동차 부품", "자동차전장"], "기계": ["기계"], "신발": ["신발"], "안경": ["안경"],
    "제조업": ["제조업", "제조기업", "제조 기업"],
}
EXCLUDED_INDUSTRY = ["사행", "유흥", "지원제외업종", "지원 제외 업종"]
FLAG_HINTS = {
    "B01": ["체납"], "B02": ["휴업", "폐업", "부도"], "B03": ["파산", "회생", "법정관리"], "B04": ["신용불량", "채무불이행", "불량거래"],
    "B05": ["참여제한", "참여 제한", "부정수급", "제재"], "B08": ["임금체불", "물의", "법령 위반"],
}


@lru_cache(maxsize=1)
def models():
    return {
        "sentence": joblib.load(MODEL_DIR / "sentence_label.joblib"),
        "type": joblib.load(MODEL_DIR / "condition_type.joblib"),
        "category": joblib.load(MODEL_DIR / "category.joblib"),
    }


def _money(num: str, unit: str) -> float:
    n = float(num.replace(",", ""))
    return n * {"억": 1e8, "천만": 1e7, "백만": 1e6, "만": 1e4}.get(unit, 1)


def regions_in(text: str) -> list[str]:
    found = [short for long, short in SIDO_LONG.items() if long in text]
    found += [s for s in SIDO if re.search(rf"(?<![가-힣]){s}(?![가-힣])", text) or re.search(rf"{s}(시|도|지역|소재|도내)", text)]
    return sorted(set(found), key=SIDO.index)


def build_expr(cond_type: str, kind: str, text: str) -> dict:
    """유형별 값 추출. 확실하지 않으면 check."""
    exclude = kind == "제외"
    if cond_type in ("A02", "A03"):
        if "전국" in text and not exclude:
            return {"true": 1}
        regions = regions_in(text)
        if regions:
            return {"atom": "hq_region" if cond_type == "A02" else "site_region", "op": "in", "value": regions}
    if cond_type == "A01":
        tokens = [t for t in COMPANY_TOKENS if t in text]
        if tokens:
            return {"atom": "company_type", "op": "in", "value": tokens}
    if cond_type == "A04":
        if exclude and any(k in text for k in EXCLUDED_INDUSTRY):
            return {"atom": "industry", "op": "in", "value": ["사행·유흥 등 지원제외업종"]}
        tags = [tag for tag, keys in INDUSTRY_TAGS.items() if any(k in text for k in keys)]
        if tags:
            return {"atom": "industry", "op": "in", "value": tags}
    if cond_type == "A06":
        m = re.search(r"수출(?:실적|액)[^0-9]{0,15}([\d,\.]+)\s*(만|천만|억)?\s*(?:달러|불|USD|\$)\s*(이상|이하|미만|초과)", text)
        if m:
            value = _money(m.group(1), m.group(2) or "")
            op = {"이상": ">=", "이하": "<=", "미만": "<", "초과": ">"}[m.group(3)]
            return {"atom": "export_usd", "op": op, "value": value}
    if cond_type == "A07":
        m = re.search(r"매출(?:액)?[^0-9]{0,15}([\d,\.]+)\s*(억|천만|백만|만)\s*원\s*(이상|이하|미만|초과)", text)
        if m:
            op = {"이상": ">=", "이하": "<=", "미만": "<", "초과": ">"}[m.group(3)]
            return {"atom": "revenue_krw", "op": op, "value": _money(m.group(1), m.group(2))}
    if cond_type == "A08":
        m = re.search(r"(?:업력|창업)[^0-9]{0,10}(\d+)\s*년\s*(이상|이하|미만|이내|초과)", text)
        if m:
            op = {"이상": ">=", "이하": "<=", "미만": "<", "이내": "<=", "초과": ">"}[m.group(2)]
            return {"atom": "business_age_years", "op": op, "value": int(m.group(1))}
    if exclude and cond_type in FLAG_HINTS and any(k in text for k in FLAG_HINTS[cond_type]):
        return {"flag": cond_type}
    if cond_type == "B09":
        return {"intent": "export"}
    return {"check": text[:200]}


def extract_notice(program_id: str, pages: list[str]) -> dict:
    """한 공고의 조건·서류·분야 초안."""
    m = models()
    sentences = split_sentences(pages)
    if not sentences:
        return {"conditions": [], "documents": [], "categories": []}
    texts = [t for _, t in sentences]
    probs = m["sentence"].predict_proba(texts)
    labels = m["sentence"].classes_
    conditions, documents = [], []
    for (page, text), row in zip(sentences, probs):
        best = int(row.argmax())
        label, confidence = labels[best], float(row[best])
        if label in ("자격-필수", "자격-제외"):
            type_probs = m["type"].predict_proba([text])[0]
            t_best = int(type_probs.argmax())
            cond_type = m["type"].classes_[t_best]
            kind = "제외" if label == "자격-제외" else "필수"
            expr = build_expr(cond_type, kind, text)
            index = len(conditions) + 1
            conditions.append({
                "cond_id": f"{program_id}-X{index:02d}",
                "program_id": program_id,
                "parent_id": program_id,
                "kind": kind,
                # 같은 유형의 필수 조건은 같은 그룹(OR)으로 묶는다
                "group": cond_type if kind == "필수" else "",
                "cond_type": cond_type,
                "cond_types": cond_type,
                "affects_verdict": "N" if cond_type in ("C06", "C07", "C08") else "Y",
                "expr": expr,
                "expr_text": "확인 필요(원문)" if "check" in expr else "",
                "certainty": "애매" if "check" in expr else "명확",
                "evidence": text,
                "page": page,
                "source": SOURCE,
                "importance": default_importance(cond_type),
                "confidence": round(min(confidence, float(type_probs[t_best])), 3),
            })
        elif label == "제출서류":
            documents.append({"name": text[:80], "evidence": text, "page": page, "confidence": round(confidence, 3)})
    cat = m["category"]
    cat_probs = cat["model"].predict_proba(["\n".join(pages)])[0]
    categories = [code for code, p in zip(cat["classes"], cat_probs) if p >= 0.5]
    if not categories:
        categories = [cat["classes"][int(cat_probs.argmax())]]
    return {"conditions": conditions, "documents": documents, "categories": categories}


DATE_RE = re.compile(r"(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})")


def _iso(y, m, d) -> str | None:
    try:
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    except ValueError:
        return None


def extract_metadata(file_name: str, pages: list[str]) -> dict:
    """첫 쪽에서 공고명·접수 기간·원문 URL을 정규식으로 찾는다. 찾지 못한 값은 None (지어내지 않는다)."""
    first = pages[0] if pages else ""
    head = "\n".join(pages[:2])
    stem = Path(file_name).stem
    prefix, _, rest = stem.partition("_")
    organizer = "KOTRA" if prefix.upper() == "KOTRA" else None
    title = None
    for line in first.split("\n")[:15]:
        line = line.strip()
        if 8 <= len(line) <= 80 and any(k in line for k in ("공고", "모집", "안내", "사업", "지원")):
            title = line
            break
    title = title or rest.strip() or stem
    apply_start = apply_end = None
    m = re.search(r"(?:신청|접수|모집)\s*(?:기간|기한|일정)[^\n]{0,60}", head)
    if m:
        dates = DATE_RE.findall(m.group(0))
        if dates:
            apply_start = _iso(*dates[0])
            if len(dates) > 1:
                apply_end = _iso(*dates[-1])
            else:
                apply_end = apply_start if "까지" in m.group(0) else None
                apply_start = None if apply_end else apply_start
    url = re.search(r"https?://[^\s)\]]+", head)
    return {
        "title": title,
        "organizer": organizer,
        "channel": prefix or None,
        "apply_start": apply_start,
        "apply_end": apply_end,
        "period_note": m.group(0).strip() if m else None,
        "source_url": url.group(0) if url else None,
    }
