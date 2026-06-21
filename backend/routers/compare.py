import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, JobDescription, AIAnalysis, MatchRecord
from schemas import CompareRequest, CompareOut, CandidateCompareItem

router = APIRouter(prefix="/compare", tags=["compare"])


@router.post("", response_model=CompareOut)
def compare_candidates(data: CompareRequest, db: Session = Depends(get_db)):
    if len(data.candidate_ids) < 2 or len(data.candidate_ids) > 3:
        raise HTTPException(status_code=422, detail="Compare requires 2 or 3 candidates.")

    jd = db.query(JobDescription).filter(JobDescription.id == data.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    items = []
    for candidate_id in data.candidate_ids:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

        match = (
            db.query(MatchRecord)
            .filter(MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == data.jd_id)
            .first()
        )
        if not match:
            raise HTTPException(
                status_code=400,
                detail=f"No match record found for candidate {candidate_id} and this JD. Run matching first.",
            )

        analysis = db.query(AIAnalysis).filter(AIAnalysis.candidate_id == candidate_id).first()

        items.append(
            CandidateCompareItem(
                candidate=candidate,
                match_score=match.match_score,
                rank=match.rank,
                shortlist_status=match.shortlist_status,
                matched_skills=match.matched_skills or [],
                missing_skills=match.missing_skills or [],
                bonus_skills=match.bonus_skills or [],
                reasoning=match.reasoning,
                extracted_skills=analysis.extracted_skills if analysis else [],
                extracted_experience=analysis.extracted_experience if analysis else [],
                extracted_education=analysis.extracted_education if analysis else [],
            )
        )

    return CompareOut(jd=jd, candidates=items)
