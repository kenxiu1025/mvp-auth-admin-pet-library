from __future__ import annotations

import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from common import load_json, resolve_env


class ComfyAdapter:
    def __init__(self, base_url: str | None = None, input_dir: str | None = None):
        self.base_url = (base_url or resolve_env("COMFYUI_BASE_URL", "http://127.0.0.1:8189") or "").rstrip("/")
        self.input_dir = Path(
            input_dir
            or resolve_env("COMFYUI_INPUT_DIR", str(Path.home() / "clawd/projects/ComfyUI/input"))
            or "."
        )

    def _request_json(self, method: str, path: str, body: dict[str, Any] | None = None, timeout: int = 120):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers={"Content-Type": "application/json"},
            method=method,
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))

    def _request_bytes(self, path: str, timeout: int = 120) -> bytes:
        req = urllib.request.Request(f"{self.base_url}{path}", method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read()

    def healthcheck(self) -> dict[str, Any]:
        return self._request_json("GET", "/system_stats", None, timeout=30)

    def ensure_input(self, source: Path, alias: str) -> str:
        self.input_dir.mkdir(parents=True, exist_ok=True)
        target = self.input_dir / alias
        if not target.exists():
            shutil.copy2(source, target)
        return alias

    def submit(self, prompt: dict[str, Any], client_id: str) -> str:
        response = self._request_json("POST", "/prompt", {"prompt": prompt, "client_id": client_id}, timeout=30)
        prompt_id = response.get("prompt_id")
        if not prompt_id:
            raise RuntimeError(f"ComfyUI did not return prompt_id: {response}")
        return prompt_id

    def wait_history(self, prompt_id: str, timeout_seconds: int = 1800, poll_interval: int = 2) -> dict[str, Any]:
        started = time.time()
        while time.time() - started < timeout_seconds:
            history = self._request_json("GET", f"/history/{prompt_id}", None, timeout=30)
            if history and prompt_id in history:
                return history[prompt_id]
            time.sleep(poll_interval)
        raise RuntimeError(f"Timed out waiting for prompt {prompt_id}")

    def download_saved_images(self, history_entry: dict[str, Any], save_node_id: str, output_dir: Path) -> list[Path]:
        output_dir.mkdir(parents=True, exist_ok=True)
        images = history_entry.get("outputs", {}).get(save_node_id, {}).get("images", [])
        saved: list[Path] = []
        for image in images:
            query = urllib.parse.urlencode(
                {
                    "filename": image["filename"],
                    "subfolder": image.get("subfolder", ""),
                    "type": image.get("type", "output"),
                }
            )
            data = self._request_bytes(f"/view?{query}")
            destination = output_dir / image["filename"]
            destination.write_bytes(data)
            saved.append(destination)
        return saved


def build_simple_img2img_prompt(
    *,
    checkpoint: str,
    positive_prompt: str,
    negative_prompt: str,
    seed: int,
    width: int,
    height: int,
    steps: int,
    cfg_scale: float,
    sampler: str,
    scheduler: str,
    denoise_strength: float,
    image_alias: str,
    filename_prefix: str,
) -> tuple[dict[str, Any], str]:
    save_node_id = "7"
    prompt = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "10": {"class_type": "LoadImage", "inputs": {"image": image_alias}},
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
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": positive_prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negative_prompt, "clip": ["1", 1]}},
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg_scale,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": denoise_strength,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["11", 0],
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        save_node_id: {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix}},
    }
    return prompt, save_node_id


def build_template_stub(template_path: Path, metadata: dict[str, Any]) -> dict[str, Any]:
    template = load_json(template_path)
    return {
        "template": template,
        "metadata": metadata,
        "status": "blocked_until_configured",
    }


def patch_workflow_graph(workflow: dict[str, Any], replacements: dict[str, Any]) -> dict[str, Any]:
    patched = json.loads(json.dumps(workflow))
    for node_id, node in patched.items():
        inputs = node.get("inputs", {})
        for key, value in list(inputs.items()):
            if isinstance(value, str) and value in replacements:
                inputs[key] = replacements[value]
    return patched
