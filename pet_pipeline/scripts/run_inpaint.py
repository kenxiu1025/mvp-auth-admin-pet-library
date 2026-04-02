#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from build_prompt import build_prompt
from comfy_adapter import ComfyAdapter, patch_workflow_graph
from common import OUTPUT_ROOT, dump_json, final_filename, load_character, load_json, load_profiles, next_version, utc_now, write_log


def pick_latest_raw(character_id: str, state_id: str) -> Path:
    raw_dir = OUTPUT_ROOT / "raw" / character_id / state_id
    candidates = sorted(raw_dir.glob("*.png"))
    if not candidates:
        raise FileNotFoundError(f"No raw PNG found under {raw_dir}")
    return candidates[-1]


def pick_mask(character: dict, state_id: str) -> Path:
    preferred = character.get("preferred_masks", {})
    if state_id == "sleepy" and preferred.get("eyes"):
        return Path(preferred["eyes"])
    return Path(preferred.get("face", ""))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run face inpaint jobs against local ComfyUI.")
    parser.add_argument("--character", required=True)
    parser.add_argument("--state", required=True)
    args = parser.parse_args()

    profiles = load_profiles()
    profile = profiles["profiles"]["inpaint"]
    character = load_character(args.character)
    source_image = pick_latest_raw(args.character, args.state)
    mask_path = pick_mask(character, args.state)
    if not mask_path.exists():
        raise FileNotFoundError(f"Face mask missing: {mask_path}")
    checkpoint = str(profile.get("checkpoint", "")).strip()
    inpaint_model = str(profile.get("inpaint", {}).get("inpaint_model_name", "")).strip()
    if not checkpoint:
        raise RuntimeError("inpaint profile checkpoint is not configured")
    if not inpaint_model:
        raise RuntimeError("inpaint profile inpaint.inpaint_model_name is not configured")

    prompt_info = build_prompt(args.character, args.state, "inpaint", use_llm=False)
    adapter = ComfyAdapter()
    source_alias = adapter.ensure_input(source_image, f"{args.character}_{args.state}_{source_image.name}")
    mask_alias = adapter.ensure_input(mask_path, f"{args.character}_{args.state}_{mask_path.name}")

    workflow = load_json(Path(profile["workflow_template"]))
    seed = random.randint(1, 2_147_483_647)
    output_stage = profile["stage"]
    output_dir = OUTPUT_ROOT / output_stage / args.character / args.state
    version = next_version(output_dir, f"{args.character}_{args.state}_{output_stage}")
    final_name = final_filename(args.character, args.state, output_stage, version)

    prompt_graph = patch_workflow_graph(
        workflow,
        {
            "__SOURCE_IMAGE__": source_alias,
            "__MASK_IMAGE__": mask_alias,
            "__POSITIVE_PROMPT__": prompt_info["positive_prompt"],
            "__NEGATIVE_PROMPT__": prompt_info["negative_prompt"],
            "__FILENAME_PREFIX__": f"{args.character}_{args.state}_{output_stage}_tmp",
        },
    )
    prompt_graph["1"]["inputs"]["ckpt_name"] = inpaint_model or checkpoint
    prompt_graph["5"]["inputs"]["seed"] = seed
    prompt_graph["5"]["inputs"]["steps"] = int(profile["steps"])
    prompt_graph["5"]["inputs"]["cfg"] = float(profile["cfg_scale"])
    prompt_graph["5"]["inputs"]["sampler_name"] = str(profile["sampler"])
    prompt_graph["5"]["inputs"]["scheduler"] = str(profile["scheduler"])
    prompt_graph["5"]["inputs"]["denoise"] = float(profile["denoise_strength"])

    prompt_id = adapter.submit(prompt_graph, client_id=f"inpaint_{args.character}_{args.state}_{seed}")
    history = adapter.wait_history(
        prompt_id,
        timeout_seconds=int(profiles["defaults"]["comfyui"]["timeout_seconds"]),
        poll_interval=int(profiles["defaults"]["comfyui"]["poll_interval_seconds"]),
    )
    saved_files = adapter.download_saved_images(history, "7", output_dir)
    if not saved_files:
        raise RuntimeError("No inpaint output image returned from ComfyUI")
    target_path = output_dir / final_name
    saved_files[0].rename(target_path)

    payload = {
        "character_id": args.character,
        "state_id": args.state,
        "profile": "inpaint",
        "source_image": str(source_image),
        "mask_path": str(mask_path),
        "prompt_info": prompt_info,
        "checkpoint": checkpoint,
        "inpaint_model_name": inpaint_model,
        "created_at": utc_now(),
        "seed": seed,
        "prompt_id": prompt_id,
        "output_files": [str(target_path)],
        "workflow_status": "completed",
    }

    output_path = OUTPUT_ROOT / "reports" / f"inpaint-{args.character}-{args.state}.json"
    dump_json(output_path, payload)
    log_path = write_log("run-inpaint", payload)
    print(json.dumps({"ok": True, "metadata_path": str(output_path), "log_path": str(log_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
