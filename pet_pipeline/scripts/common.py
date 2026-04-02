from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    yaml = None


ROOT = Path(__file__).resolve().parents[2]
PIPELINE_ROOT = ROOT / "pet_pipeline"
CONFIG_ROOT = PIPELINE_ROOT / "config"
PROMPTS_ROOT = PIPELINE_ROOT / "prompts"
QUEUE_ROOT = PIPELINE_ROOT / "queue"
OUTPUT_ROOT = PIPELINE_ROOT / "output"
REPORTS_ROOT = OUTPUT_ROOT / "reports"
LOGS_ROOT = REPORTS_ROOT / "logs"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_yaml(path: Path) -> Any:
    if yaml is not None:
        return yaml.safe_load(path.read_text(encoding="utf-8"))

    venv_python = ROOT / ".venv-pet-pipeline" / "bin" / "python3"
    if venv_python.exists():
        result = subprocess.run(
            [
                str(venv_python),
                "-c",
                (
                    "import json, yaml, pathlib; "
                    "print(json.dumps(yaml.safe_load(pathlib.Path(__import__('sys').argv[1]).read_text(encoding='utf-8')), ensure_ascii=False))"
                ),
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return json.loads(result.stdout)

    raise ModuleNotFoundError("yaml is not available and .venv-pet-pipeline fallback was not found")


def dump_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def ensure_runtime_dirs() -> None:
    for path in [QUEUE_ROOT, OUTPUT_ROOT, REPORTS_ROOT, LOGS_ROOT]:
        path.mkdir(parents=True, exist_ok=True)


def load_character(character_id: str) -> dict[str, Any]:
    return load_yaml(CONFIG_ROOT / "characters" / f"{character_id}.yaml")


def load_states() -> dict[str, dict[str, Any]]:
    data = load_yaml(CONFIG_ROOT / "states.yaml")
    return {item["state_id"]: item for item in data["states"]}


def load_profiles() -> dict[str, Any]:
    return load_yaml(CONFIG_ROOT / "render_profiles.yaml")


def list_character_ids() -> list[str]:
    return sorted(path.stem for path in (CONFIG_ROOT / "characters").glob("*.yaml"))


def write_log(name: str, payload: dict[str, Any]) -> Path:
    ensure_runtime_dirs()
    path = LOGS_ROOT / f"{name}-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    dump_json(path, payload)
    return path


def resolve_env(key: str, default: str | None = None) -> str | None:
    value = os.environ.get(key)
    if value:
        return value
    return default


def next_version(stage_dir: Path, filename_prefix: str) -> int:
    highest = 0
    for path in stage_dir.glob(f"{filename_prefix}_v*.png"):
        try:
            number = int(path.stem.split("_v")[-1])
        except ValueError:
            continue
        highest = max(highest, number)
    return highest + 1


def final_filename(character_id: str, state_id: str, stage: str, version: int) -> str:
    return f"{character_id}_{state_id}_{stage}_v{version}.png"


def parse_args_common(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--config-root", default=str(CONFIG_ROOT))
    parser.add_argument("--queue-root", default=str(QUEUE_ROOT))
    parser.add_argument("--output-root", default=str(OUTPUT_ROOT))
    return parser


def copy_if_exists(source: Path, target: Path) -> bool:
    if not source.exists():
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return True


def update_queue_record(path: Path, job_id: str, updates: dict[str, Any]) -> None:
    rows = read_jsonl(path)
    changed = False
    for row in rows:
        if row.get("job_id") == job_id:
            row.update(updates)
            changed = True
    if not changed:
        return
    text = "\n".join(json.dumps(row, ensure_ascii=False) for row in rows)
    if text:
        text += "\n"
    path.write_text(text, encoding="utf-8")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))
