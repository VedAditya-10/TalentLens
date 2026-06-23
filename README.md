# TalentLens
AI-powered recruitment platform powered by OpenRouter. Upload resumes, create job descriptions, and get AI-generated match scores with detailed reasoning, skill gap analysis, and auto-ranked candidate shortlists.

---

## Production Deployment Architecture

The application is deployed across optimised hosting environments:

1.  **Frontend (Vercel)**: Serves the Next.js client layout. Leverages Vercel's Edge network for low latency, rapid rendering, and automatic branch preview deployments.
2.  **Backend (Render + Docker)**: Runs the FastAPI server inside a customized Docker container. A Docker host is utilised because image-based text parsing relies on underlying system binaries (`tesseract-ocr` and `poppler-utils`) for OCR and PDF rasterisation, which are not installable in standard serverless Python runtimes.
3.  **Database (Neon Serverless PostgreSQL)**: Handles data storage with dynamic database scaling.
4.  **Uptime Keep-Alive (cron-job.org)**: Since Render's free tier spins down containers after 15 minutes of inactivity (causing cold start delays), a cron service pings the backend `/health` endpoint every 10 minutes to keep the container warmed up and highly responsive.

---

## Architecture

```
Frontend (Next.js)  →  Backend (FastAPI)  →  PostgreSQL
                              ↓
                       OpenRouter (LLM API)
                       google/gemini-2.5-flash
```

AI inference powered by [OpenRouter](https://openrouter.ai). Add your API key in `.env` to get started.

---

## Prerequisites

- Docker + Docker Compose
- [OpenRouter](https://openrouter.ai) account + API key

---

## Step 1 — Get an OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to **Keys** → **Create Key**
3. Copy the key (starts with `sk-or-v1-...`)

---

## Step 2 — Run with Docker Compose (Local Dev)

```bash
git clone <repo>
cd talentlens

# Create your .env from the example
cp .env.example .env
# Edit .env and paste your OpenRouter API key

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- Swagger Docs: http://localhost:8001/docs

---

## Step 3 — Deploy to Render (Production)

One-click deploy using the Render Blueprint:

1. Push your repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your repo — Render reads `render.yaml` automatically
4. Set the `OPENROUTER_API_KEY` secret when prompted
5. Deploy — Render provisions Postgres, backend, and frontend

---

## Step 4 — Usage

### Create a Job Description
1. Go to **Job Descriptions** → **Create JD**
2. Fill in title, company, description, required skills (press Enter after each skill), experience level
3. Submit — you'll be taken to the candidate leaderboard for this JD

### Upload Resumes
1. Go to **Upload**
2. Drag and drop PDF or DOCX resume files (multiple supported)
3. Select a JD from the dropdown to auto-match after extraction
4. Click **Upload** — watch per-file progress: Extracting → Analyzing → Matched

### Run Matching
- From the JD candidate view, click **Match All** to run AI matching for all uploaded candidates
- Or check individual candidates and use the floating action bar

### Compare Candidates
- Check 2–3 candidates in the leaderboard → **Compare Selected**
- Side-by-side comparison with match scores, skills, experience, and reasoning

---

## Running Locally (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Set environment variables:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemini-2.5-flash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/talentlens
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Backend | Your OpenRouter API key (required) |
| `OPENROUTER_MODEL` | Backend | LLM model to use (default: `google/gemini-2.5-flash`) |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `CORS_ORIGINS` | Backend | JSON array of allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
