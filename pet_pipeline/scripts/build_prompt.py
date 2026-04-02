#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path

from common import CONFIG_ROOT, PROMPTS_ROOT, load_character, load_profiles, load_states, resolve_env


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def ollama_expand(prompt: str, system_instruction: str | None = None) -> str | None:
    base_url = resolve_env("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    model = resolve_env("OLLAMA_MODEL", "qwen3:4b")
    payload = {
        "model": model,
        "stream": False,
        "prompt": (
            system_instruction + "\n\n" + prompt
            if system_instruction
            else prompt
        ),
    }
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            body = json.loads(response.read().decode("utf-8"))
            text = str(body.get("response", "")).strip()
            return text or None
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
        return None


def build_prompt(character_id: str, state_id: str, profile_name: str, use_llm: bool = False) -> dict[str, str]:
    character = load_character(character_id)
    states = load_states()
    profiles = load_profiles()
    state = states[state_id]
    profile = profiles["profiles"][profile_name]

    base_prompt = read_text(PROMPTS_ROOT / "base_prompt.txt")
    negative_prompt = read_text(PROMPTS_ROOT / "negative_prompt.txt")
    state_template = read_text(PROMPTS_ROOT / "state_templates" / f"{state_id}.txt")

    positive_parts = [
        base_prompt,
        ", ".join(character["style_tags"]),
        ", ".join(character["fixed_traits"]),
        character["default_pose"],
        character["default_positive_prompt_addon"],
        state_template,
        state["prompt_addon"],
    ]
    negative_parts = [
        negative_prompt,
        ", ".join(character["forbidden_traits"]),
        character["default_negative_prompt_addon"],
        state["negative_addon"],
    ]

    positive = ", ".join(part.strip() for part in positive_parts if part and str(part).strip())
    negative = ", ".join(part.strip() for part in negative_parts if part and str(part).strip())

    llm_used = False
    if use_llm:
        expanded = ollama_expand(
            positive,
            system_instruction=(
                "Expand the following image prompt slightly for a stable cute mascot render. "
                "Keep identity traits unchanged and do not add accessories or new pose changes."
            ),
        )
        if expanded:
            positive = expanded
            llm_used = True

    return {
        "positive_prompt": positive,
        "negative_prompt": negative,
        "profile_builder": profile["builder"],
        "llm_used": llm_used,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build prompt text from character + state + profile config.")
    parser.add_argument("--character", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--profile", default="preview")
    parser.add_argument("--use-llm", action="store_true")
    args = parser.parse_args()

    result = build_prompt(args.character, args.state, args.profile, use_llm=args.use_llm)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

