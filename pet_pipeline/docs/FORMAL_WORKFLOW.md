# Formal Workflow

This document describes the production-grade path used after preview tuning is complete.

## Stage split

1. `output/raw/`
   - First-pass AI outputs from preview or production body render.
2. `output/review/`
   - Inpainted or manually adjusted candidates waiting for approval.
3. `output/final/`
   - Accepted transparent PNG assets ready for the product.

## Formal production stack

### 1. ControlNet

Purpose:

- lock head-to-body ratio
- stabilize ears, sitting pose, and tail outline

Inputs expected:

- character control image under `assets/characters/<character>/control/`
- configured `controlnet.model_name`
- configurable `strength`, `start_percent`, and `end_percent`

### 2. IP-Adapter

Purpose:

- preserve the white cat and tabby cat identities
- stabilize eyes, face shape, and overall visual signature

Inputs expected:

- character reference image under `assets/characters/<character>/reference/`
- `ipadapter.model_name`
- `ipadapter.clip_vision_name`
- configurable `weight`

### 3. Face inpaint

Purpose:

- modify expression only
- avoid redrawing the body, fur, and tail

Inputs expected:

- source image from `output/raw/`
- face/eyes/mouth mask from `assets/characters/<character>/masks/`
- state-specific prompt text

## Recommended order

1. Run `production` body render.
2. Pick the best structural candidate.
3. Run `inpaint` with the chosen mask.
4. Move strong candidates into `output/review/`.
5. Manually fix transparency or tiny anatomy drift if needed.
6. Promote approved assets into `output/final/`.

## What you must configure manually

- exact checkpoint file names
- ControlNet model file
- IP-Adapter model file
- CLIP Vision model file
- inpaint model file if your workflow uses a separate inpaint checkpoint
- masks and reference/control images per character

