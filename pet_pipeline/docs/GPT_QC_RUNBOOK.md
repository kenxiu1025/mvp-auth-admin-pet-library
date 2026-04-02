# GPT QC Runbook

## Required Environment Variables

- `OPENAI_API_KEY`
- optional: `OPENAI_BASE_URL`
- optional: `OPENAI_QC_MODEL`

Default model if unset:

- `gpt-4o-mini`

## Manual Single-Image QC

```bash
python3 pet_pipeline/scripts/qc_single_image.py \
  --image pet_pipeline/output/raw/white_cat/happy/white_cat_happy_raw_v6.png \
  --character white_cat \
  --state happy
```

This command:

- loads character config
- loads state config
- builds the local QC prompt
- sends the local image to GPT
- validates that the model output is valid JSON
- prints only the final JSON to stdout
- saves a copy to `pet_pipeline/output/reports/qc_<character>_<state>.json`

## OpenClaw Skill Usage

Use the workspace skill at:

- `skills/pet_pipeline/SKILL.md`

For single-image QC, the skill should only call:

```bash
python3 pet_pipeline/scripts/qc_single_image.py --image <path> --character <character> --state <state>
```

The skill should return only the JSON result.

## If JSON Validation Fails

- treat the run as failed
- do not hand-edit the model output
- re-run the same command once
- if it still fails, inspect:
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_QC_MODEL`
  - image path correctness

