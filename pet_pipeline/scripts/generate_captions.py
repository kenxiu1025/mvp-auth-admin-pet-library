#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import PIPELINE_ROOT, list_character_ids, load_character, utc_now


def build_caption(character: dict) -> str:
    identity = [
        character["training"]["trigger_token"],
        *character["fixed_traits"][:5],
        character["default_pose"],
    ]
    return ", ".join(identity)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate starter captions for LoRA datasets.")
    parser.add_argument("--character", action="append", dest="characters")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    characters = args.characters or list_character_ids()
    created = []
    for character_id in characters:
        character = load_character(character_id)
        training_root = PIPELINE_ROOT / "assets" / "training" / character_id
        caption_dir = training_root / "captions"
        caption_dir.mkdir(parents=True, exist_ok=True)
        caption = build_caption(character)
        for image_path in sorted((training_root / "processed").glob("*")):
            if image_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue
            target = caption_dir / f"{image_path.stem}.txt"
            if target.exists() and not args.overwrite:
                continue
            target.write_text(caption + "\n", encoding="utf-8")
            created.append(str(target))
    print(json.dumps({"ok": True, "created_count": len(created), "created": created, "generated_at": utc_now()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

