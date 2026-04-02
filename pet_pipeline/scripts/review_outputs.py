#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import OUTPUT_ROOT, dump_json, utc_now, write_log


def main() -> None:
    parser = argparse.ArgumentParser(description="Index raw/review/final outputs and create a review manifest.")
    parser.add_argument("--output", default=str(OUTPUT_ROOT / "reports" / "review_manifest.json"))
    args = parser.parse_args()

    entries = []
    for stage in ("raw", "review", "final"):
        for image_path in sorted((OUTPUT_ROOT / stage).glob("*/*/*.png")):
            parts = image_path.relative_to(OUTPUT_ROOT).parts
            entries.append(
                {
                    "stage": stage,
                    "character_id": parts[1],
                    "state_id": parts[2],
                    "path": str(image_path),
                    "score_identity": None,
                    "score_expression": None,
                    "score_cleanup": None,
                    "review_notes": "",
                    "indexed_at": utc_now(),
                }
            )
    payload = {"generated_at": utc_now(), "count": len(entries), "entries": entries}
    output_path = Path(args.output)
    dump_json(output_path, payload)
    log_path = write_log("review-outputs", {"count": len(entries), "output_path": str(output_path)})
    print(json.dumps({"ok": True, "output_path": str(output_path), "log_path": str(log_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

