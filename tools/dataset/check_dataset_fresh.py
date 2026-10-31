"""정답 세트를 고친 뒤 JSON을 다시 만들지 않았는지 확인한다. (docs/revisions/REVISION_02.md §13.1)

테스트 데이터셋 JSON의 meta에 적힌 입력 파일 SHA-256을 지금 파일과 비교하고,
test-dataset.meta.json이 본 JSON의 meta와 같은지 확인한다. 다르면 종료 코드 1.

실행 (저장소 루트에서):
    tools/.venv/Scripts/python tools/dataset/check_dataset_fresh.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

DEFAULT_DATASET = Path("frontend/src/data/test-dataset.json")


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="테스트 데이터셋이 정답 세트와 같은지 확인")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    args = parser.parse_args(argv)

    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    meta = dataset["meta"]
    problems: list[str] = []

    entries = [(s["file"], s["sha256"]) for s in meta["sources"]]
    entries.append((meta["inventory"]["file"], meta["inventory"]["sha256"]))
    if meta.get("sourceUrls"):
        entries.append((meta["sourceUrls"]["file"], meta["sourceUrls"]["sha256"]))
    for file, expected in entries:
        path = Path(file)
        if not path.exists():
            problems.append(f"입력 파일이 없습니다: {file}")
        elif sha256_of(path) != expected:
            problems.append(f"입력 파일이 바뀌었습니다: {file} → JSON을 다시 만드세요.")

    meta_path = args.dataset.with_name(args.dataset.stem + ".meta.json")
    if not meta_path.exists():
        problems.append(f"{meta_path} 이(가) 없습니다.")
    elif json.loads(meta_path.read_text(encoding="utf-8")) != meta:
        problems.append(f"{meta_path} 의 내용이 {args.dataset} 의 meta와 다릅니다.")

    if problems:
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1
    print(f"최신 상태입니다: {meta['datasetVersion']} (입력 {len(entries)}개 일치)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
