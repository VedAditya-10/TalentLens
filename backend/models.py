import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    resume_text = Column(Text, nullable=False)
    resume_filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ai_analysis = relationship("AIAnalysis", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    match_records = relationship("MatchRecord", back_populates="candidate", cascade="all, delete-orphan")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    experience_required = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match_records = relationship("MatchRecord", back_populates="jd", cascade="all, delete-orphan")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, unique=True)
    extracted_skills = Column(JSON, default=list)
    extracted_experience = Column(JSON, default=list)
    extracted_education = Column(JSON, default=list)
    raw_extraction = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="ai_analysis")


class MatchRecord(Base):
    __tablename__ = "match_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id"), nullable=False)
    match_score = Column(Float, nullable=False)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    bonus_skills = Column(JSON, default=list)
    reasoning = Column(Text, nullable=True)
    rank = Column(Integer, nullable=True)
    shortlist_status = Column(String, nullable=True)
    interview_remarks = Column(Text, nullable=True)
    interview_outcome = Column(String, default="Pending", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="match_records")
    jd = relationship("JobDescription", back_populates="match_records")
