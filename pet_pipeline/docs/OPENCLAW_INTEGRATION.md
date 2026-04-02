# OpenClaw Integration

This pipeline is intentionally file-based so OpenClaw can own the daily loop.

## What OpenClaw should do

Recommended task entrypoints:

- enqueue jobs
- build prompt packs
- run preview render
- run production render
- run face inpaint
- review outputs
- export manifest

## Suggested command mapping

- `python3 pet_pipeline/scripts/enqueue_jobs.py --character white_cat --states happy angry --profile preview --variants 2`
- `python3 pet_pipeline/scripts/run_render.py --profile preview --limit 2`
- `python3 pet_pipeline/scripts/run_inpaint.py --character white_cat --state happy --limit 1`
- `python3 pet_pipeline/scripts/review_outputs.py`
- `python3 pet_pipeline/scripts/export_manifest.py`

## How Codex leaves the daily loop

Codex is not required once this module is in place. Daily operation should be:

1. OpenClaw schedules and launches scripts.
2. Ollama/Qwen3 expands prompts if enabled.
3. ComfyUI performs rendering.
4. Humans review only the staged outputs.

Codex should only come back in when you need:

- new pipeline features
- config redesign
- bug fixing
- new workflow adapters

## Nightly unattended flow

1. Read `queue/jobs.jsonl`.
2. Build prompts using config and optional local LLM.
3. Run `preview` or `production`.
4. Run `inpaint` on eligible raw outputs.
5. Call `review_outputs.py`.
6. Retry failures up to the configured count.
7. Emit a report and manifest into `output/reports/`.

