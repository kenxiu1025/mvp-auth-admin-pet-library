#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

./pet_pipeline/scripts/verify_pipeline_ready.sh
./pet_pipeline/scripts/run_white_cat_batch.sh
./pet_pipeline/scripts/report_latest_outputs.sh

