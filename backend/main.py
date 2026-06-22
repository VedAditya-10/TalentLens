from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base
from routers import candidates, jds, match, compare

# Create all tables on startup (Alembic handles migrations in production)
Base.metadata.create_all(bind=engine)

# Run migrations to add new columns if they do not exist
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE match_records ADD COLUMN IF NOT EXISTS interview_remarks TEXT"))
        conn.execute(text("ALTER TABLE match_records ADD COLUMN IF NOT EXISTS interview_outcome VARCHAR DEFAULT 'Pending'"))
except Exception as e:
    logger.warning(f"Self-migration check completed or skipped: {e}")

app = FastAPI(
    title="TalentLens API",
    description="AI-powered recruitment platform powered by OpenRouter",
    version="1.0.0",
)

# CORS — env-driven origins + regex matching for Vercel preview domains & localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(candidates.router)
app.include_router(jds.router)
app.include_router(match.router)
app.include_router(compare.router)


@app.get("/")
def root():
    return {"message": "TalentLens API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/settings")
def get_system_settings():
    return {
        "openrouter_model": settings.openrouter_model,
        "database_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else "configured",
    }
