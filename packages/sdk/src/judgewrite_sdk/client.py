from __future__ import annotations

from pathlib import Path

import requests


class JudgeWriteClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8000") -> None:
        self.base_url = base_url.rstrip("/")

    def list_styles(self):
        response = requests.get(f"{self.base_url}/api/styles", timeout=30)
        response.raise_for_status()
        return response.json()

    def upload_case(self, file_paths: list[str | Path]):
        files = []
        handles = []
        try:
            for file_path in file_paths:
                path = Path(file_path)
                handle = path.open("rb")
                handles.append(handle)
                files.append(("files", (path.name, handle, "text/plain")))
            response = requests.post(f"{self.base_url}/api/upload", files=files, timeout=60)
            response.raise_for_status()
            return response.json()
        finally:
            for handle in handles:
                handle.close()

    def extract_case(self, case_id: str):
        response = requests.post(
            f"{self.base_url}/api/extract",
            json={"case_id": case_id},
            timeout=60,
        )
        response.raise_for_status()
        return response.json()

    def generate_document(self, case_id: str, style_id: str = "judge_zhang"):
        response = requests.post(
            f"{self.base_url}/api/generate",
            json={"case_id": case_id, "style_id": style_id},
            timeout=90,
        )
        response.raise_for_status()
        return response.json()
