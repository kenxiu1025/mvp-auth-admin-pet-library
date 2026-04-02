#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import PIPELINE_ROOT, dump_json, list_character_ids, load_character, utc_now


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and prepare LoRA dataset folders.")
    parser.add_argument("--character", action="append", dest="characters")
    args = parser.parse_args()

    characters = args.characters or list_character_ids()
    reports = []
    for character_id in characters:
        character = load_character(character_id)
        training_root = PIPELINE_ROOT / "assets" / "training" / character_id
        raw_files = sorted((training_root / "raw").glob("*"))
        processed_files = sorted((training_root / "processed").glob("*"))
        caption_dir = training_root / "captions"
        caption_todo = [
            {
                "image": str(file),
                "suggested_caption_file": str(caption_dir / f"{file.stem}.txt"),
            }
            for file in processed_files
            if file.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        reports.append(
            {
                "character_id": character_id,
                "trigger_token": character["training"]["trigger_token"],
                "raw_count": len(raw_files),
                "processed_count": len(processed_files),
                "caption_todo": caption_todo,
            }
        )
    output_path = PIPELINE_ROOT / "output" / "reports" / "lora_dataset_report.json"
    dump_json(output_path, {"generated_at": utc_now(), "reports": reports})
    print(json.dumps({"ok": True, "report_path": str(output_path), "reports": reports}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

