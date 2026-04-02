#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import QUEUE_ROOT, append_jsonl, list_character_ids, load_profiles, load_states, utc_now


def main() -> None:
    parser = argparse.ArgumentParser(description="Append render jobs into pet_pipeline/queue/jobs.jsonl")
    parser.add_argument("--character", action="append", dest="characters")
    parser.add_argument("--states", nargs="+")
    parser.add_argument("--profile", default="preview", choices=["preview", "production", "lora_inference"])
    parser.add_argument("--variants", type=int, default=None)
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    profiles = load_profiles()["profiles"]
    states = load_states()
    characters = args.characters or list_character_ids()
    selected_states = args.states or list(states.keys())
    variants = args.variants or int(profiles[args.profile]["variants"])

    jobs_path = QUEUE_ROOT / "jobs.jsonl"
    created: list[dict] = []
    for character_id in characters:
        for state_id in selected_states:
            if state_id not in states:
                raise SystemExit(f"Unknown state: {state_id}")
            existing = len([row for row in Path(jobs_path).read_text(encoding='utf-8').splitlines() if row.strip()]) if jobs_path.exists() else 0
            job = {
                "job_id": f"{character_id}_{state_id}_{args.profile}_{existing + len(created) + 1:04d}",
                "character_id": character_id,
                "state_id": state_id,
                "profile": args.profile,
                "stage": profiles[args.profile]["stage"],
                "variants": variants,
                "status": "queued",
                "retry_count": 0,
                "version": 1,
                "notes": args.notes,
                "created_at": utc_now(),
            }
            append_jsonl(jobs_path, job)
            created.append(job)
    print(json.dumps({"ok": True, "created": created}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

