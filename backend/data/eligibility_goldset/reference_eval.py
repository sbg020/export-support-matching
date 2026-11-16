"""EC 신청 자격 판정 참조 구현 (정답 세트의 '판정정답'을 만든 로직과 동일).

사용법:
    python reference_eval.py conditions.csv profiles.json programs_summary.csv > my_verdicts.csv

- conditions.csv 의 expr 열(JSON 판정식)을 기업 프로필에 적용해
  공고(세부사업)마다 '신청 가능 / 신청 불가 / 확인 필요'를 계산합니다.
- 판정 규칙
  1) affects_verdict == 'Y' 인 조건만 판정에 씁니다 (서류 허위·대리 신청 같은 절차 조건, 기관 재량, 세부 항목 한정 조건은 안내용).
  2) 필수 조건: 같은 group 안은 OR, 서로 다른 group 은 AND.
  3) 제외 조건: 하나라도 '해당'이면 신청 불가.
  4) 값이 False 인 필수 그룹 또는 True 인 제외 조건이 있으면 '신청 불가',
     그렇지 않고 판단할 수 없는 조건(None)이 남으면 '확인 필요', 모두 통과하면 '신청 가능'.
- 판정식 요소
  atom  : {"atom": 필드, "op": in|not_in|has|>|>=|<|<=, "value": 값}
  all / any / not : 3값 논리(True/False/None)
  flag  : {"flag": "B01"} 기업이 자기신고로 그 결격 항목에 '해당'한다고 답했는지
  intent: {"intent": "export"|"commit"} 수출 의향 / 참여 조건 수용 의사
  distributor : 유통·수입 제품 제외 조건. 제조 기업이면 False, 그 외 None
  check : 서류·담당자 확인 필요 → None
"""
import csv, json, sys

SIZE_EXPAND = {"소상공인": ["소상공인", "소기업", "중소기업"], "소기업": ["소기업", "중소기업"], "중기업": ["중기업", "중소기업"],
               "중견기업": ["중견기업"], "대기업": ["대기업"], "대기업(기업집단 소속)": ["대기업", "대기업(기업집단 소속)"]}
TRACKED = {"중소기업", "소기업", "중기업", "소상공인", "중견기업", "대기업", "대기업(기업집단 소속)", "대기업 출자회사", "상장기업",
           "공공기관", "지자체 출자기업", "비영리·단체", "간이과세자", "개인사업자", "법인사업자", "창업기업", "벤처기업", "농어업 생산자"}
REGION_ALIAS = {"전남광주": ["전남", "광주"]}

def ctypes(p):
    s = set(SIZE_EXPAND[p["size"]]) | set(p.get("attrs", []))
    if p["age"] < 7: s.add("창업기업")
    if "벤처기업" in p.get("certs", []): s.add("벤처기업")
    return s

def region_match(loc, v):
    if v == "전국": return True
    return any(loc == vv or loc.startswith(vv + " ") for vv in REGION_ALIAS.get(v, [v]))

def ev(e, p):
    if "true" in e: return True
    if "check" in e: return None
    if "flag" in e: return e["flag"] in p.get("issues", [])
    if "intent" in e: return p["intent_export"] if e["intent"] == "export" else p["intent_commit"]
    if "distributor" in e: return False if p.get("model") == "제조" else None
    if "not" in e:
        x = ev(e["not"], p); return None if x is None else (not x)
    if "all" in e:
        xs = [ev(x, p) for x in e["all"]]; return False if False in xs else (None if None in xs else True)
    if "any" in e:
        xs = [ev(x, p) for x in e["any"]]; return True if True in xs else (None if None in xs else False)
    f, op, v = e["atom"], e["op"], e["value"]
    if f == "company_type":
        have, vals = ctypes(p), set(v)
        if have & vals: return op == "in"
        return (op != "in") if vals <= TRACKED else None
    if f == "hq_region":
        m = any(region_match(p["hq"], x) for x in v); return m if op == "in" else not m
    if f == "site_region":
        m = any(region_match(s, x) for s in p["sites"] + [p["hq"]] for x in v); return m if op == "in" else not m
    if f == "industry":
        m = bool(set(p["industry"]) & set(v)); return m if op == "in" else not m
    if f == "product_hs": return bool(set(p.get("product_hs", [])) & set(v))
    if f == "certification":
        return any(any(c.split("(")[0].strip() in x or x.split("(")[0].strip() in c for c in p.get("certs", [])) for x in v)
    num = {"export_usd": p.get("export_usd"), "revenue_krw": p.get("revenue_krw"), "business_age_years": p.get("age"),
           "employees": p.get("employees"), "debt_ratio": p.get("debt_ratio")}.get(f)
    if num is None: return None
    return {">": num > v, ">=": num >= v, "<": num < v, "<=": num <= v}[op]

def judge(conds, p, program_id, parent_id):
    groups, fails, unknown = {}, [], []
    for c in conds:
        if c["program_id"] not in (program_id, parent_id) or c["affects_verdict"] != "Y": continue
        val = ev(json.loads(c["expr"]), p)
        if c["kind"] == "제외":
            if val is True: fails.append(c["cond_id"])
            elif val is None: unknown.append(c["cond_id"])
        else:
            groups.setdefault(c["group"], []).append((c["cond_id"], val))
    for lst in groups.values():
        vals = [v for _, v in lst]
        if True in vals: continue
        if all(v is False for v in vals): fails += [k for k, _ in lst]
        else: unknown += [k for k, v in lst if v is None]
    verdict = "신청 불가" if fails else ("확인 필요" if unknown else "신청 가능")
    return verdict, fails, unknown

if __name__ == "__main__":
    conds = list(csv.DictReader(open(sys.argv[1], encoding="utf-8-sig")))
    profiles = json.load(open(sys.argv[2], encoding="utf-8"))
    programs = list(csv.DictReader(open(sys.argv[3], encoding="utf-8-sig")))
    w = csv.writer(sys.stdout)
    w.writerow(["profile_id", "program_id", "verdict", "fail_conds", "unknown_conds"])
    for p in profiles:
        for pr in programs:
            v, f, u = judge(conds, p, pr["program_id"], pr["parent_id"])
            w.writerow([p["profile_id"], pr["program_id"], v, ";".join(f), ";".join(u)])
