#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ $# -lt 1 ]; then
  echo "Usage: ./pet_pipeline/scripts/qc_single_image.sh <image-path>"
  exit 1
fi

INPUT_PATH="$1"

if [ ! -f "$INPUT_PATH" ]; then
  echo "ERROR: file not found: $INPUT_PATH"
  exit 1
fi

ABS_PATH="$(cd "$(dirname "$INPUT_PATH")" && pwd)/$(basename "$INPUT_PATH")"
FILE_NAME="$(basename "$ABS_PATH")"
FILE_SIZE="$(ls -lh "$ABS_PATH" | awk '{print $5}')"

WIDTH="$(sips -g pixelWidth "$ABS_PATH" 2>/dev/null | awk '/pixelWidth/ {print $2}')"
HEIGHT="$(sips -g pixelHeight "$ABS_PATH" 2>/dev/null | awk '/pixelHeight/ {print $2}')"

CHARACTER=""
STATE=""
STAGE=""
VERSION=""

if [[ "$FILE_NAME" =~ ^([a-z_]+)_([a-z_]+)_([a-z]+)_v([0-9]+)\.(png|jpg|jpeg|webp)$ ]]; then
  CHARACTER="${BASH_REMATCH[1]}"
  STATE="${BASH_REMATCH[2]}"
  STAGE="${BASH_REMATCH[3]}"
  VERSION="${BASH_REMATCH[4]}"
fi

PROD_META=""
INPAINT_META=""

if [ -n "$CHARACTER" ] && [ -n "$STATE" ]; then
  PROD_META="$(ls -t "pet_pipeline/output/reports"/"${CHARACTER}"_"${STATE}"_production_*.json 2>/dev/null | head -n 1 || true)"
  INPAINT_META="pet_pipeline/output/reports/inpaint-${CHARACTER}-${STATE}.json"
  if [ ! -f "$INPAINT_META" ]; then
    INPAINT_META=""
  fi
fi

echo "== Single Image QC =="
echo "image=$ABS_PATH"
echo "file_name=$FILE_NAME"
echo "file_size=$FILE_SIZE"
echo "dimensions=${WIDTH:-unknown}x${HEIGHT:-unknown}"
echo "character=${CHARACTER:-unknown}"
echo "state=${STATE:-unknown}"
echo "stage=${STAGE:-unknown}"
echo "version=${VERSION:-unknown}"
echo "production_metadata=${PROD_META:-}"
echo "inpaint_metadata=${INPAINT_META:-}"
echo
echo "== QC Checklist =="
echo "[ ] Eye color matches the character spec"
echo "[ ] Fur pattern matches the character spec"
echo "[ ] Ears match the character spec"
echo "[ ] Tail length and thickness look stable"
echo "[ ] Nose and mouth stay centered and natural"
echo "[ ] Requested state is clearly visible"
echo "[ ] Expression is strong enough without breaking identity"
echo "[ ] Canvas size and centering are consistent"
echo "[ ] Transparent / background handling is correct for the intended stage"
echo "[ ] File name follows {character}_{state}_{stage}_v{n}.png"

