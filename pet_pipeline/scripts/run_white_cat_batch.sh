#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ -f ".venv-pet-pipeline/bin/activate" ]; then
  # shellcheck disable=SC1091
  source ".venv-pet-pipeline/bin/activate"
else
  echo "WARN: .venv-pet-pipeline not found, using current python environment"
fi

INPAINT_ONLY=false
if [ "${1:-}" = "--inpaint-only" ]; then
  INPAINT_ONLY=true
fi

QUEUE_PATH="pet_pipeline/queue/jobs.jsonl"
STATES=(happy hungry angry)

if [ "$INPAINT_ONLY" = false ]; then
  PRE_QUEUED=0
  if [ -f "$QUEUE_PATH" ]; then
    PRE_QUEUED="$(jq -s '[ .[] | select(.profile=="production" and .status=="queued") ] | length' "$QUEUE_PATH")"
  fi

  echo "== Enqueue white_cat production jobs =="
  python3 pet_pipeline/scripts/enqueue_jobs.py \
    --character white_cat \
    --states "${STATES[@]}" \
    --profile production \
    --variants 1 \
    --notes "run-white-cat-batch"

  LIMIT=$((PRE_QUEUED + ${#STATES[@]}))

  echo "== Run production batch =="
  python3 pet_pipeline/scripts/run_render.py --profile production --limit "$LIMIT"
fi

echo "== Run inpaint batch =="
for state in "${STATES[@]}"; do
  python3 pet_pipeline/scripts/run_inpaint.py --character white_cat --state "$state"
done

echo "== Latest outputs =="
for state in "${STATES[@]}"; do
  RAW_PATH="$(ls -t "pet_pipeline/output/raw/white_cat/$state"/white_cat_"$state"_raw_v*.png 2>/dev/null | head -n 1 || true)"
  REVIEW_PATH="$(ls -t "pet_pipeline/output/review/white_cat/$state"/white_cat_"$state"_review_v*.png 2>/dev/null | head -n 1 || true)"
  echo "$state"
  echo "  raw=$RAW_PATH"
  echo "  review=$REVIEW_PATH"
done

