#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8189"
COMFY_INPUT_DIR = Path("/Users/264271999qq.com/clawd/projects/ComfyUI/input")
DEFAULT_OUTPUT_ROOT = Path("data/generated-assets")


def http_json(method: str, path: str, body: dict | None = None, timeout: int = 120):
    url = BASE_URL + path
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def http_get_bytes(path: str, timeout: int = 120) -> bytes:
    url = BASE_URL + path
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def ensure_base_image_available(base_image_path: Path, asset_key: str, state: str) -> str:
    COMFY_INPUT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = base_image_path.suffix or ".png"
    target_name = f"pet_{asset_key}_{state}_base{suffix}"
    target_path = COMFY_INPUT_DIR / target_name

    if not target_path.exists():
        shutil.copy2(base_image_path, target_path)

    return target_name


def build_prompt_graph(job: dict, input_name: str, checkpoint: str, seed: int, filename_prefix: str):
    width = int(job["sdDefaults"]["width"])
    height = int(job["sdDefaults"]["height"])

    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "10": {"class_type": "LoadImage", "inputs": {"image": input_name}},
        "12": {
            "class_type": "ImageScale",
            "inputs": {
                "image": ["10", 0],
                "width": width,
                "height": height,
                "upscale_method": "lanczos",
                "crop": "center",
            },
        },
        "11": {"class_type": "VAEEncode", "inputs": {"pixels": ["12", 0], "vae": ["1", 2]}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": job["prompt"], "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": job["negativePrompt"], "clip": ["1", 1]}},
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": int(job["sdDefaults"]["steps"]),
                "cfg": float(job["sdDefaults"]["cfgScale"]),
                "sampler_name": str(job["sdDefaults"]["sampler"]).replace("DPM++ 2M Karras", "dpmpp_2m"),
                "scheduler": "karras",
                "denoise": float(job["sdDefaults"]["denoiseStrength"]),
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["11", 0],
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix}},
    }


def wait_for_history(prompt_id: str, timeout_seconds: int = 1800):
    started = time.time()
    while time.time() - started < timeout_seconds:
        history = http_json("GET", f"/history/{prompt_id}", None, timeout=30)
        if history and prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
    raise RuntimeError(f"Timed out waiting for prompt_id={prompt_id}")


def download_images(history_entry: dict, output_dir: Path) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    images = history_entry.get("outputs", {}).get("7", {}).get("images", [])

    if not images:
        raise RuntimeError("No images returned from ComfyUI save node 7")

    saved_files: list[str] = []

    for image in images:
        filename = image["filename"]
        subfolder = image.get("subfolder", "")
        image_type = image.get("type", "output")
        query = urllib.parse.urlencode(
            {"filename": filename, "subfolder": subfolder, "type": image_type}
        )
        data = http_get_bytes(f"/view?{query}")
        destination = output_dir / filename
        destination.write_bytes(data)
        saved_files.append(str(destination))

    return saved_files


def main():
    parser = argparse.ArgumentParser(description="Run one pet asset img2img job through local ComfyUI.")
    parser.add_argument("--job", required=True, help="Path to one exported SD job JSON file.")
    parser.add_argument("--checkpoint", default="sd_xl_base_1.0.safetensors")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    args = parser.parse_args()

    job_path = Path(args.job).resolve()
    if not job_path.exists():
        raise FileNotFoundError(f"Job file not found: {job_path}")

    job = json.loads(job_path.read_text(encoding="utf-8"))
    base_image_path = Path(job["baseImage"])
    if not base_image_path.exists():
        raise FileNotFoundError(f"Base image not found: {base_image_path}")

    input_name = ensure_base_image_available(base_image_path, job["assetKey"], job["state"])
    output_root = Path(args.output_root)
    run_root = output_root / job["assetKey"] / job["state"]
    run_root.mkdir(parents=True, exist_ok=True)

    results = []
    base_seed = args.seed if args.seed is not None else int(time.time())

    for index in range(args.count):
        seed = base_seed + index
        filename_prefix = f"pet_{job['assetKey']}_{job['state']}_{seed}"
        prompt_graph = build_prompt_graph(job, input_name, args.checkpoint, seed, filename_prefix)
        client_id = f"pet_asset_{job['assetKey']}_{job['state']}_{seed}"
        response = http_json("POST", "/prompt", {"prompt": prompt_graph, "client_id": client_id}, timeout=30)
        prompt_id = response.get("prompt_id")

        if not prompt_id:
            raise RuntimeError(f"No prompt_id returned: {response}")

        history_entry = wait_for_history(prompt_id)
        saved_files = download_images(history_entry, run_root)
        result = {
            "assetKey": job["assetKey"],
            "state": job["state"],
            "seed": seed,
            "promptId": prompt_id,
            "checkpoint": args.checkpoint,
            "jobPath": str(job_path),
            "outputFiles": saved_files,
            "targetOutputPath": job["outputPath"],
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        results.append(result)

        result_path = run_root / f"{job['assetKey']}-{job['state']}-{seed}.json"
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({"ok": True, "count": len(results), "results": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
