#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from common import OUTPUT_ROOT, dump_json, utc_now


def main() -> None:
    parser = argparse.ArgumentParser(description="Export final asset manifest for front-end or asset management.")
    parser.add_argument("--output", default=str(OUTPUT_ROOT / "reports" / "manifest.json"))
    args = parser.parse_args()

    assets = []
    for stage in ("raw", "review", "final"):
        for image_path in sorted((OUTPUT_ROOT / stage).glob("*/*/*.png")):
            parts = image_path.relative_to(OUTPUT_ROOT).parts
            filename = image_path.name
            version = 1
            if "_v" in filename:
                try:
                    version = int(Path(filename).stem.split("_v")[-1])
                except ValueError:
                    version = 1
            assets.append(
                {
                    "character": parts[1],
                    "state": parts[2],
                    "path": str(image_path),
                    "version": version,
                    "stage": stage,
                    "notes": "",
                }
            )
    payload = {
        "schema_version": 1,
        "generated_at": utc_now(),
        "asset_count": len(assets),
        "assets": assets,
    }
    dump_json(Path(args.output), payload)
    print(Path(args.output))


if __name__ == "__main__":
    main()

