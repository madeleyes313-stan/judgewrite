from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class CaseFile(BaseModel):
    name: str
    category: str
    content: str = ""


class CaseSession(BaseModel):
    case_id: str
    parsed_text: str
    files: list[CaseFile] = Field(default_factory=list)
    title: str = ""
    workflow_status: str = "idle"
    workflow_stages: list["WorkflowStage"] = Field(default_factory=list)
    structured_case: Optional["StructuredCase"] = None
    generation_result: Optional["GenerationResult"] = None
    selected_style_id: str = ""
    archived: bool = False
    training_enabled: bool = True
    updated_at: str = ""
    review_state: Optional["ReviewState"] = None


class StructuredCase(BaseModel):
    case_type: str = ""
    parties: list[str] = Field(default_factory=list)
    claims: str = ""
    facts_summary: str = ""
    evidence: list[str] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)
    legal_basis_candidates: list[str] = Field(default_factory=list)


class StyleProfile(BaseModel):
    style_id: str
    judge_name: str
    tone: str
    sentence_length: str
    logic_structure: str
    common_terms: list[str] = Field(default_factory=list)
    writing_habit: str = ""
    dominant_case_types: list[str] = Field(default_factory=list)
    signature_phrases: list[str] = Field(default_factory=list)
    source_case_count: int = 0
    style_confidence: float = 0.0


class SimilarCase(BaseModel):
    case_id: str
    title: str
    case_type: str
    summary: str
    quote: str
    issues: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    score: float = 0.0
    match_reasons: list[str] = Field(default_factory=list)


class ValidationIssue(BaseModel):
    severity: str
    message: str
    suggestion: str


class StageResult(BaseModel):
    name: str
    status: str
    output: str


class WorkflowStage(BaseModel):
    key: str
    label: str
    status: str = "pending"
    progress: int = 0
    detail: str = ""


class ArchiveCaseItem(BaseModel):
    case_id: str
    title: str
    case_type: str
    style_profile: str
    updated_at: str
    status: str
    training_enabled: bool = True
    source: str = "runtime"


class ReviewState(BaseModel):
    draft: str = ""
    issue_states: dict[str, str] = Field(default_factory=dict)
    citation_states: dict[str, str] = Field(default_factory=dict)
    updated_at: str = ""


class AppSettings(BaseModel):
    default_style_id: str = "judge_zhang"
    default_export_format: str = "Word"
    auto_save: bool = True
    segmented_generation: bool = True
    encryption_enabled: bool = True
    audit_log_days: int = 90
    rag_enabled: bool = True
    ocr_mode: str = "文本层优先"
    openai_enabled: bool = False


class GenerationArtifacts(BaseModel):
    structured_case: StructuredCase
    reasoning: str
    styled_draft: str
    enhanced_draft: str
    validation_issues: list[ValidationIssue] = Field(default_factory=list)
    similar_cases: list[SimilarCase] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    stage_results: list[StageResult] = Field(default_factory=list)


class GenerationRequest(BaseModel):
    parsed_text: str
    style_profile: StyleProfile
    historical_cases: list[str] = Field(default_factory=list)


class GenerationResult(BaseModel):
    draft: str
    issues: list[ValidationIssue] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    similar_cases: list[SimilarCase] = Field(default_factory=list)
    structured_case: StructuredCase
    style_profile: StyleProfile
    stage_results: list[StageResult] = Field(default_factory=list)


class ExtractResponse(BaseModel):
    structured_case: StructuredCase
    raw: dict[str, Any] = Field(default_factory=dict)
