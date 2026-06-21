import uuid

from database import get_db
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from models import AIAnalysis, Candidate
from openai import APITimeoutError
from schemas import CandidateDetail, CandidateOut
from services.extractor import extract_text
from services.llm_client import extract_resume_data
from sqlalchemy.orm import Session

router = APIRouter(prefix="/candidates", tags=["candidates"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}


@router.post("/upload", response_model=CandidateDetail)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validate file type
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{ext}'. Only PDF, DOCX, and image (PNG, JPG, JPEG) files are accepted.",
        )

    file_bytes = await file.read()

    # Extract raw text
    from fastapi.concurrency import run_in_threadpool
    try:
        resume_text = await run_in_threadpool(extract_text, filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        # Raised by the OCR fallback when Tesseract binary is missing or
        # the PDF can't be rasterized. Surface as a 422 so the frontend
        # can show a meaningful message instead of a generic 500.
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {e}")

    if not resume_text.strip():
        raise HTTPException(
            status_code=422, detail="Could not extract any text from the uploaded file."
        )

    # Call OpenRouter to extract structured data
    try:
        extraction = await extract_resume_data(resume_text)
    except APITimeoutError:
        raise HTTPException(status_code=504, detail="AI extraction timed out. Please try again.")

    # Create candidate record
    candidate = Candidate(
        name=extraction.get("name") or "Unknown",
        email=extraction.get("email"),
        phone=extraction.get("phone"),
        branch=extraction.get("branch"),
        gender=extraction.get("gender"),
        resume_text=resume_text,
        resume_filename=filename,
    )
    db.add(candidate)
    db.flush()  # get candidate.id before creating analysis

    # Create AI analysis record
    analysis = AIAnalysis(
        candidate_id=candidate.id,
        extracted_skills=extraction.get("skills", []),
        extracted_experience=extraction.get("experience", []),
        extracted_education=extraction.get("education", []),
        raw_extraction=extraction,
    )
    db.add(analysis)
    db.commit()
    db.refresh(candidate)

    return candidate


@router.get("", response_model=list[CandidateOut])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).order_by(Candidate.created_at.desc()).all()


@router.get("/{candidate_id}", response_model=CandidateDetail)
def get_candidate(candidate_id: uuid.UUID, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: uuid.UUID, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return {"message": "Candidate deleted successfully"}
