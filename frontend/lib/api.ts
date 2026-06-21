import {
  Candidate,
  CandidateDetail,
  JD,
  JDCreate,
  MatchRecord,
  RankedCandidate,
  CompareResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json() as Promise<T>;
}

// ── Candidates ────────────────────────────────────────────────────────────────

export async function uploadResume(file: File): Promise<CandidateDetail> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/candidates/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export function getCandidates(): Promise<Candidate[]> {
  return apiFetch<Candidate[]>("/candidates");
}

export function getCandidate(id: string): Promise<CandidateDetail> {
  return apiFetch<CandidateDetail>(`/candidates/${id}`);
}

export function deleteCandidate(id: string): Promise<void> {
  return apiFetch<void>(`/candidates/${id}`, { method: "DELETE" });
}

// ── Job Descriptions ──────────────────────────────────────────────────────────

export function createJD(data: JDCreate): Promise<JD> {
  return apiFetch<JD>("/jds", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getJDs(): Promise<JD[]> {
  return apiFetch<JD[]>("/jds");
}

export function getJD(id: string): Promise<JD> {
  return apiFetch<JD>(`/jds/${id}`);
}

export function deleteJD(id: string): Promise<void> {
  return apiFetch<void>(`/jds/${id}`, { method: "DELETE" });
}

// ── Matching ──────────────────────────────────────────────────────────────────

export function matchCandidate(
  candidateId: string,
  jdId: string
): Promise<MatchRecord> {
  return apiFetch<MatchRecord>("/match", {
    method: "POST",
    body: JSON.stringify({ candidate_id: candidateId, jd_id: jdId }),
  });
}

export function bulkMatch(
  candidateIds: string[],
  jdId: string
): Promise<MatchRecord[]> {
  return apiFetch<MatchRecord[]>("/match/bulk", {
    method: "POST",
    body: JSON.stringify({ candidate_ids: candidateIds, jd_id: jdId }),
  });
}

export function getMatchesForJD(
  jdId: string,
  filters?: {
    branch?: string;
    gender?: string;
    score_min?: number;
    score_max?: number;
  }
): Promise<RankedCandidate[]> {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.gender) params.set("gender", filters.gender);
  if (filters?.score_min !== undefined)
    params.set("score_min", String(filters.score_min));
  if (filters?.score_max !== undefined)
    params.set("score_max", String(filters.score_max));
  const qs = params.toString();
  return apiFetch<RankedCandidate[]>(`/match/jd/${jdId}${qs ? `?${qs}` : ""}`);
}

export function getMatchRecord(
  candidateId: string,
  jdId: string
): Promise<MatchRecord> {
  return apiFetch<MatchRecord>(`/match/${candidateId}/${jdId}`);
}

// ── Compare ───────────────────────────────────────────────────────────────────

export function compareCandidates(
  candidateIds: string[],
  jdId: string
): Promise<CompareResult> {
  return apiFetch<CompareResult>("/compare", {
    method: "POST",
    body: JSON.stringify({ candidate_ids: candidateIds, jd_id: jdId }),
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSystemSettings(): Promise<{ openrouter_model: string; database_url: string }> {
  return apiFetch<{ openrouter_model: string; database_url: string }>("/settings");
}

export function updateRemarks(
  candidateId: string,
  jdId: string,
  remarks: string,
  outcome: string
): Promise<MatchRecord> {
  return apiFetch<MatchRecord>(`/match/${candidateId}/${jdId}/remarks`, {
    method: "PATCH",
    body: JSON.stringify({ remarks, outcome }),
  });
}
