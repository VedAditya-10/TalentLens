// ── Candidates ────────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  branch: string | null;
  gender: string | null;
  resume_filename: string;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  candidate_id: string;
  extracted_skills: string[];
  extracted_experience: ExperienceItem[];
  extracted_education: EducationItem[];
  raw_extraction: Record<string, unknown>;
  created_at: string;
}

export interface CandidateDetail extends Candidate {
  ai_analysis: AIAnalysis | null;
}

export interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string | null;
}

// ── Job Descriptions ──────────────────────────────────────────────────────────

export interface JD {
  id: string;
  title: string;
  company: string | null;
  description: string;
  required_skills: string[];
  experience_required: string | null;
  created_at: string;
}

export interface JDCreate {
  title: string;
  company?: string;
  description: string;
  required_skills: string[];
  experience_required?: string;
}

// ── Match Records ─────────────────────────────────────────────────────────────

export interface MatchRecord {
  id: string;
  candidate_id: string;
  jd_id: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  reasoning: string | null;
  rank: number | null;
  shortlist_status: string | null;
  interview_remarks: string | null;
  interview_outcome: string | null;
  created_at: string;
}

export interface RankedCandidate {
  candidate: Candidate;
  match: MatchRecord;
}

// ── Compare ───────────────────────────────────────────────────────────────────

export interface CandidateCompareItem {
  candidate: Candidate;
  match_score: number;
  rank: number | null;
  shortlist_status: string | null;
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  reasoning: string | null;
  extracted_skills: string[];
  extracted_experience: ExperienceItem[];
  extracted_education: EducationItem[];
}

export interface CompareResult {
  jd: JD;
  candidates: CandidateCompareItem[];
}

// ── Upload ────────────────────────────────────────────────────────────────────

export type FileUploadStatus =
  | "pending"
  | "extracting"
  | "matching"
  | "done"
  | "error";

export interface UploadFileItem {
  file: File;
  status: FileUploadStatus;
  error?: string;
  candidate?: Candidate;
  match?: MatchRecord;
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

export type ShortlistStatus = "Interview Ready" | "Skill Gap" | "Not Suitable";

export function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

export function getScoreClass(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
