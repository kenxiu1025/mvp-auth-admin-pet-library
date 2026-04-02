#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ -f ".venv-pet-pipeline/bin/activate" ]; then
  # shellcheck disable=SC1091
  source ".venv-pet-pipeline/bin/activate"
fi

IMAGE_PATH="${1:-pet_pipeline/output/raw/white_cat/happy/white_cat_happy_raw_v6.png}"

python3 pet_pipeline/scripts/qc_single_image.py \
  --image "$IMAGE_PATH" \
  --character white_cat \
  --state happy
