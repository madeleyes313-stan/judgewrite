import type {
  AppSettings,
  ArchiveCase,
  CaseStatusResponse,
  ExtractResponse,
  GenerateResponse,
  StyleProfile,
  UploadResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail ?? "请求失败");
    }
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function listStyles(): Promise<StyleProfile[]> {
  return request<StyleProfile[]>("/api/styles");
}

export async function getSettings(): Promise<AppSettings> {
  return request<AppSettings>("/api/settings");
}

export async function updateSettings(payload: AppSettings): Promise<AppSettings> {
  return request<AppSettings>("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function listArchive(): Promise<ArchiveCase[]> {
  return request<ArchiveCase[]>("/api/archive");
}

export async function deleteArchiveCase(caseId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/archive/${caseId}`, {
    method: "DELETE",
  });
}

export async function getArchiveCase(caseId: string): Promise<CaseStatusResponse> {
  return request<CaseStatusResponse>(`/api/archive/${caseId}`);
}

export async function toggleArchiveTraining(caseId: string, enabled: boolean): Promise<ArchiveCase> {
  return request<ArchiveCase>(`/api/archive/${caseId}/training`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
}

export async function getCaseStatus(caseId: string): Promise<CaseStatusResponse> {
  return request<CaseStatusResponse>(`/api/cases/${caseId}/status`);
}

export async function uploadCase(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return request<UploadResponse>("/api/upload", {
    method: "POST",
    body: formData,
  });
}

export async function extractCase(caseId: string): Promise<ExtractResponse> {
  return request<ExtractResponse>("/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ case_id: caseId }),
  });
}

export async function generateDocument(caseId: string, styleId: string): Promise<ExtractResponse> {
  return request<ExtractResponse>("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ case_id: caseId, style_id: styleId }),
  });
}

export async function saveArchiveReview(
  caseId: string,
  payload: {
    draft: string;
    issue_states: Record<string, string>;
    citation_states: Record<string, string>;
  },
): Promise<CaseStatusResponse> {
  return request<CaseStatusResponse>(`/api/archive/${caseId}/review`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
