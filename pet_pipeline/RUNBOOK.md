# Pet Pipeline Runbook

## Reuse This Machine

This machine is already configured for:

- ComfyUI on `http://127.0.0.1:8189`
- `animagine-xl-3.1.safetensors`
- `xinsir-controlnet-openpose-sdxl-1.0.safetensors`
- `ip-adapter-plus_sdxl_vit-h.safetensors`
- `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`
- `ComfyUI_IPAdapter_plus`

## Standard Recheck

Use this when:

- ComfyUI was restarted
- model files were moved
- `render_profiles.yaml` was changed
- custom nodes were updated

Command:

```bash
./pet_pipeline/scripts/verify_pipeline_ready.sh
```

## Standard White Cat Batch

Use this when:

- you want a fresh `white_cat` production batch
- you want `happy / hungry / angry` raw + review outputs

Command:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh
```

## Inpaint Only

Use this when:

- raw outputs already exist
- you only want to re-run face expression refinement

Command:

```bash
./pet_pipeline/scripts/run_white_cat_batch.sh --inpaint-only
```

## Report Only

Use this when:

- you only need the latest raw/review paths
- you want the latest metadata summary
- you do not want to generate new images

Command:

```bash
./pet_pipeline/scripts/report_latest_outputs.sh
```

## Daily Run

Use this when:

- you want verify + batch + summary in one pass

Command:

```bash
./pet_pipeline/scripts/run_daily_batch.sh
```

## Reconfigure Only When

- ComfyUI base URL changes
- checkpoint name changes
- ControlNet model file changes
- IP-Adapter model file changes
- CLIP Vision file changes
- reference images / masks move to different paths

## Re-verify Only When

- ComfyUI was restarted
- you updated ComfyUI or custom nodes
- a production run fails unexpectedly
- `inspect_comfyui.py` output no longer reports `ready_for_production: true`
