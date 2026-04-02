# Local Environment Snapshot

Last updated: 2026-04-01

## ComfyUI Endpoint

- `COMFYUI_BASE_URL=http://127.0.0.1:8189`

## Available Checkpoints

- `animagine-xl-3.1.safetensors`
- `sd_xl_base_1.0.safetensors`

## Available ControlNet Models

- `xinsir-controlnet-openpose-sdxl-1.0.safetensors`

## Available IP-Adapter Models

- `ip-adapter-plus_sdxl_vit-h.safetensors`

## Available CLIP Vision Models

- `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`

## Installed Related Custom Nodes

- `ComfyUI_IPAdapter_plus`
- `websocket_image_save.py`

## Current Production Profile

- `checkpoint: animagine-xl-3.1.safetensors`
- `controlnet.enabled: true`
- `controlnet.model_name: xinsir-controlnet-openpose-sdxl-1.0.safetensors`
- `controlnet.strength: 0.72`
- `controlnet.start_percent: 0.0`
- `controlnet.end_percent: 0.85`
- `ipadapter.enabled: true`
- `ipadapter.model_name: ip-adapter-plus_sdxl_vit-h.safetensors`
- `ipadapter.clip_vision_name: CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`
- `ipadapter.weight: 0.7`

## Current Inpaint Profile

- `checkpoint: animagine-xl-3.1.safetensors`
- `inpaint.inpaint_model_name: animagine-xl-3.1.safetensors`

## Commands Verified Successfully

- `python3 pet_pipeline/scripts/inspect_comfyui.py`
- `python3 pet_pipeline/scripts/run_render.py --profile production --limit 1`
- `python3 pet_pipeline/scripts/run_inpaint.py --character white_cat --state happy`
- `python3 pet_pipeline/scripts/run_inpaint.py --character white_cat --state hungry`
- `python3 pet_pipeline/scripts/run_inpaint.py --character white_cat --state angry`

## Latest Verified Metadata

- Inspect report:
  - `pet_pipeline/output/reports/local_readiness_report.json`
- Production metadata:
  - `pet_pipeline/output/reports/white_cat_happy_production_0010.json`
- Production output:
  - `pet_pipeline/output/raw/white_cat/happy/white_cat_happy_raw_v6.png`

