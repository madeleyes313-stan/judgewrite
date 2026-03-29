export type CaseFile = {
  name: string;
  category: string;
  content: string;
};

export type StyleProfile = {
  style_id: string;
  judge_name: string;
  tone: string;
  sentence_length: string;
  logic_structure: string;
  common_terms: string[];
  writing_habit: string;
  dominant_case_types: string[];
  signature_phrases: string[];
  source_case_count: number;
  style_confidence: number;
};

export type StructuredCase = {
  case_type: string;
  parties: string[];
  claims: string;
  facts_summary: string;
  evidence: string[];
  issues: string[];
  legal_basis_candidates: string[];
};

export type ValidationIssue = {
  severity: string;
  message: string;
  suggestion: string;
};

export type SimilarCase = {
  case_id: string;
  title: string;
  case_type: string;
  summary: string;
  quote: string;
  issues: string[];
  evidence: string[];
  legal_basis: string[];
  keywords: string[];
  score: number;
  match_reasons: string[];
};

export type StageResult = {
  name?: string;
  stage?: string;
  status: string;
  output?: string;
  summary?: string;
  elapsed_ms?: number;
};

export type WorkflowStage = {
  key: string;
  label: string;
  status: string;
  progress: number;
  detail: string;
};

export type ReviewState = {
  draft: string;
  issue_states: Record<string, string>;
  citation_states: Record<string, string>;
  updated_at: string;
};

export type CaseStatusResponse = {
  case_id: string;
  title: string;
  files: CaseFile[];
  workflow_status: string;
  workflow_stages: WorkflowStage[];
  structured_case: StructuredCase | null;
  generation_result: GenerateResponse | null;
  review_state: ReviewState | null;
  updated_at: string;
};

export type ArchiveCase = {
  case_id: string;
  title: string;
  case_type: string;
  style_profile: string;
  updated_at: string;
  status: string;
  training_enabled: boolean;
  source: string;
};

export type AppSettings = {
  default_style_id: string;
  default_export_format: string;
  auto_save: boolean;
  segmented_generation: boolean;
  encryption_enabled: boolean;
  audit_log_days: number;
  rag_enabled: boolean;
  ocr_mode: string;
  openai_enabled: boolean;
};

export type UploadResponse = {
  case_id: string;
  parsed_text: string;
  files: CaseFile[];
  workflow_status: string;
  workflow_stages: WorkflowStage[];
};

export type ExtractResponse = {
  accepted: boolean;
  case_id: string;
};

export type GenerateResponse = {
  draft: string;
  issues: ValidationIssue[];
  citations: string[];
  similar_cases: SimilarCase[];
  structured_case: StructuredCase;
  style_profile: StyleProfile;
  stage_results: StageResult[];
};
