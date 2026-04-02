# OpenClaw Skill Runbook

## Workspace Skill Location

- `skills/pet_pipeline/SKILL.md`

## How To Use In This Workspace

Inside this workspace, invoke the pet pipeline skill whenever you need local orchestration for:

- pipeline verification
- `white_cat` batch generation
- inpaint-only reruns
- latest output summary

The skill should call the fixed entry scripts instead of editing local pipeline internals.

## Daily Operations

### Verify Only

Run only:

```bash
./pet_pipeline/scripts/verify_pipeline_ready.sh
```

Use this when:

- ComfyUI was restarted
- you only want to confirm readiness
- you changed nothing except service state

### Batch Run

Run:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh
```

Use this when:

- you want new `white_cat` production outputs
- you want `happy / hungry / angry` raw and review assets together

### Inpaint Only

Run:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh --inpaint-only
```

Use this when:

- raw outputs already exist
- you only want new review-stage face refinements

### Report Only

Run:

```bash
./pet_pipeline/scripts/report_latest_outputs.sh
```

Use this when:

- you want the latest raw/review paths
- you want the latest metadata summary
- no new generation is needed

## Night Batch Suggested Order

1. verify
2. batch
3. report

Command:

```bash
./pet_pipeline/scripts/run_daily_batch.sh
```

## When To Reconfigure vs Re-Verify

### Only Re-Verify

- ComfyUI was restarted
- you want to confirm the local service is healthy
- you want to sanity-check current readiness before a run

### Reconfigure Is Not A Skill Responsibility

The OpenClaw skill must not auto-reconfigure:

- model files
- custom nodes
- Layer 2 workflow JSON
- render profile model selection

If those parts drift, stop and hand off for manual repair instead of self-modifying.

