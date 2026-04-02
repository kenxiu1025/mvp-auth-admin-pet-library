# Pet Pipeline Overview

`pet_pipeline/` is a local-only asset production module that lives beside the existing Next.js app. It is designed so daily batch generation can run through OpenClaw + Ollama/Qwen3 + ComfyUI, while Codex only needs to help when you want to extend or repair the system.

## Design goals

- Keep product code untouched unless importing final assets.
- Store all generation logic, config, queue, and reports in one place.
- Make the pipeline re-runnable, resumable, and file-based.
- Prioritize character consistency over expression intensity.
- Support three layers:
  - Layer 1: queue-driven preview and baseline render
  - Layer 2: formal production with ControlNet, IP-Adapter, face inpaint, and review staging
  - Layer 3: LoRA dataset preparation, training templates, and LoRA inference entrypoints

## Runtime assumptions

- macOS Apple Silicon
- Local ComfyUI or equivalent SD API
- Optional local Ollama model for prompt expansion
- No cloud GPU required

## Key directories

- `config/`: character, state, render profile, and LoRA templates
- `prompts/`: prompt text templates
- `queue/`: append-only job ledgers
- `assets/`: master/reference/mask/control inputs and training datasets
- `output/`: raw AI outputs, review stage, final exports, reports
- `workflows/`: workflow metadata templates for preview, production, inpaint, and LoRA inference
- `scripts/`: Python entrypoints and shared helpers
- `docs/`: human-facing operating manuals

## Daily operating loop

1. Add or enqueue jobs.
2. Build prompt text from config and templates.
3. Run preview or production render.
4. Run face inpaint for expression states.
5. Review outputs and move them into `review` or `final`.
6. Export a manifest for the web app or asset manager.

## What runs today vs what needs your local models

Directly runnable after installing dependencies and pointing to ComfyUI:

- `enqueue_jobs.py`
- `build_prompt.py`
- `run_render.py` with `preview` profile
- `review_outputs.py`
- `export_manifest.py`
- `prepare_lora_dataset.py`
- `generate_captions.py`
- `train_lora_stub.py`

Requires your local masks / models / node packs:

- `run_inpaint.py`
- `run_render.py` with `production` profile using ControlNet + IP-Adapter
- `run_lora_inference.py`

