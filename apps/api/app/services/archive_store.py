from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from judgewrite_core.models import ArchiveCaseItem

from ..config import get_data_file


class ArchiveStore:
    def __init__(self, file_path: Optional[Path] = None) -> None:
        self.file_path = file_path or get_data_file("archive_cases.json")
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self.file_path.write_text("[]", encoding="utf-8")

    def list_items(self) -> list[ArchiveCaseItem]:
        payload = json.loads(self.file_path.read_text(encoding="utf-8"))
        return [ArchiveCaseItem.model_validate(item) for item in payload]

    def save_items(self, items: list[ArchiveCaseItem]) -> None:
        self.file_path.write_text(
            json.dumps([item.model_dump() for item in items], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def upsert(self, item: ArchiveCaseItem) -> ArchiveCaseItem:
        items = self.list_items()
        replaced = False
        next_items: list[ArchiveCaseItem] = []
        for current in items:
            if current.case_id == item.case_id:
                next_items.append(item)
                replaced = True
            else:
                next_items.append(current)
        if not replaced:
            next_items.insert(0, item)
        self.save_items(next_items)
        return item

    def delete(self, case_id: str) -> None:
        items = [item for item in self.list_items() if item.case_id != case_id]
        self.save_items(items)

    def set_training_enabled(self, case_id: str, enabled: bool) -> ArchiveCaseItem:
        items = self.list_items()
        for idx, item in enumerate(items):
            if item.case_id == case_id:
                updated = item.model_copy(update={"training_enabled": enabled})
                items[idx] = updated
                self.save_items(items)
                return updated
        raise KeyError(case_id)


archive_store = ArchiveStore()
