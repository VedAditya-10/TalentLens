import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from openai import APITimeoutError
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Candidate, JobDescription, AIAnalysis, MatchRecord
from schemas import MatchRequest, BulkMatchRequest, MatchRecordOut, RankedCandidateOut, MatchRemarksUpdate
from services.llm_client import score_match
from services.ranker import rerank_candidates_for_jd

router = APIRouter(prefix="/match", tags=["matching"])


async def _run_single_match(
    candidate_id: uuid.UUID,
    jd_id: uuid.UUID,
    db: Session,
    force: bool = False,
) -> MatchRecord:
    """Core matching logic: check cache → call LLM → save → return record."""
    # Return cached result if it already exists and force is False
    if not force:
        existing = (
            db.query(MatchRecord)
            .filter(MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == jd_id)
            .first()
        )
        if existing:
            return existing

    # Fetch candidate + analysis
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    analysis = db.query(AIAnalysis).filter(AIAnalysis.candidate_id == candidate_id).first()
    if not analysis:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate {candidate_id} has no AI analysis. Re-upload the resume first.",
        )

    # Fetch JD
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail=f"Job description {jd_id} not found")

    # Build candidate profile for prompt
    candidate_profile = {
        "name": candidate.name,
        "skills": analysis.extracted_skills,
        "experience": analysis.extracted_experience,
        "education": analysis.extracted_education,
        "branch": candidate.branch,
    }

    # Call OpenRouter
    try:
        result = await score_match(
            candidate_json=candidate_profile,
            jd_title=jd.title,
            jd_description=jd.description,
            required_skills=jd.required_skills or [],
        )
    except APITimeoutError:
        raise HTTPException(status_code=504, detail="AI scoring timed out. Please try again.")

    # Preserve existing remarks/outcome if they exist before deleting
    existing_remarks = None
    existing_outcome = "Pending"
    existing_rec = db.query(MatchRecord).filter(
        MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == jd_id
    ).first()
    if existing_rec:
        existing_remarks = existing_rec.interview_remarks
        existing_outcome = existing_rec.interview_outcome or "Pending"

    # Delete existing match record if we are forcing recalculation
    db.query(MatchRecord).filter(
        MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == jd_id
    ).delete()
    db.flush()

    # Save match record
    record = MatchRecord(
        candidate_id=candidate_id,
        jd_id=jd_id,
        match_score=float(result.get("match_score", 0)),
        matched_skills=result.get("matched_skills", []),
        missing_skills=result.get("missing_skills", []),
        bonus_skills=result.get("bonus_skills", []),
        reasoning=result.get("reasoning", ""),
        shortlist_status=result.get("shortlist_status", "Not Suitable"),
        interview_remarks=existing_remarks,
        interview_outcome=existing_outcome,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("", response_model=MatchRecordOut)
async def match_single(data: MatchRequest, force: bool = False, db: Session = Depends(get_db)):
    record = await _run_single_match(data.candidate_id, data.jd_id, db, force=force)
    rerank_candidates_for_jd(data.jd_id, db)
    db.refresh(record)
    return record


@router.post("/bulk", response_model=list[MatchRecordOut])
async def match_bulk(data: BulkMatchRequest, force: bool = False, db: Session = Depends(get_db)):
    results = []
    for candidate_id in data.candidate_ids:
        try:
            record = await _run_single_match(candidate_id, data.jd_id, db, force=force)
            results.append(record)
        except HTTPException as e:
            # Log and continue for bulk — don't abort entire batch
            continue
    rerank_candidates_for_jd(data.jd_id, db)
    # Refresh all records to get updated ranks
    for r in results:
        db.refresh(r)
    return results


@router.get("/jd/{jd_id}", response_model=list[RankedCandidateOut])
def get_ranked_candidates(
    jd_id: uuid.UUID,
    branch: Optional[str] = None,
    gender: Optional[str] = None,
    score_min: Optional[float] = None,
    score_max: Optional[float] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(MatchRecord)
        .options(joinedload(MatchRecord.candidate))
        .filter(MatchRecord.jd_id == jd_id)
    )

    if score_min is not None:
        query = query.filter(MatchRecord.match_score >= score_min)
    if score_max is not None:
        query = query.filter(MatchRecord.match_score <= score_max)

    records = query.order_by(MatchRecord.rank.asc().nullslast()).all()

    # Apply candidate-level filters after join
    if branch:
        records = [r for r in records if r.candidate.branch and branch.lower() in r.candidate.branch.lower()]
    if gender:
        records = [r for r in records if r.candidate.gender and gender.lower() == r.candidate.gender.lower()]

    return [{"candidate": r.candidate, "match": r} for r in records]


@router.get("/{candidate_id}/{jd_id}", response_model=MatchRecordOut)
def get_match_record(candidate_id: uuid.UUID, jd_id: uuid.UUID, db: Session = Depends(get_db)):
    record = (
        db.query(MatchRecord)
        .filter(MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == jd_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Match record not found")
    return record


@router.patch("/{candidate_id}/{jd_id}/remarks", response_model=MatchRecordOut)
def update_match_remarks(
    candidate_id: uuid.UUID,
    jd_id: uuid.UUID,
    data: MatchRemarksUpdate,
    db: Session = Depends(get_db),
):
    record = (
        db.query(MatchRecord)
        .filter(MatchRecord.candidate_id == candidate_id, MatchRecord.jd_id == jd_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Match record not found")

    if data.remarks is not None:
        record.interview_remarks = data.remarks
    if data.outcome is not None:
        record.interview_outcome = data.outcome

    db.commit()
    db.refresh(record)
    return record
