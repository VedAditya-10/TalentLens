import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobDescription
from schemas import JDCreate, JDOut

router = APIRouter(prefix="/jds", tags=["job_descriptions"])


@router.post("", response_model=JDOut)
def create_jd(data: JDCreate, db: Session = Depends(get_db)):
    jd = JobDescription(**data.model_dump())
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


@router.get("", response_model=list[JDOut])
def list_jds(db: Session = Depends(get_db)):
    return db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()


@router.get("/{jd_id}", response_model=JDOut)
def get_jd(jd_id: uuid.UUID, db: Session = Depends(get_db)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return jd


@router.delete("/{jd_id}")
def delete_jd(jd_id: uuid.UUID, db: Session = Depends(get_db)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    db.delete(jd)
    db.commit()
    return {"message": "Job description deleted successfully"}
