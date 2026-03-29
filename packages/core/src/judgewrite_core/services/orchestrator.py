from __future__ import annotations

import json
from typing import Optional, Union

from ..data.repository import DemoDataRepository
from ..models import (
    GenerationArtifacts,
    GenerationRequest,
    GenerationResult,
    SimilarCase,
    StageResult,
    StructuredCase,
)
from ..prompts.templates import (
    CASE_PARSE_PROMPT,
    ENHANCE_PROMPT,
    GLOBAL_SYSTEM_PROMPT,
    REASONING_PROMPT,
    STYLE_REWRITE_PROMPT,
)
from ..providers.llm import MockLLMProvider, OpenAICompatibleProvider, build_llm_provider
from ..providers.retrieval import WeightedRAGProvider


class JudgeWriteOrchestrator:
    def __init__(
        self,
        repository: Optional[DemoDataRepository] = None,
        llm_provider: Optional[Union[MockLLMProvider, OpenAICompatibleProvider]] = None,
    ) -> None:
        self.repository = repository or DemoDataRepository()
        self.llm_provider = llm_provider or build_llm_provider()
        self.rag_provider = WeightedRAGProvider(self.repository)

    def extract(self, case_text: str) -> StructuredCase:
        if isinstance(self.llm_provider, MockLLMProvider):
            return self.llm_provider.parse_case(case_text)
        prompt = CASE_PARSE_PROMPT.format(case_text=case_text)
        return self.llm_provider.parse_case(GLOBAL_SYSTEM_PROMPT, prompt)

    def generate(self, request: GenerationRequest) -> GenerationResult:
        structured_case = self.extract(request.parsed_text)
        similar_cases = self.rag_provider.search(structured_case)
        history_snippets = request.historical_cases or self.repository.get_history_snippets(request.style_profile.style_id)

        stage_results = [
            StageResult(name="parse", status="completed", output=json.dumps(structured_case.model_dump(), ensure_ascii=False, indent=2))
        ]

        reasoning = self._generate_reasoning(structured_case)
        stage_results.append(StageResult(name="reasoning", status="completed", output=reasoning))

        base_document = self._compose_document(structured_case, reasoning)
        styled_draft = self._rewrite_style(base_document, request.style_profile, history_snippets)
        stage_results.append(StageResult(name="style", status="completed", output=styled_draft))

        enhanced_draft = self._enhance(styled_draft, history_snippets)
        stage_results.append(StageResult(name="enhance", status="completed", output=enhanced_draft))

        validation_issues = self._validate(enhanced_draft, structured_case)
        stage_results.append(
            StageResult(
                name="validate",
                status="completed",
                output=json.dumps([issue.model_dump() for issue in validation_issues], ensure_ascii=False, indent=2),
            )
        )

        citations = [case.quote for case in similar_cases]
        artifacts = GenerationArtifacts(
            structured_case=structured_case,
            reasoning=reasoning,
            styled_draft=styled_draft,
            enhanced_draft=enhanced_draft,
            validation_issues=validation_issues,
            similar_cases=similar_cases,
            citations=citations,
            stage_results=stage_results,
        )
        return self._to_generation_result(artifacts, request.style_profile)

    def list_styles(self):
        return self.repository.list_styles()

    def get_style(self, style_id: str):
        return self.repository.get_style(style_id)

    def _generate_reasoning(self, structured_case: StructuredCase) -> str:
        if isinstance(self.llm_provider, MockLLMProvider):
            return self.llm_provider.generate_reasoning(structured_case)
        prompt = REASONING_PROMPT.format(
            structured_json=json.dumps(structured_case.model_dump(), ensure_ascii=False, indent=2)
        )
        return self.llm_provider.generate_text(GLOBAL_SYSTEM_PROMPT, prompt, temperature=0.2)

    def _rewrite_style(self, legal_text: str, style_profile, historical_cases: list[str]) -> str:
        if isinstance(self.llm_provider, MockLLMProvider):
            return self.llm_provider.rewrite_style(legal_text, style_profile, historical_cases)
        prompt = STYLE_REWRITE_PROMPT.format(
            style_profile=json.dumps(style_profile.model_dump(), ensure_ascii=False, indent=2),
            historical_cases="\n\n".join(historical_cases),
            legal_text=legal_text,
        )
        return self.llm_provider.generate_text(GLOBAL_SYSTEM_PROMPT, prompt, temperature=0.5)

    def _enhance(self, draft: str, history_snippets: list[str]) -> str:
        if isinstance(self.llm_provider, MockLLMProvider):
            return self.llm_provider.enhance(draft, history_snippets)
        prompt = ENHANCE_PROMPT.format(history_snippets="\n".join(history_snippets), draft=draft)
        return self.llm_provider.generate_text(GLOBAL_SYSTEM_PROMPT, prompt, temperature=0.6)

    def _validate(self, draft: str, structured_case: StructuredCase):
        if isinstance(self.llm_provider, MockLLMProvider):
            return self.llm_provider.validate(draft, structured_case)
        # 在线模型场景下先复用本地校验，保证结构稳定。
        return MockLLMProvider().validate(draft, structured_case)

    def _compose_document(self, structured_case: StructuredCase, reasoning: str) -> str:
        parties = "，".join(structured_case.parties) or "原告、被告"
        judgment_result = self._build_judgment_result(structured_case)
        return (
            f"案件类型：{structured_case.case_type}\n"
            f"当事人：{parties}\n\n"
            f"一、基本事实\n{structured_case.facts_summary}\n\n"
            f"二、诉讼请求\n{structured_case.claims}\n\n"
            f"三、法院认为\n{reasoning.replace('法院认为：', '', 1).strip()}\n\n"
            f"四、判决结果\n{judgment_result}\n"
        )

    def _build_judgment_result(self, structured_case: StructuredCase) -> str:
        if structured_case.case_type == "民间借贷纠纷":
            return "被告于本判决生效之日起十日内向原告偿还借款本金，并按法律规定承担相应利息。"
        if structured_case.case_type == "婚姻家庭纠纷":
            return "准予双方离婚；有关子女抚养及财产分割事项，依查明事实另行处理。"
        if structured_case.case_type == "机动车交通事故责任纠纷":
            return "被告在交强险及责任范围内赔偿原告各项损失，超出部分按责任比例分担。"
        if structured_case.case_type == "物业服务合同纠纷":
            return "被告按核定金额向原告支付拖欠物业费及相应违约责任。"
        return "对原告合理诉请予以支持，其余请求依法驳回。"

    def _to_generation_result(self, artifacts: GenerationArtifacts, style_profile) -> GenerationResult:
        return GenerationResult(
            draft=artifacts.enhanced_draft,
            issues=artifacts.validation_issues,
            citations=artifacts.citations,
            similar_cases=artifacts.similar_cases,
            structured_case=artifacts.structured_case,
            style_profile=style_profile,
            stage_results=artifacts.stage_results,
        )
