# Pet Pipeline Skill

## When To Trigger

Use this skill when working inside `/Users/264271999qq.com/Documents/New project` and you need to operate the local `pet_pipeline` workflow without changing Layer 2 internals.

Trigger this skill for these recurring tasks:

- verify pipeline ready
- run `white_cat` batch
- run inpaint only
- generate a latest output report / summarize outputs
- run single-image local VL QC

## What This Skill Is Allowed To Do

This skill is only for orchestration and reporting.

Allowed commands:

```bash
./pet_pipeline/scripts/verify_pipeline_ready.sh
./pet_pipeline/scripts/run_white_cat_batch.sh
./pet_pipeline/scripts/run_white_cat_batch.sh --inpaint-only
./pet_pipeline/scripts/report_latest_outputs.sh
./pet_pipeline/scripts/run_daily_batch.sh
python3 pet_pipeline/scripts/qc_single_image.py --image <path> --character <character> --state <state>
```

## Standard Execution Order

### 1. Verify first

Always run:

```bash
./pet_pipeline/scripts/verify_pipeline_ready.sh
```

If verification fails:

- stop immediately
- report the exact failing command output
- do not auto-reconfigure ComfyUI
- do not auto-download models
- do not auto-edit workflow JSON

### 2. Run batch

For normal daily generation:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh
```

### 3. Run inpaint only

When raw production images already exist and only face-expression refinement is needed:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh --inpaint-only
```

### 4. Generate report / summarize outputs

Use:

```bash
./pet_pipeline/scripts/report_latest_outputs.sh
```

For an end-to-end daily run with report:

```bash
./pet_pipeline/scripts/run_daily_batch.sh
```

### 5. Run single-image local VL QC

Use:

```bash
python3 pet_pipeline/scripts/qc_single_image.py --image <path> --character <character> --state <state>
```

Return only the JSON result.
Do not add extra explanation around the JSON.

## Failure Handling

- If `verify_pipeline_ready.sh` fails, stop and report failure.
- If `run_white_cat_batch.sh` fails during production or inpaint, stop and report the exact failing step.
- If `report_latest_outputs.sh` finds no files, report missing output paths rather than inventing results.
- If `qc_single_image.py` fails JSON validation, stop and report the raw command failure.
- Do not silently skip failed states.

## Files And Environments This Skill Must Not Auto-Modify

Do not auto-modify:

- `pet_pipeline/config/render_profiles.yaml`
- `pet_pipeline/workflows/comfyui/production/control_ipadapter.template.json`
- `pet_pipeline/workflows/comfyui/inpaint/face_inpaint.template.json`
- any file under `/Users/264271999qq.com/clawd/projects/ComfyUI/models/`
- any file under `/Users/264271999qq.com/clawd/projects/ComfyUI/custom_nodes/`

Do not auto-reconfigure:

- ComfyUI model installation
- ControlNet / IP-Adapter model selection
- CLIP Vision model selection
- checkpoint changes
- custom node installation
- ComfyUI base URL
- Ollama model selection
- Ollama base URL

Do not auto-do:

- code changes
- config changes
- image regeneration
- LoRA training

## Expected Operator Behavior

- keep the existing local environment as-is
- treat `verify` as the gate before daily runs
- use the fixed entry scripts instead of ad-hoc command chains
- summarize output paths and metadata files after each run
- for local VL QC, call the fixed Python command and return only its JSON output
