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

REPORT_PATH="pet_pipeline/output/reports/local_readiness_report.json"
QUEUE_PATH="pet_pipeline/queue/jobs.jsonl"

echo "== Inspect ComfyUI =="
python3 pet_pipeline/scripts/inspect_comfyui.py

READY="$(jq -r '.ready_for_production' "$REPORT_PATH")"
if [ "$READY" != "true" ]; then
  echo "FAIL: ready_for_production is false"
  exit 1
fi

PRE_QUEUED=0
if [ -f "$QUEUE_PATH" ]; then
  PRE_QUEUED="$(jq -s '[ .[] | select(.profile=="production" and .status=="queued") ] | length' "$QUEUE_PATH")"
fi

echo "== Enqueue white_cat happy production =="
python3 pet_pipeline/scripts/enqueue_jobs.py \
  --character white_cat \
  --states happy \
  --profile production \
  --variants 1 \
  --notes "verify-pipeline-ready"

LIMIT=$((PRE_QUEUED + 1))

echo "== Run production render =="
python3 pet_pipeline/scripts/run_render.py --profile production --limit "$LIMIT"

LATEST_METADATA="$(ls -t pet_pipeline/output/reports/white_cat_happy_production_*.json 2>/dev/null | head -n 1 || true)"
if [ -z "$LATEST_METADATA" ]; then
  echo "FAIL: no production metadata found for white_cat happy"
  exit 1
fi

CONTROLNET_OK="$(jq -r '.extensions.controlnet_enabled' "$LATEST_METADATA")"
IPADAPTER_OK="$(jq -r '.extensions.ipadapter_enabled' "$LATEST_METADATA")"
STATUS_OK="$(jq -r '.workflow_status' "$LATEST_METADATA")"

if [ "$STATUS_OK" != "completed" ] || [ "$CONTROLNET_OK" != "true" ] || [ "$IPADAPTER_OK" != "true" ]; then
  echo "FAIL: production validation failed"
  echo "metadata=$LATEST_METADATA"
  echo "workflow_status=$STATUS_OK controlnet_enabled=$CONTROLNET_OK ipadapter_enabled=$IPADAPTER_OK"
  exit 1
fi

echo "SUCCESS: pipeline is ready"
echo "inspect_report=$REPORT_PATH"
echo "production_metadata=$LATEST_METADATA"

