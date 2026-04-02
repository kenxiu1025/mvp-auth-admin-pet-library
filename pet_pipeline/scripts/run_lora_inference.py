#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from build_prompt import build_prompt
from comfy_adapter import build_template_stub
from common import OUTPUT_ROOT, dump_json, load_profiles, utc_now


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare LoRA inference metadata for batch generation.")
    parser.add_argument("--character", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--lora-name", required=True)
    args = parser.parse_args()

    profiles = load_profiles()
    profile = profiles["profiles"]["lora_inference"]
    prompt_info = build_prompt(args.character, args.state, "lora_inference", use_llm=False)
    payload = {
        "character_id": args.character,
        "state_id": args.state,
        "profile": "lora_inference",
        "lora_name": args.lora_name,
        "prompt_info": prompt_info,
        "created_at": utc_now(),
        "workflow_status": "needs_local_template_configuration",
        "template_stub": build_template_stub(
            Path(profile["workflow_template"]),
            {"character_id": args.character, "state_id": args.state, "lora_name": args.lora_name},
        ),
    }
    output_path = OUTPUT_ROOT / "reports" / f"lora-inference-{args.character}-{args.state}.json"
    dump_json(output_path, payload)
    print(json.dumps({"ok": True, "output_path": str(output_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

