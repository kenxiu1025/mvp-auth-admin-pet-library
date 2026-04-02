#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

from common import CONFIG_ROOT, PIPELINE_ROOT, dump_json, load_character, load_profiles, resolve_env, utc_now


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def list_model_files(directory: Path) -> list[str]:
    if not directory.exists():
        return []
    return sorted(path.name for path in directory.glob("*") if path.is_file())


def check_file(path: Path) -> dict:
    return {"path": str(path), "exists": path.exists()}


def main() -> None:
    profiles = load_profiles()
    comfy_url = resolve_env("COMFYUI_BASE_URL", "http://127.0.0.1:8189")
    report = {
        "generated_at": utc_now(),
        "comfyui_base_url": comfy_url,
        "comfyui_available": False,
        "available_models": {},
        "available_nodes": [],
        "workflow_templates": {},
        "profiles": {},
        "characters": {},
        "missing": [],
        "warnings": [],
        "ready_for_controlnet": False,
        "ready_for_ipadapter": False,
        "ready_for_production": False,
    }

    object_info = {}
    try:
        fetch_json(f"{comfy_url}/system_stats")
        object_info = fetch_json(f"{comfy_url}/object_info")
        report["comfyui_available"] = True
        report["available_nodes"] = sorted(
            name for name in object_info.keys() if any(key in name.lower() for key in ("controlnet", "clipvision", "inpaint", "ipadapter"))
        )
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        report["missing"].append(f"ComfyUI unreachable: {exc}")

    models_root = Path.home() / "clawd/projects/ComfyUI/models"
    report["available_models"] = {
        "checkpoints": list_model_files(models_root / "checkpoints"),
        "controlnet": list_model_files(models_root / "controlnet"),
        "clip_vision": list_model_files(models_root / "clip_vision"),
        "ipadapter": list_model_files(models_root / "ipadapter"),
    }

    for name in ("preview", "production", "inpaint"):
        template = Path(profiles["profiles"][name]["workflow_template"])
        report["workflow_templates"][name] = check_file(template)
        if not template.exists():
            report["missing"].append(f"Missing workflow template: {template}")

    comfy_nodes = profiles["defaults"]["comfyui"]["nodes"]
    required_nodes = {
        "production": [
            comfy_nodes["checkpoint_loader"],
            comfy_nodes["clip_text_encode"],
            comfy_nodes["image_loader"],
            comfy_nodes["image_scale"],
            comfy_nodes["vae_encode"],
            comfy_nodes["sampler"],
            comfy_nodes["vae_decode"],
            comfy_nodes["save_image"],
        ],
        "inpaint": [
            comfy_nodes["checkpoint_loader"],
            comfy_nodes["image_loader"],
            comfy_nodes["image_mask_loader"],
            comfy_nodes["inpaint_conditioning"],
            comfy_nodes["sampler"],
            comfy_nodes["vae_decode"],
            comfy_nodes["save_image"],
        ],
    }

    for name in ("production", "inpaint"):
        profile = profiles["profiles"][name]
        status = {
            "checkpoint": profile.get("checkpoint", ""),
            "checkpoint_configured": bool(profile.get("checkpoint")),
            "required_nodes": [],
            "optional_modules": {},
        }
        if not profile.get("checkpoint"):
            report["missing"].append(f"{name} checkpoint not configured")
        for node_name in required_nodes[name]:
            exists = bool(object_info) and node_name in object_info
            status["required_nodes"].append({"name": node_name, "available": exists})
            if object_info and not exists:
                report["missing"].append(f"{name} required node missing: {node_name}")

        if name == "production":
            control = profile.get("controlnet", {})
            ipadapter = profile.get("ipadapter", {})
            status["optional_modules"]["controlnet"] = {
                "enabled": bool(control.get("enabled")),
                "model_name": control.get("model_name", ""),
                "node_available": bool(object_info) and comfy_nodes["controlnet_loader"] in object_info and comfy_nodes["controlnet_apply"] in object_info,
                "model_available": bool(control.get("model_name")) and control.get("model_name") in report["available_models"]["controlnet"],
            }
            status["optional_modules"]["ipadapter"] = {
                "enabled": bool(ipadapter.get("enabled")),
                "model_name": ipadapter.get("model_name", ""),
                "clip_vision_name": ipadapter.get("clip_vision_name", ""),
                "node_available": any("ipadapter" in node.lower() for node in report["available_nodes"]),
                "model_available": bool(ipadapter.get("model_name")) and ipadapter.get("model_name") in report["available_models"]["ipadapter"],
                "clip_vision_model_available": bool(ipadapter.get("clip_vision_name")) and ipadapter.get("clip_vision_name") in report["available_models"]["clip_vision"],
            }
            if not status["optional_modules"]["controlnet"]["model_available"]:
                report["missing"].append("production controlnet model is missing on this machine")
            if not status["optional_modules"]["ipadapter"]["node_available"]:
                report["missing"].append("production ipadapter custom node is missing on this machine")
            if not status["optional_modules"]["ipadapter"]["model_available"]:
                report["missing"].append("production ipadapter model is missing on this machine")
            if not status["optional_modules"]["ipadapter"]["clip_vision_model_available"]:
                report["missing"].append("production clip_vision model is not installed on this machine")
            if status["optional_modules"]["controlnet"]["enabled"] and not status["optional_modules"]["controlnet"]["model_name"]:
                report["missing"].append("production controlnet enabled but model_name is empty")
            if status["optional_modules"]["ipadapter"]["enabled"]:
                report["warnings"].append("IP-Adapter is enabled in config but matching node was not detected in current ComfyUI object_info")
        else:
            inpaint_model = profile.get("inpaint", {}).get("inpaint_model_name", "")
            status["inpaint_model_name"] = inpaint_model
            if not inpaint_model:
                report["missing"].append("inpaint model is not configured")

        report["profiles"][name] = status

    for character_id in ("white_cat", "tabby_cat"):
        character = load_character(character_id)
        face = Path(character["preferred_masks"]["face"])
        eyes = Path(character["preferred_masks"]["eyes"])
        mouth = Path(character["preferred_masks"]["mouth"])
        refs = [Path(item) for item in character.get("reference_image_paths", [])]
        ctrls = [Path(item) for item in character.get("control_image_paths", [])]
        report["characters"][character_id] = {
            "face_mask": check_file(face),
            "eyes_mask": check_file(eyes),
            "mouth_mask": check_file(mouth),
            "reference_images": [check_file(item) for item in refs],
            "control_images": [check_file(item) for item in ctrls],
        }
        if not face.exists():
            report["missing"].append(f"{character_id} face mask missing: {face}")
        if not any(path.exists() for path in refs):
            report["missing"].append(f"{character_id} reference image missing")
        if not any(path.exists() for path in ctrls):
            report["warnings"].append(f"{character_id} control image missing")

    production_modules = report["profiles"]["production"]["optional_modules"]
    report["ready_for_controlnet"] = report["comfyui_available"] and production_modules["controlnet"]["node_available"] and production_modules["controlnet"]["model_available"]
    report["ready_for_ipadapter"] = report["comfyui_available"] and production_modules["ipadapter"]["node_available"] and production_modules["ipadapter"]["model_available"] and production_modules["ipadapter"]["clip_vision_model_available"]
    report["ready_for_production"] = report["ready_for_controlnet"] and report["ready_for_ipadapter"]
    output_path = PIPELINE_ROOT / "output" / "reports" / "local_readiness_report.json"
    dump_json(output_path, report)
    print(json.dumps({"ok": True, "report_path": str(output_path), "ready_for_production": report["ready_for_production"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
