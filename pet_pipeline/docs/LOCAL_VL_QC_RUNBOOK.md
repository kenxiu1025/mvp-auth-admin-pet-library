# Local VL QC Runbook

## Environment Variables

Required or commonly used variables for local visual QC:

- `OLLAMA_BASE_URL`
  - optional
  - default: `http://127.0.0.1:11434`
- `OLLAMA_QC_MODEL`
  - optional
  - default: `qwen3-vl:4b`

Example:

```bash
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_QC_MODEL=qwen3-vl:4b
```

## Manual Single Image QC

```bash
python3 pet_pipeline/scripts/qc_single_image.py \
  --image pet_pipeline/output/raw/white_cat/happy/white_cat_happy_raw_v6.png \
  --character white_cat \
  --state happy
```

Behavior:

- reads character config from `pet_pipeline/config/characters/*.yaml`
- reads state config from `pet_pipeline/config/states.yaml`
- sends the local image to Ollama with the fixed QC prompt
- validates that the model output is legal JSON
- prints only JSON to stdout
- saves a report to `pet_pipeline/output/reports/qc_<character>_<state>.json` by default

## OpenClaw Skill Usage

Inside this workspace, the skill should only call:

```bash
python3 pet_pipeline/scripts/qc_single_image.py --image <path> --character <character> --state <state>
```

The skill should:

- return only the JSON result
- not explain the JSON
- not modify code
- not modify config
- not regenerate images
- not train LoRA

## If JSON Validation Fails

If the command exits with a JSON validation error:

1. check that Ollama is running
2. check that `qwen3-vl:4b` is installed locally
3. rerun the same command once
4. if it still fails, inspect the terminal error and adjust the prompt or model outside the skill flow
