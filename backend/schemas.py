from __future__ import annotations
import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel


# ── AI Analysis ──────────────────────────────────────────────────────────────

class AIAnalysisOut(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    extracted_skills: List[str]
    extracted_experience: List[Dict[str, Any]]
    extracted_education: List[Dict[str, Any]]
    raw_extraction: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Candidates ────────────────────────────────────────────────────────────────

class CandidateOut(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    branch: Optional[str]
    gender: Optional[str]
    resume_filename: str
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateDetail(CandidateOut):
    ai_analysis: Optional[AIAnalysisOut] = None

    class Config:
        from_attributes = True


# ── Job Descriptions ──────────────────────────────────────────────────────────

class JDCreate(BaseModel):
    title: str
    company: Optional[str] = None
    description: str
    required_skills: List[str] = []
    experience_required: Optional[str] = None


class JDOut(BaseModel):
    id: uuid.UUID
    title: str
    company: Optional[str]
    description: str
    required_skills: List[str]
    experience_required: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Match Records ─────────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    candidate_id: uuid.UUID
    jd_id: uuid.UUID


class BulkMatchRequest(BaseModel):
    candidate_ids: List[uuid.UUID]
    jd_id: uuid.UUID


class MatchRemarksUpdate(BaseModel):
    remarks: Optional[str] = None
    outcome: Optional[Literal['Pending', 'Interviewed', 'Selected', 'Rejected']] = None


class MatchRecordOut(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    jd_id: uuid.UUID
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    bonus_skills: List[str]
    reasoning: Optional[str]
    rank: Optional[int]
    shortlist_status: Optional[str]
    interview_remarks: Optional[str] = None
    interview_outcome: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RankedCandidateOut(BaseModel):
    candidate: CandidateOut
    match: MatchRecordOut

    class Config:
        from_attributes = True


# ── Compare ───────────────────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    candidate_ids: List[uuid.UUID]
    jd_id: uuid.UUID


class CandidateCompareItem(BaseModel):
    candidate: CandidateOut
    match_score: float
    rank: Optional[int]
    shortlist_status: Optional[str]
    matched_skills: List[str]
    missing_skills: List[str]
    bonus_skills: List[str]
    reasoning: Optional[str]
    extracted_skills: List[str]
    extracted_experience: List[Dict[str, Any]]
    extracted_education: List[Dict[str, Any]]

    class Config:
        from_attributes = True


class CompareOut(BaseModel):
    jd: JDOut
    candidates: List[CandidateCompareItem]
