from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_DATA_DIR = ROOT_DIR / "data" / "demo"


def get_data_dir() -> Path:
    raw = os.getenv("JUDGEWRITE_DATA_DIR")
    data_dir = Path(raw).expanduser() if raw else DEFAULT_DATA_DIR
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_data_file(filename: str) -> Path:
    return get_data_dir() / filename


def get_cors_origins() -> list[str]:
    raw = os.getenv("JUDGEWRITE_CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]
