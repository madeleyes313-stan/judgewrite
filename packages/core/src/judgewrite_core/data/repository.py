from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Optional

from ..models import SimilarCase, StyleProfile


def get_workspace_root() -> Path:
    return Path(__file__).resolve().parents[5]


class DemoDataRepository:
    def __init__(self, base_path: Optional[Path] = None) -> None:
        self.base_path = base_path or get_workspace_root() / "data" / "demo"

    def list_styles(self) -> list[StyleProfile]:
        styles_path = self.base_path / "styles"
        profiles: list[StyleProfile] = []
        for file_path in sorted(styles_path.glob("*.json")):
            payload = json.loads(file_path.read_text(encoding="utf-8"))
            profiles.append(self._build_style_profile(payload))
        return profiles

    def get_style(self, style_id: str) -> StyleProfile:
        for profile in self.list_styles():
            if profile.style_id == style_id:
                return profile
        raise KeyError(f"unknown style_id: {style_id}")

    def get_history_snippets(self, style_id: str) -> list[str]:
        history_file = self.base_path / "history" / f"{style_id}.json"
        if not history_file.exists():
            return []
        payload = json.loads(history_file.read_text(encoding="utf-8"))
        snippets = payload.get("snippets", [])
        if snippets:
            return snippets
        documents = payload.get("documents", [])
        return [item.get("document", "")[:180] for item in documents[:3] if item.get("document")]

    def get_similar_cases(self) -> list[SimilarCase]:
        rag_file = self.base_path / "rag" / "similar_cases.json"
        if not rag_file.exists():
            return []
        payload = json.loads(rag_file.read_text(encoding="utf-8"))
        return [SimilarCase.model_validate(item) for item in payload]

    def get_history_documents(self, style_id: str) -> list[dict]:
        history_file = self.base_path / "history" / f"{style_id}.json"
        if not history_file.exists():
            return []
        payload = json.loads(history_file.read_text(encoding="utf-8"))
        return payload.get("documents", [])

    def _build_style_profile(self, seed: dict) -> StyleProfile:
        style_id = seed["style_id"]
        documents = self.get_history_documents(style_id)
        texts = [item.get("document", "") for item in documents if item.get("document")]
        case_type_counter = Counter(item.get("case_type", "") for item in documents if item.get("case_type"))
        phrase_counter = Counter(self._extract_signature_phrases(texts))

        avg_sentence_length = self._average_sentence_length(texts)
        sentence_length = self._classify_sentence_length(avg_sentence_length)
        tone = self._infer_tone(seed, texts)
        logic_structure = self._infer_logic_structure(seed, texts)
        common_terms = seed.get("baseline_terms") or [phrase for phrase, _ in phrase_counter.most_common(4)]
        signature_phrases = [phrase for phrase, _ in phrase_counter.most_common(6)]
        dominant_case_types = [item for item, _ in case_type_counter.most_common(3)]
        source_case_count = len(documents)
        style_confidence = round(min(0.98, 0.45 + source_case_count * 0.1), 2) if source_case_count else 0.3
        writing_habit = seed.get("writing_habit") or self._infer_writing_habit(texts, dominant_case_types)

        return StyleProfile(
            style_id=style_id,
            judge_name=seed["judge_name"],
            tone=tone,
            sentence_length=sentence_length,
            logic_structure=logic_structure,
            common_terms=common_terms,
            writing_habit=writing_habit,
            dominant_case_types=dominant_case_types,
            signature_phrases=signature_phrases,
            source_case_count=source_case_count,
            style_confidence=style_confidence,
        )

    def _extract_signature_phrases(self, texts: list[str]) -> list[str]:
        candidates = [
            "本院认为",
            "结合在案证据",
            "足以认定",
            "据此",
            "依法应予支持",
            "本院不予采纳",
            "综上所述",
            "经审查认为",
            "本院确认",
            "可以认定",
        ]
        phrases: list[str] = []
        for text in texts:
            for phrase in candidates:
                if phrase in text:
                    phrases.append(phrase)
        return phrases

    def _average_sentence_length(self, texts: list[str]) -> float:
        if not texts:
            return 18.0
        sentences = re.split(r"[。；!?]", "".join(texts))
        filtered = [sentence.strip() for sentence in sentences if sentence.strip()]
        if not filtered:
            return 18.0
        total_chars = sum(len(sentence) for sentence in filtered)
        return total_chars / len(filtered)

    def _classify_sentence_length(self, value: float) -> str:
        if value < 18:
            return "中短句为主"
        if value < 28:
            return "中长句为主"
        return "长句与复句较多"

    def _infer_tone(self, seed: dict, texts: list[str]) -> str:
        if seed.get("tone"):
            return seed["tone"]
        full_text = "".join(texts)
        if "本院不予采纳" in full_text or "本院确认" in full_text:
            return "审慎、克制、强调证据审查"
        if "依法应予支持" in full_text:
            return "简洁、明确、偏结论导向"
        return "规范、平实、偏书面化"

    def _infer_logic_structure(self, seed: dict, texts: list[str]) -> str:
        if seed.get("logic_structure"):
            return seed["logic_structure"]
        full_text = "".join(texts)
        if "争议焦点" in full_text:
            return "先归纳争议焦点，再逐项说明证据采信与法律适用"
        if "本院认为" in full_text and "综上所述" in full_text:
            return "先列明事实基础，再展开法院认为，最后归纳裁判结论"
        return "按事实、说理、结论三段式展开"

    def _infer_writing_habit(self, texts: list[str], dominant_case_types: list[str]) -> str:
        if not texts:
            return "重视案件事实与证据之间的对应关系。"
        focus = dominant_case_types[0] if dominant_case_types else "常见民事案件"
        full_text = "".join(texts)
        if "本院不予采纳" in full_text:
            return f"在{focus}中，习惯先审查抗辩是否成立，再给出不采纳理由。"
        if "结合在案证据" in full_text:
            return f"在{focus}中，习惯先归纳争点，再结合在案证据逐项展开说理。"
        return f"在{focus}中，偏好先概括事实，再紧接法律适用与裁判结论。"
