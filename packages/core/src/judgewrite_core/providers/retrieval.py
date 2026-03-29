from __future__ import annotations

from ..data.repository import DemoDataRepository
from ..models import SimilarCase, StructuredCase


class WeightedRAGProvider:
    def __init__(self, repository: DemoDataRepository) -> None:
        self.repository = repository

    def search(self, structured_case: StructuredCase, limit: int = 3) -> list[SimilarCase]:
        cases = self.repository.get_similar_cases()
        ranked = [self._score_case(item, structured_case) for item in cases]
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked[:limit]

    def _score_case(self, candidate: SimilarCase, structured_case: StructuredCase) -> SimilarCase:
        score = 0.0
        match_reasons: list[str] = []

        if candidate.case_type == structured_case.case_type:
            score += 0.45
            match_reasons.append("案由一致")

        issue_overlap = sorted(set(candidate.issues) & set(structured_case.issues))
        if issue_overlap:
            score += min(0.25, 0.12 * len(issue_overlap))
            match_reasons.append(f"争议焦点重合：{'、'.join(issue_overlap[:2])}")

        evidence_overlap = sorted(set(candidate.evidence) & set(structured_case.evidence))
        if evidence_overlap:
            score += min(0.15, 0.08 * len(evidence_overlap))
            match_reasons.append(f"证据类型相近：{'、'.join(evidence_overlap[:2])}")

        basis_overlap = sorted(set(candidate.legal_basis) & set(structured_case.legal_basis_candidates))
        if basis_overlap:
            score += min(0.1, 0.05 * len(basis_overlap))
            match_reasons.append("法律适用路径相近")

        keyword_overlap = sorted(set(candidate.keywords) & self._extract_query_keywords(structured_case))
        if keyword_overlap:
            score += min(0.1, 0.03 * len(keyword_overlap))
            match_reasons.append(f"事实关键词匹配：{'、'.join(keyword_overlap[:2])}")

        if not match_reasons:
            match_reasons.append("作为补充参考案例")

        return candidate.model_copy(
            update={
                "score": round(min(score, 0.99), 2),
                "match_reasons": match_reasons,
            }
        )

    def _extract_query_keywords(self, structured_case: StructuredCase) -> set[str]:
        keywords = set(structured_case.issues + structured_case.evidence + structured_case.legal_basis_candidates)
        text = f"{structured_case.claims} {structured_case.facts_summary}"
        seed_keywords = [
            "借条",
            "转账记录",
            "逾期利息",
            "夫妻感情破裂",
            "抚养",
            "事故认定书",
            "医疗费",
            "物业费",
            "服务瑕疵",
        ]
        for keyword in seed_keywords:
            if keyword in text:
                keywords.add(keyword)
        return keywords
