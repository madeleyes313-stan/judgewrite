from __future__ import annotations

import json
import os
import re
from typing import Any

import requests

from ..models import StructuredCase, StyleProfile, ValidationIssue


def _guess_case_type(text: str) -> str:
    mappings = {
        "离婚": "婚姻家庭纠纷",
        "婚姻": "婚姻家庭纠纷",
        "借款": "民间借贷纠纷",
        "借贷": "民间借贷纠纷",
        "交通事故": "机动车交通事故责任纠纷",
        "物业": "物业服务合同纠纷",
    }
    for keyword, value in mappings.items():
        if keyword in text:
            return value
    return "民事纠纷"


def _extract_parties(text: str) -> list[str]:
    parties: list[str] = []
    patterns = [
        r"原告[：:]\s*([^\n，。,；;]+)",
        r"被告[：:]\s*([^\n，。,；;]+)",
    ]
    for pattern in patterns:
        for match in re.findall(pattern, text):
            cleaned = match.strip()
            if cleaned and cleaned not in parties:
                parties.append(cleaned)
    if not parties:
        parties.extend(["原告", "被告"])
    return parties


def _extract_claims(text: str) -> str:
    match = re.search(r"诉讼请求[：:\s]*(.+)", text)
    if match:
        return match.group(1).strip()
    for line in text.splitlines():
        if "请求" in line:
            return line.strip()
    return "请求依法支持起诉主张。"


def _extract_evidence(text: str) -> list[str]:
    candidates = ["借条", "转账记录", "微信聊天记录", "结婚证", "庭审笔录", "事故认定书", "物业服务合同"]
    evidence = [item for item in candidates if item in text]
    return evidence or ["庭审笔录"]


def _extract_issues(case_type: str) -> list[str]:
    mapping = {
        "婚姻家庭纠纷": ["夫妻感情是否确已破裂", "子女抚养及财产分割如何处理"],
        "民间借贷纠纷": ["借贷关系是否成立", "借款本金及利息应否支持"],
        "机动车交通事故责任纠纷": ["事故责任比例如何认定", "各项损失是否有事实及法律依据"],
        "物业服务合同纠纷": ["物业费标准及欠费金额是否成立", "物业服务瑕疵是否影响付款义务"],
        "民事纠纷": ["原告诉请是否具备事实与法律依据"],
    }
    return mapping.get(case_type, mapping["民事纠纷"])


def _extract_legal_basis(case_type: str) -> list[str]:
    mapping = {
        "婚姻家庭纠纷": ["《中华人民共和国民法典》婚姻家庭编"],
        "民间借贷纠纷": ["《中华人民共和国民法典》合同编", "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》"],
        "机动车交通事故责任纠纷": ["《中华人民共和国民法典》侵权责任编"],
        "物业服务合同纠纷": ["《中华人民共和国民法典》合同编物业服务合同相关规定"],
        "民事纠纷": ["《中华人民共和国民法典》总则编"],
    }
    return mapping.get(case_type, mapping["民事纠纷"])


