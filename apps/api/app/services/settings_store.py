from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from judgewrite_core.models import AppSettings

from ..config import get_data_file


class SettingsStore:
    def __init__(self, file_path: Optional[Path] = None) -> None:
        self.file_path = file_path or get_data_file("settings.json")
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self.save(AppSettings())

    def load(self) -> AppSettings:
        payload = json.loads(self.file_path.read_text(encoding="utf-8"))
        return AppSettings.model_validate(payload)

    def save(self, settings: AppSettings) -> AppSettings:
        self.file_path.write_text(json.dumps(settings.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
        return settings


settings_store = SettingsStore()
