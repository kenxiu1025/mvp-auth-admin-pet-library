#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import CONFIG_ROOT, PIPELINE_ROOT, dump_json, list_character_ids, load_yaml, utc_now


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate LoRA training instructions and command templates.")
    parser.add_argument("--character", action="append", dest="characters")
    args = parser.parse_args()

    characters = args.characters or list_character_ids()
    results = []
    for character_id in characters:
        template_path = CONFIG_ROOT / "lora" / f"{character_id}_lora.template.yaml"
        config = load_yaml(template_path)
        command = (
            "accelerate launch train_network.py "
            f"--pretrained_model_name_or_path=\"{config['base_model']}\" "
            f"--train_data_dir=\"{config['dataset']['image_dir']}\" "
            f"--output_dir=\"pet_pipeline/output/reports/lora/{character_id}\" "
            f"--network_dim={config['network']['rank']} "
            f"--network_alpha={config['network']['alpha']} "
            f"--resolution=\"{config['training']['resolution']}\" "
            f"--train_batch_size={config['training']['batch_size']} "
            f"--max_train_epochs={config['training']['epochs']}"
        )
        result = {
            "character_id": character_id,
            "template_path": str(template_path),
            "command_template": command,
            "manual_todos": config.get("notes", []),
            "dependency_notes": [
                "Install your preferred SDXL LoRA trainer, for example kohya_ss or a locally wrapped equivalent.",
                "Confirm accelerator, bitsandbytes, and torch versions for Apple Silicon compatibility.",
            ],
        }
        results.append(result)
    output_path = PIPELINE_ROOT / "output" / "reports" / "lora_training_stub.json"
    dump_json(output_path, {"generated_at": utc_now(), "results": results})
    print(json.dumps({"ok": True, "output_path": str(output_path), "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