class MockLLMProvider:
    def parse_case(self, case_text: str) -> StructuredCase:
        case_type = _guess_case_type(case_text)
        facts_summary = case_text.strip().replace("\n", " ")
        facts_summary = re.sub(r"\s+", " ", facts_summary)[:220]
        return StructuredCase(
            case_type=case_type,
            parties=_extract_parties(case_text),
            claims=_extract_claims(case_text),
            facts_summary=facts_summary,
            evidence=_extract_evidence(case_text),
            issues=_extract_issues(case_type),
            legal_basis_candidates=_extract_legal_basis(case_type),
        )

    def generate_reasoning(self, structured_case: StructuredCase) -> str:
        lines = ["法院认为："]
        for index, issue in enumerate(structured_case.issues, start=1):
            basis = structured_case.legal_basis_candidates[min(index - 1, len(structured_case.legal_basis_candidates) - 1)]
            evidence = "、".join(structured_case.evidence)
            lines.append(
                f"{index}. 关于{issue}，本院结合当事人陈述、{evidence}等证据进行审查，"
                f"并依据{basis}作出认定。"
            )
        return "\n".join(lines)

    def rewrite_style(
        self,
        legal_text: str,
        style_profile: StyleProfile,
        historical_cases: list[str],
    ) -> str:
        sections = legal_text.split("\n\n")
        facts_opening = (
            "本院经审理查明，"
            if "审慎" in style_profile.tone or "克制" in style_profile.tone
            else "经审理查明，"
        )
        reasoning_opening = style_profile.signature_phrases[0] if style_profile.signature_phrases else "本院认为"
        support_phrase = (
            style_profile.signature_phrases[1]
            if len(style_profile.signature_phrases) > 1
            else (style_profile.common_terms[1] if len(style_profile.common_terms) > 1 else "结合在案证据")
        )
        closing_phrase = (
            style_profile.signature_phrases[2]
            if len(style_profile.signature_phrases) > 2
            else (style_profile.common_terms[-1] if style_profile.common_terms else "据此")
        )
        reference_line = historical_cases[0] if historical_cases else ""

        rewritten: list[str] = []
        for section in sections:
            if section.startswith("一、基本事实"):
                content = section.replace("一、基本事实\n", "", 1).strip()
                rewritten.append(f"一、基本事实\n{facts_opening}{content}")
            elif section.startswith("三、法院认为"):
                content = section.replace("三、法院认为\n", "", 1).strip()
                content = content.replace("本院结合", support_phrase)
                rewritten.append(
                    "三、法院认为\n"
                    f"{reasoning_opening}，对于本案争议焦点，本院围绕证据采信、事实认定及法律适用逐项分析如下。\n"
                    f"{content}\n"
                    f"{closing_phrase}，对于缺乏证据支持的抗辩意见，本院不予采纳。"
                )
            elif section.startswith("四、判决结果"):
                content = section.replace("四、判决结果\n", "", 1).strip()
                rewritten.append(f"四、判决结果\n{closing_phrase}，判决如下：\n{content}")
            else:
                rewritten.append(section)

        if reference_line and rewritten:
            rewritten.insert(
                2,
                f"本案处理思路延续既有裁判习惯，即以证据链完整性为主线，并兼顾争议焦点的层次化展开。{reference_line}",
            )

        return "\n\n".join(rewritten)

    def enhance(self, draft: str, history_snippets: list[str]) -> str:
        suffix = history_snippets[1] if len(history_snippets) > 1 else "综上所述，本院对争议焦点逐项评析后作出如下裁判。"
        if "综上所述" in draft or "综上" in draft:
            return draft
        return f"{draft}\n\n{suffix}"

    def validate(self, draft: str, structured_case: StructuredCase) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if not structured_case.evidence:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    message="证据列表为空，需人工核对卷宗后补全。",
                    suggestion="补录证据目录，再重新生成校验结果。",
                )
            )
        if "法院认为" not in draft:
            issues.append(
                ValidationIssue(
                    severity="error",
                    message="文书缺少“法院认为”核心分析段落。",
                    suggestion="重新触发裁判逻辑生成阶段。",
                )
            )
        if not issues:
            issues.append(
                ValidationIssue(
                    severity="info",
                    message="未发现明显结构性问题，请结合原卷宗做最终审阅。",
                    suggestion="重点复核法条引用和金额计算。",
                )
            )
        return issues


class OpenAICompatibleProvider:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is required")

    def _chat(self, messages: list[dict[str, str]], temperature: float) -> str:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "temperature": temperature,
                "messages": messages,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def parse_case(self, system_prompt: str, user_prompt: str) -> StructuredCase:
        content = self._chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        data: dict[str, Any] = json.loads(content)
        return StructuredCase(
            case_type=data.get("案件类型", ""),
            parties=data.get("当事人", []),
            claims=data.get("诉讼请求", ""),
            facts_summary=data.get("事实陈述", ""),
            evidence=data.get("证据", []),
            issues=data.get("争议焦点", []),
            legal_basis_candidates=data.get("法条候选", []),
        )

    def generate_text(self, system_prompt: str, user_prompt: str, temperature: float) -> str:
        return self._chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )


def build_llm_provider() -> MockLLMProvider | OpenAICompatibleProvider:
    if os.getenv("OPENAI_API_KEY"):
        return OpenAICompatibleProvider()
    return MockLLMProvider()
