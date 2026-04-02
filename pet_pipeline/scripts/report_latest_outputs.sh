#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STATES=(happy hungry angry)

echo "== Latest white_cat outputs =="
for state in "${STATES[@]}"; do
  RAW_PATH="$(ls -t "pet_pipeline/output/raw/white_cat/$state"/white_cat_"$state"_raw_v*.png 2>/dev/null | head -n 1 || true)"
  REVIEW_PATH="$(ls -t "pet_pipeline/output/review/white_cat/$state"/white_cat_"$state"_review_v*.png 2>/dev/null | head -n 1 || true)"
  PROD_META="$(ls -t "pet_pipeline/output/reports"/white_cat_"$state"_production_*.json 2>/dev/null | head -n 1 || true)"
  INPAINT_META="pet_pipeline/output/reports/inpaint-white_cat-$state.json"

  echo "$state"
  echo "  raw=$RAW_PATH"
  echo "  review=$REVIEW_PATH"
  echo "  production_metadata=$PROD_META"
  if [ -f "$INPAINT_META" ]; then
    echo "  inpaint_metadata=$INPAINT_META"
  else
    echo "  inpaint_metadata="
  fi
done

