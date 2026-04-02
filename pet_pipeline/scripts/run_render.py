#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from build_prompt import build_prompt
from comfy_adapter import ComfyAdapter, build_simple_img2img_prompt, patch_workflow_graph
from common import (
    OUTPUT_ROOT,
    QUEUE_ROOT,
    append_jsonl,
    dump_json,
    final_filename,
    load_character,
    load_json,
    load_profiles,
    next_version,
    read_jsonl,
    update_queue_record,
    utc_now,
    write_log,
)


def choose_source_image(character: dict) -> Path:
    for key in ("master_image_paths", "reference_image_paths"):
        for candidate in character.get(key, []):
            path = Path(candidate)
            if path.exists():
                return path
    raise FileNotFoundError(
        f"No source image found for {character['character_id']}. Put a file into master/ or reference/ first."
    )


def run_job(job: dict, profile_name: str, use_llm: bool = False) -> dict:
    character = load_character(job["character_id"])
    profiles = load_profiles()
    profile = profiles["profiles"][profile_name]
    prompt_info = build_prompt(job["character_id"], job["state_id"], profile_name, use_llm=use_llm)
    source_image = choose_source_image(character)

    output_stage = profile["stage"]
    output_dir = OUTPUT_ROOT / output_stage / job["character_id"] / job["state_id"]
    version = next_version(output_dir, f"{job['character_id']}_{job['state_id']}_{output_stage}")
    final_name = final_filename(job["character_id"], job["state_id"], output_stage, version)

    metadata = {
        "job_id": job["job_id"],
        "character_id": job["character_id"],
        "state_id": job["state_id"],
        "profile": profile_name,
        "stage": output_stage,
        "version": version,
        "source_image": str(source_image),
        "prompt_info": prompt_info,
        "profile_config": profile,
        "created_at": utc_now(),
    }

    adapter = ComfyAdapter()

    if profile["builder"] == "simple_img2img":
        alias = adapter.ensure_input(source_image, f"{job['character_id']}_{job['state_id']}_{source_image.name}")
        seed = random.randint(1, 2_147_483_647)
        prompt_graph, save_node_id = build_simple_img2img_prompt(
            checkpoint=str(profile.get("checkpoint", "sd_xl_base_1.0.safetensors")),
            positive_prompt=prompt_info["positive_prompt"],
            negative_prompt=prompt_info["negative_prompt"],
            seed=seed,
            width=int(profile["width"]),
            height=int(profile["height"]),
            steps=int(profile["steps"]),
            cfg_scale=float(profile["cfg_scale"]),
            sampler=str(profile["sampler"]),
            scheduler=str(profile["scheduler"]),
            denoise_strength=float(profile["denoise_strength"]),
            image_alias=alias,
            filename_prefix=f"{job['character_id']}_{job['state_id']}_{output_stage}_tmp",
        )
        prompt_id = adapter.submit(prompt_graph, client_id=job["job_id"])
        history = adapter.wait_history(
            prompt_id,
            timeout_seconds=int(profiles["defaults"]["comfyui"]["timeout_seconds"]),
            poll_interval=int(profiles["defaults"]["comfyui"]["poll_interval_seconds"]),
        )
        saved_files = adapter.download_saved_images(history, save_node_id, output_dir)
        if not saved_files:
            raise RuntimeError(f"No output image returned for {job['job_id']}")
        target_path = output_dir / final_name
        saved_files[0].rename(target_path)
        metadata.update(
            {
                "seed": seed,
                "prompt_id": prompt_id,
                "output_files": [str(target_path)],
                "workflow_status": "completed",
            }
        )
        return metadata

    if profile["builder"] == "control_ipadapter_img2img":
        alias = adapter.ensure_input(source_image, f"{job['character_id']}_{job['state_id']}_{source_image.name}")
        control_image = None
        for candidate in character.get("control_image_paths", []):
            path = Path(candidate)
            if path.exists():
                control_image = path
                break
        reference_image = None
        for candidate in character.get("reference_image_paths", []):
            path = Path(candidate)
            if path.exists():
                reference_image = path
                break
        seed = random.randint(1, 2_147_483_647)
        workflow = load_json(Path(profile["workflow_template"]))
        controlnet = profile.get("controlnet", {})
        ipadapter = profile.get("ipadapter", {})
        control_enabled = bool(controlnet.get("enabled")) and bool(controlnet.get("model_name"))
        ipadapter_enabled = (
            bool(ipadapter.get("enabled"))
            and bool(ipadapter.get("model_name"))
            and bool(ipadapter.get("clip_vision_name"))
            and reference_image is not None
        )
        prompt_graph = patch_workflow_graph(
            workflow,
            {
                "__SOURCE_IMAGE__": alias,
                "__CONTROL_IMAGE__": adapter.ensure_input(control_image, f"{job['character_id']}_{job['state_id']}_{control_image.name}") if control_image else alias,
                "__REFERENCE_IMAGE__": adapter.ensure_input(reference_image, f"{job['character_id']}_{job['state_id']}_{reference_image.name}") if reference_image else alias,
                "__CONTROLNET_MODEL__": str(profile.get("controlnet", {}).get("model_name", "")),
                "__IPADAPTER_MODEL__": str(profile.get("ipadapter", {}).get("model_name", "")),
                "__CLIP_VISION_MODEL__": str(profile.get("ipadapter", {}).get("clip_vision_name", "")),
                "__POSITIVE_PROMPT__": prompt_info["positive_prompt"],
                "__NEGATIVE_PROMPT__": prompt_info["negative_prompt"],
                "__FILENAME_PREFIX__": f"{job['character_id']}_{job['state_id']}_{output_stage}_tmp",
            },
        )
        prompt_graph["1"]["inputs"]["ckpt_name"] = str(profile["checkpoint"])
        prompt_graph["12"]["inputs"]["width"] = int(profile["width"])
        prompt_graph["12"]["inputs"]["height"] = int(profile["height"])
        prompt_graph["5"]["inputs"]["seed"] = seed
        prompt_graph["5"]["inputs"]["steps"] = int(profile["steps"])
        prompt_graph["5"]["inputs"]["cfg"] = float(profile["cfg_scale"])
        prompt_graph["5"]["inputs"]["sampler_name"] = str(profile["sampler"])
        prompt_graph["5"]["inputs"]["scheduler"] = str(profile["scheduler"])
        prompt_graph["5"]["inputs"]["denoise"] = float(profile["denoise_strength"])
        if control_enabled:
            prompt_graph["21"]["inputs"]["control_net_name"] = str(controlnet["model_name"])
            prompt_graph["22"]["inputs"]["strength"] = float(controlnet["strength"])
            prompt_graph["22"]["inputs"]["start_percent"] = float(controlnet["start_percent"])
            prompt_graph["22"]["inputs"]["end_percent"] = float(controlnet["end_percent"])
        else:
            prompt_graph["5"]["inputs"]["positive"] = ["2", 0]
            prompt_graph["5"]["inputs"]["negative"] = ["3", 0]
            for node_id in ("20", "21", "22"):
                prompt_graph.pop(node_id, None)
        if ipadapter_enabled:
            prompt_graph["32"]["inputs"]["ipadapter_file"] = str(ipadapter["model_name"])
            prompt_graph["31"]["inputs"]["clip_name"] = str(ipadapter["clip_vision_name"])
            prompt_graph["33"]["inputs"]["weight"] = float(ipadapter.get("weight", 0.7))
            prompt_graph["5"]["inputs"]["model"] = ["33", 0]
        else:
            prompt_graph["5"]["inputs"]["model"] = ["1", 0]
            for node_id in ("30", "31", "32", "33"):
                prompt_graph.pop(node_id, None)
        prompt_id = adapter.submit(prompt_graph, client_id=job["job_id"])
        history = adapter.wait_history(
            prompt_id,
            timeout_seconds=int(profiles["defaults"]["comfyui"]["timeout_seconds"]),
            poll_interval=int(profiles["defaults"]["comfyui"]["poll_interval_seconds"]),
        )
        saved_files = adapter.download_saved_images(history, "7", output_dir)
        if not saved_files:
            raise RuntimeError(f"No output image returned for {job['job_id']}")
        target_path = output_dir / final_name
        saved_files[0].rename(target_path)
        metadata.update(
            {
                "seed": seed,
                "prompt_id": prompt_id,
                "output_files": [str(target_path)],
                "workflow_status": "completed",
                "extensions": {
                    "controlnet_enabled": control_enabled,
                    "ipadapter_enabled": ipadapter_enabled,
                },
            }
        )
        return metadata

    raise RuntimeError(f"Unsupported builder: {profile['builder']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run queued render jobs against local ComfyUI.")
    parser.add_argument("--profile", default=None, help="Only process jobs for one profile.")
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--use-llm", action="store_true")
    args = parser.parse_args()

    jobs = read_jsonl(QUEUE_ROOT / "jobs.jsonl")
    selected = [job for job in jobs if job.get("status") == "queued" and (not args.profile or job["profile"] == args.profile)]
    selected = selected[: args.limit]

    results = []
    for job in selected:
        try:
            metadata = run_job(job, job["profile"], use_llm=args.use_llm)
            metadata_path = OUTPUT_ROOT / "reports" / f"{job['job_id']}.json"
            dump_json(metadata_path, metadata)
            if metadata.get("workflow_status") == "completed":
                update_queue_record(QUEUE_ROOT / "jobs.jsonl", job["job_id"], {"status": "done", "last_run_at": utc_now()})
                append_jsonl(QUEUE_ROOT / "done.jsonl", {"job_id": job["job_id"], "metadata_path": str(metadata_path), "finished_at": utc_now()})
                results.append({"job_id": job["job_id"], "ok": True, "metadata_path": str(metadata_path)})
            else:
                update_queue_record(
                    QUEUE_ROOT / "jobs.jsonl",
                    job["job_id"],
                    {"status": "blocked", "last_run_at": utc_now(), "last_error": metadata.get("workflow_status")},
                )
                append_jsonl(
                    QUEUE_ROOT / "failed.jsonl",
                    {"job_id": job["job_id"], "error": metadata.get("workflow_status"), "metadata_path": str(metadata_path), "failed_at": utc_now()},
                )
                results.append({"job_id": job["job_id"], "ok": False, "blocked": True, "metadata_path": str(metadata_path)})
        except Exception as exc:  # noqa: BLE001
            error_payload = {"job_id": job["job_id"], "error": str(exc), "failed_at": utc_now()}
            append_jsonl(QUEUE_ROOT / "failed.jsonl", error_payload)
            update_queue_record(
                QUEUE_ROOT / "jobs.jsonl",
                job["job_id"],
                {"status": "failed", "retry_count": int(job.get("retry_count", 0)) + 1, "last_error": str(exc)},
            )
            results.append({"job_id": job["job_id"], "ok": False, "error": str(exc)})
    log_path = write_log("run-render", {"results": results})
    print(json.dumps({"ok": True, "results": results, "log_path": str(log_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
