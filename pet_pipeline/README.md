# Pet Pipeline

This is the local unattended asset pipeline for the pet-task project.

> For the full asset production specification (character definitions, state classification, naming conventions, acceptance criteria), see [docs/asset-pipeline-spec.md](../docs/asset-pipeline-spec.md).

## Quick start

1. Install Python deps:

```bash
python3 -m venv .venv-pet-pipeline
source .venv-pet-pipeline/bin/activate
pip install -r pet_pipeline/requirements.txt
```

2. Copy environment:

```bash
cp .env.example .env.local
```

3. Put character source files into:

- `pet_pipeline/assets/characters/white_cat/master/`
- `pet_pipeline/assets/characters/white_cat/reference/`
- `pet_pipeline/assets/characters/white_cat/control/`
- `pet_pipeline/assets/characters/white_cat/masks/`
- `pet_pipeline/assets/characters/tabby_cat/master/`
- `pet_pipeline/assets/characters/tabby_cat/reference/`
- `pet_pipeline/assets/characters/tabby_cat/control/`
- `pet_pipeline/assets/characters/tabby_cat/masks/`

4. Enqueue jobs:

```bash
make pet-preview-jobs
```

5. Run preview render:

```bash
make pet-render-preview
```

6. Review outputs and export manifest:

```bash
make pet-review
make pet-manifest
```

## Documents

- `docs/PIPELINE_OVERVIEW.md`
- `docs/FORMAL_WORKFLOW.md`
- `docs/LORA_WORKFLOW.md`
- `docs/HUMAN_REVIEW_CHECKLIST.md`
- `docs/OPENCLAW_INTEGRATION.md`
- `docs/LOCAL_ENV_SNAPSHOT.md`
- `RUNBOOK.md`
