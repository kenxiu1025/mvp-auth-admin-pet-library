#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from common import OUTPUT_ROOT, PROMPTS_ROOT, dump_json, load_character, load_states


DEFAULT_MODEL = os.environ.get("OLLAMA_QC_MODEL", "qwen3-vl:4b")
DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
JSON_DECODER = json.JSONDecoder()


def build_prompt(character: dict[str, Any], state: dict[str, Any]) -> str:
    template = (PROMPTS_ROOT / "qc_single_image_prompt.txt").read_text(encoding="utf-8")
    return template.format(
        character_id=character["character_id"],
        display_name=character["display_name"],
        species=character["species"],
        style_tags=", ".join(character.get("style_tags", [])),
        fixed_traits=", ".join(character.get("fixed_traits", [])),
        forbidden_traits=", ".join(character.get("forbidden_traits", [])),
        eye_color=character.get("eye_color", ""),
        ear_type=character.get("ear_type", ""),
        fur_pattern=character.get("fur_pattern", ""),
        body_shape=character.get("body_shape", ""),
        default_pose=character.get("default_pose", ""),
        state_id=state["state_id"],
        emotion_goal=state.get("emotion_goal", ""),
        facial_focus=state.get("facial_focus", ""),
        state_notes=state.get("notes", ""),
    )


def image_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def extract_json_candidate(text: str) -> Any:
    stripped = text.strip()
    if not stripped:
        raise ValueError("empty text")
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        repaired = repair_json_text(stripped)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass

    start = stripped.find("{")
    if start == -1:
        raise ValueError("no JSON object found")
    candidate = stripped[start:]
    try:
        parsed, _ = JSON_DECODER.raw_decode(candidate)
    except json.JSONDecodeError:
        repaired = repair_json_text(candidate)
        parsed, _ = JSON_DECODER.raw_decode(repaired)
    return parsed


def repair_json_text(text: str) -> str:
    candidate = text.strip()
    start = candidate.find("{")
    if start != -1:
        candidate = candidate[start:]

    in_string = False
    escape = False
    stack: list[str] = []
    for char in candidate:
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            stack.append("}")
        elif char == "[":
            stack.append("]")
        elif char in {"}", "]"} and stack and stack[-1] == char:
            stack.pop()

    if in_string:
        candidate += '"'
    while stack:
        candidate += stack.pop()
    return candidate


def coerce_bool(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "yes", "y", "1"}:
            return True
        if lowered in {"false", "no", "n", "0", ""}:
            return False
    return default


def coerce_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []
    return [str(value).strip()] if str(value).strip() else []


def normalize_score(value: Any) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    if score > 10:
        score = score / 10.0
    score = max(0.0, min(10.0, score))
    rounded = round(score, 1)
    if rounded.is_integer():
        return int(rounded)
    return rounded


def extract_payload_from_ollama_response(raw_text: str) -> Any:
    stripped = raw_text.strip()
    if not stripped:
        raise RuntimeError("Empty Ollama response body")

    chunks: list[dict[str, Any]] = []
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            chunks = [parsed]
        elif isinstance(parsed, list):
            chunks = [item for item in parsed if isinstance(item, dict)]
    except json.JSONDecodeError:
        for line in stripped.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                chunks.append(item)

    if not chunks:
        raise RuntimeError("Ollama response body is not valid JSON or NDJSON")

    response_parts: list[str] = []
    thinking_parts: list[str] = []
    for chunk in chunks:
        response_value = chunk.get("response")
        if isinstance(response_value, str) and response_value:
            response_parts.append(response_value)
        thinking_value = chunk.get("thinking")
        if isinstance(thinking_value, str) and thinking_value:
            thinking_parts.append(thinking_value)

    candidates = [
        "".join(response_parts).strip(),
        "".join(thinking_parts).strip(),
    ]

    if len(chunks) == 1:
        single = chunks[0]
        if isinstance(single.get("response"), str):
            candidates.append(single["response"].strip())
        if isinstance(single.get("thinking"), str):
            candidates.append(single["thinking"].strip())

    for candidate in candidates:
        if not candidate:
            continue
        try:
            return extract_json_candidate(candidate)
        except (ValueError, json.JSONDecodeError):
            continue

    raise RuntimeError("Neither Ollama response nor thinking contained valid JSON")


def call_ollama(prompt: str, image_path: Path, model: str, base_url: str) -> Any:
    payload = {
        "model": model,
        "prompt": prompt,
        "images": [image_to_base64(image_path)],
        "stream": True,
        "format": "json",
        "options": {
            "temperature": 0.1,
        },
    }

    req = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            raw_text = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Ollama API HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ollama API request failed: {exc}") from exc

    return extract_payload_from_ollama_response(raw_text)


def normalize_output(data: Any, expected_character: str, expected_state: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise RuntimeError("QC output is not a JSON object")

    normalized = {
        "character_id": str(data.get("character_id") or expected_character),
        "state_id": str(data.get("state_id") or expected_state),
        "is_same_character": coerce_bool(data.get("is_same_character"), True),
        "expression_clear": coerce_bool(data.get("expression_clear"), True),
        "usable_directly": coerce_bool(data.get("usable_directly"), False),
        "needs_manual_fix": coerce_bool(data.get("needs_manual_fix"), True),
        "reject": coerce_bool(data.get("reject"), False),
        "scores": {
            "character_consistency": 0,
            "expression_clarity": 0,
            "overall_usability": 0,
        },
        "problems": coerce_string_list(data.get("problems")),
        "fix_suggestions": coerce_string_list(data.get("fix_suggestions")),
        "summary": str(data.get("summary") or ""),
    }
    scores = data.get("scores")
    if not isinstance(scores, dict):
        scores = {}
    normalized["scores"]["character_consistency"] = normalize_score(scores.get("character_consistency"))
    normalized["scores"]["expression_clarity"] = normalize_score(scores.get("expression_clarity"))
    normalized["scores"]["overall_usability"] = normalize_score(scores.get("overall_usability"))

    if normalized["character_id"] != expected_character:
        normalized["character_id"] = expected_character
    if normalized["state_id"] != expected_state:
        normalized["state_id"] = expected_state

    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local Ollama VL single image QC for pet_pipeline.")
    parser.add_argument("--image", required=True)
    parser.add_argument("--character", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--save-report", action="store_true", default=True)
    parser.add_argument("--no-save-report", action="store_false", dest="save_report")
    parser.add_argument("--report-path", default=None)
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    character = load_character(args.character)
    states = load_states()
    if args.state not in states:
        raise SystemExit(f"Unknown state: {args.state}")
    state = states[args.state]

    prompt = build_prompt(character, state)
    parsed = call_ollama(prompt, image_path, args.model, args.base_url)
    result = normalize_output(parsed, args.character, args.state)

    if args.save_report:
        report_path = Path(args.report_path) if args.report_path else OUTPUT_ROOT / "reports" / f"qc_{args.character}_{args.state}.json"
        dump_json(report_path, result)

    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
