# TECHNICAL REPORT: TalentLens Architecture & System Documentation

This document provides an exhaustive, production-grade technical analysis of **TalentLens**, an AI-powered recruitment and candidate matching system. Written for senior engineering teams, this report dissects the codebase, API design, database schemas, AI pipeline details, and key engineering trade-offs.

---

## 1. Project Overview

**TalentLens** is a full-stack, enterprise-grade AI recruiting platform designed to automate candidate resume screening, extract structured profile data, and perform multi-metric candidate-to-job matches with high precision.

### The Problem
Traditional recruitment and applicant tracking systems (ATS) suffer from critical bottlenecks:
1. **Manual Labor Costs**: Hiring managers spend hours manually reviewing unstructured PDF, DOCX, and image-based resumes.
2. **Inconsistent Rubrics**: Human evaluation varies dynamically by recruiter mood, leading to subjective bias and missed talent.
3. **Keyword Matching Limitations**: Legacy ATS platforms rely on exact string-keyword filtering, which fails to capture candidates who list semantically equivalent skills (e.g., matching "React.js" when the job description requires "React framework").

### Core Value Proposition
TalentLens addresses these deficiencies through a clean, automated pipeline:
* **Format Agnostic Parsing**: Seamlessly ingests PDF, DOCX, and scanned image resumes. Falls back to Tesseract OCR dynamically when layout text is unreadable or scanned.
* **Semantic LLM Structuring**: Translates unstructured resume strings into clean, validated JSON schemas containing parsed personal details, education lists, work experience nodes, and skill sets.
* **Calibrated Match Scoring**: Evaluates candidate suitability against Job Descriptions using a strict mathematical rubric (60% skills, 30% experience relevance, 10% bonus/education), eliminating score clustering and subjective bias.
* **Dynamic Leaderboards**: Maintains updated candidate ranks descending by score for each position, enabling recruiters to compare profiles side-by-side.

---

## 2. System Architecture

TalentLens is built on a decoupled three-tier architecture structured to scale.

### Components
1. **Frontend Interface (Next.js 16)**: Built as a Single Page Application (SPA) using Next.js App Router, React 19, and Tailwind CSS 4. Serves dashboards, uploader queues, and compare sheets.
2. **Backend REST API (FastAPI)**: Lightweight ASGI service executing asynchronous database sessions, handling file-type routing, checking system Tesseract libraries, and coordinating LLM requests.
3. **Relational Database (PostgreSQL 15)**: Relational schema storing candidate records, structured AI analyses, JDs, and candidate match ratings.

```
+---------------------------------------------------------------------------------+
|                               NEXT.JS FRONTEND (Port 3001)                      |
|  - Dashboard View (page.tsx)             - Upload Panel (upload/page.tsx)       |
|  - Comparison Matrix (compare/page.tsx) - Client API Fetch Wrapper (api.ts)     |
+----------------------------------------+----------------------------------------+
                                         |
                            Async HTTP POST/GET/DELETE
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                                FASTAPI BACKEND (Port 8001)                      |
|                                                                                 |
|  +---------------------------+  +---------------------------+  +-------------+  |
|  |     Text Extractor        |  |        LLM Client         |  |   Ranker    |  |
|  |   (pdfplumber / docx)     |  |       (OpenRouter)        |  |  (ranker.py)|  |
|  |   + Tesseract OCR fallback|  |  (google/gemini-2.5-flash)|  |             |  |
|  +-------------+-------------+  +-------------+-------------+  +------+------+  |
+----------------|------------------------------|-----------------------|---------+
                 |                              |                       |
           Extracts Text                  JSON Structure             Reranks
                 |                              |                       |
                 v                              v                       v
+---------------------------------------------------------------------------------+
|                              POSTGRESQL DATABASE (Port 5433)                    |
|  - Table: candidates                   - Table: job_descriptions                |
|  - Table: ai_analysis                  - Table: match_records                   |
+---------------------------------------------------------------------------------+
```

### End-to-End System Request Flow
```
[User Uploads Resume] 
         │
         ▼
(Next.js Frontend) ─── Multipart Form-Data (file) ───► (FastAPI: POST /candidates/upload)
                                                                 │
                                                       [Validate File Type]
                                                                 │
                                                       [Extract Text (pdf/docx/ocr)]
                                                                 │
                                                       [Call OpenRouter LLM]
                                                                 │
                                                       [Validate Structured JSON]
                                                                 │
                                              ┌──────────────────┴──────────────────┐
                                              ▼                                     ▼
                                      (Save Candidate)                      (Save AI Analysis)
                                     [Table: candidates]                   [Table: ai_analysis]
                                              │                                     │
                                              └──────────────────┬──────────────────┘
                                                                 ▼
                                                    [Return Candidate JSON Payload]
                                                                 │
                                                                 ▼
                                                  (Next.js UI updates Upload Queue)
```

1. **Upload Initiation**: A user drops files into the uploader dashboard. The Next.js client transmits a multipart form-data payload containing the binary stream to `POST /candidates/upload`.
2. **File Processing & Extraction**:
   - The backend validates the extension against `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`.
   - Text extraction is routed: PDF reads layout streams via `pdfplumber`. If character count is $<50$, it invokes `pdf2image` and processes pages via `pytesseract`. DOCX parsed via `python-docx` paragraphs. Images run direct OCR.
3. **Structured Profiling**: Extracted raw text is wrapped in the structural extraction prompt and sent to OpenRouter (routing through Google Vertex). The model returns validated JSON.
4. **Data Persistence**:
   - Candidate demographics (name, email, phone) are saved to `candidates`.
   - Complex nested extractions (experience arrays, education arrays, skills) are saved as structured JSON in `ai_analysis`.
5. **Calibrated Match Assessment**: The recruiter opens a JD and initiates matching. A `POST /match` request coordinates the candidate profile against job specifications. The LLM scores the candidate, mapping matching, missing, and bonus skills.
6. **Automatic Rank Recalculation**: After each match record insertion or bulk update, the system triggers `rerank_candidates_for_jd`. Ranks are recalculated by ordering matching records descending by score, updating the database.

---

## 3. Tech Stack

| Technology | Role | Version | Chosen Over | Rationale |
|---|---|---|---|---|
| **FastAPI** | Backend Web Framework | `0.109+` | Django / Flask | Native asynchronous execution, automated OpenAPI documentation generation, and high data validation speed via Pydantic schemas. |
| **Uvicorn** | ASGI Web Server | `0.27+` | Gunicorn / WSGI | High-throughput, async-native execution engine required for handling multiple I/O-bound LLM requests without thread blocking. |
| **SQLAlchemy** | Object Relational Mapper | `2.0+` | Django ORM | Supports advanced 2.0 style syntax, unified query models, and structured connection pooling. |
| **PostgreSQL** | Primary Database | `15` | MongoDB / MySQL | Strict ACID transactional safety, native support for JSON querying, and reliable indexing for candidate rankings. |
| **pdfplumber** | PDF Parser | `0.10.3` | PyPDF2 | High layout extraction fidelity, preserving column reading order and retaining accurate spacing. |
| **python-docx** | Word Document Parser | `0.8.11` | python-docx2txt | Lightweight library with direct API bindings for paragraph text parsing. |
| **pytesseract** | OCR Wrapper | `0.3.10` | EasyOCR | Direct, lightweight wrapper around native Tesseract binary without loading heavy PyTorch models into RAM. |
| **pdf2image** | PDF Rasterizer | `1.16.3` | PyMuPDF | Relies on standard Poppler utility to reliably rasterize scanned pages for OCR fallbacks. |
| **OpenRouter API** | LLM Inference Hub | Standard | Direct API Keys | Aggregates inference endpoints. Dynamically configured to route queries specifically to Google Vertex (`google/gemini-2.5-flash`) for low latency and high JSON fidelity. |
| **Next.js** | Frontend Application | `16.2.9` | Vanilla React SPA | Standardized Next.js App Router for server-side layouts, component pre-rendering, and routing. |
| **React** | Component Rendering | `19.2.4` | Vue / Angular | Standard library for modular client-side state tracking and interactive layouts. |
| **Tailwind CSS** | Styling Framework | `4.0` | Styled Components | Modern utility-first CSS processor, allowing styling overrides (e.g. print media blocks) to compile directly into standard stylesheets. |

---

## 4. Database Schema

### Database Entity Relationship (ER) Diagram

```
  +-----------------------+                    +-----------------------+
  |      candidates       |                    |   job_descriptions    |
  +-----------------------+                    +-----------------------+
  | PK  id (UUID)         |<--------+          | PK  id (UUID)         |<--------+
  |     name (VARCHAR)    |         |          |     title (VARCHAR)   |         |
  |     email (VARCHAR)   |         |          |     company (VARCHAR) |         |
  |     phone (VARCHAR)   |         |          |     description (TEXT)|         |
  |     branch (VARCHAR)  |         |          |     req_skills (JSON) |         |
  |     gender (VARCHAR)  |         |          |     exp_req (VARCHAR) |         |
  |     resume_text (TEXT)|         |          |     created_at (TS)   |         |
  |     res_fname (VARCHAR)         |          +-----------------------+         |
  |     created_at (TS)   |         |                                            |
  +-----------------------+         |                                            |
              │                     |                                            |
              │ 1-to-1              │ 1-to-Many                                  | 1-to-Many
              ▼                     │                                            |
  +-----------------------+         │                                            |
  |      ai_analysis      |         │                                            |
  +-----------------------+         │                                            |
  | PK  id (UUID)         |         │                                            |
  | FK  cand_id (UUID,UQ) |---------+                                            |
  |     ext_skills (JSON) |                                                      |
  |     ext_exp (JSON)    |                                                      |
  |     ext_edu (JSON)    |                                                      |
  |     raw_ext (JSON)    |                                                      |
  |     created_at (TS)   |                                                      |
  +-----------------------+                                                      |
                                                                                 |
                                    +-----------------------+                    |
                                    |     match_records     |                    |
                                    +-----------------------+                    |
                                    | PK  id (UUID)         |                    |
                                    | FK  cand_id (UUID)    |────────────────────+
                                    | FK  jd_id (UUID)      |────────────────────+
                                    |     match_score(FLOAT)|
                                    |     match_skills(JSON)|
                                    |     miss_skills(JSON) |
                                    |     bonus_skills(JSON)|
                                    |     reasoning (TEXT)  |
                                    |     rank (INTEGER)    |
                                    |     status (VARCHAR)  |
                                    |     created_at (TS)   |
                                    +-----------------------+
```

### Table Structure & Definitions

#### 1. Table: `candidates`
* **Purpose**: Serves as the primary source of truth for candidate details and uploaded resume texts.
* **Schema Definition**:
  - `id` (`UUID`, Primary Key): Default generated via `uuid.uuid4`. Identifies the candidate.
  - `name` (`VARCHAR`, Non-nullable): Extracted candidate name.
  - `email` (`VARCHAR`, Nullable): Contact email address.
  - `phone` (`VARCHAR`, Nullable): Contact phone number.
  - `branch` (`VARCHAR`, Nullable): Engineering/academic major or specialization.
  - `gender` (`VARCHAR`, Nullable): Candidate's gender.
  - `resume_text` (`TEXT`, Non-nullable): Extracted raw text parsed from the uploaded file.
  - `resume_filename` (`VARCHAR`, Non-nullable): Original filename stored for reference.
  - `created_at` (`TIMESTAMP`, Default `utcnow`): Audit timestamp.

#### 2. Table: `job_descriptions`
* **Purpose**: Stores the requisitions created by recruiters, containing job descriptions and requirements.
* **Schema Definition**:
  - `id` (`UUID`, Primary Key): Default generated via `uuid.uuid4`.
  - `title` (`VARCHAR`, Non-nullable): Name of the role.
  - `company` (`VARCHAR`, Nullable): Recruiting organization name.
  - `description` (`TEXT`, Non-nullable): Full job description text block.
  - `required_skills` (`JSON`, Default `[]`): Array of required skill strings.
  - `experience_required` (`VARCHAR`, Nullable): Text block indicating experience requirements.
  - `created_at` (`TIMESTAMP`, Default `utcnow`): Audit timestamp.

#### 3. Table: `ai_analysis`
* **Purpose**: Stores the structured profile information parsed by the LLM. Implements a 1-to-1 relationship with candidates to isolate heavy nested JSON payloads from candidate indexes.
* **Schema Definition**:
  - `id` (`UUID`, Primary Key): Default generated via `uuid.uuid4`.
  - `candidate_id` (`UUID`, Foreign Key pointing to `candidates.id`, Non-nullable, Unique): Links analysis to candidate. Unique constraint guarantees strict 1-to-1 mapping.
  - `extracted_skills` (`JSON`, Default `[]`): Structured array of skills found in the resume.
  - `extracted_experience` (`JSON`, Default `[]`): List of job histories: `[{"role": "X", "company": "Y", "duration": "Z"}]`.
  - `extracted_education` (`JSON`, Default `[]`): List of degrees: `[{"degree": "A", "institution": "B", "year": "C"}]`.
  - `raw_extraction` (`JSON`, Default `{}`): Unmodified model JSON response.
  - `created_at` (`TIMESTAMP`, Default `utcnow`): Audit timestamp.

#### 4. Table: `match_records`
* **Purpose**: Stores the evaluation results, match ratings, and rankings for candidates under specific job descriptions.
* **Schema Definition**:
  - `id` (`UUID`, Primary Key): Default generated via `uuid.uuid4`.
  - `candidate_id` (`UUID`, Foreign Key pointing to `candidates.id`, Non-nullable): Candidate link.
  - `jd_id` (`UUID`, Foreign Key pointing to `job_descriptions.id`, Non-nullable): Job description link.
  - `match_score` (`DOUBLE PRECISION`, Non-nullable): Calculated match rating (0.0 to 100.0).
  - `matched_skills` (`JSON`, Default `[]`): Skills matching both resume and JD.
  - `missing_skills` (`JSON`, Default `[]`): Skills requested in JD but missing in candidate profile.
  - `bonus_skills` (`JSON`, Default `[]`): Extra candidate skills beneficial to the role.
  - `reasoning` (`TEXT`, Nullable): Detailed evaluation rationale generated by the AI model.
  - `rank` (`INTEGER`, Nullable): Position of the candidate in the leaderboard for this JD.
  - `shortlist_status` (`VARCHAR`, Nullable): Suitability tag (`Interview Ready`, `Skill Gap`, `Not Suitable`).
  - `interview_remarks` (`TEXT`, Nullable): Recruiters' custom notes and evaluation remarks.
  - `interview_outcome` (`VARCHAR`, Default `"Pending"`): Interview workflow outcome status (`Pending`, `Interviewed`, `Selected`, `Rejected`).
  - `created_at` (`TIMESTAMP`, Default `utcnow`): Match generation timestamp.

---

## 5. AI Pipeline

TalentLens features a highly structured, 5-stage processing pipeline.

### Stage 1: Text Extraction & OCR Fallback
1. **Initial Parsing Attempt**: The system checks the file extension. 
   - PDF: Uses `pdfplumber` to extract character vectors and spacing layout.
   - DOCX: Uses `docx.Document` paragraphs to read textual segments.
2. **Scanned PDF Identification**: The system computes the length of extracted PDF text. If the length is less than `50` characters (`OCR_FALLBACK_CHAR_THRESHOLD`), the PDF is marked as a scanned image.
3. **Poppler Page Rasterization**: The backend calls `pdf2image.convert_from_bytes` at `200` DPI (`OCR_DPI`) to render pages into image buffers. The operation is capped at `20` pages (`OCR_MAX_PAGES`) to restrict memory usage.
4. **Tesseract Engine OCR**: 
   - On Windows (`nt` OS name), the system verifies the presence of the default Tesseract executable at `C:\Program Files\Tesseract-OCR\tesseract.exe` and sets the `pytesseract.tesseract_cmd` path. On Linux containers, it relies on system environment variables.
   - Pytesseract executes `image_to_string` on each rasterized page. The outputs are merged.
   - For raw image files (`.png`, `.jpg`, `.jpeg`), the system passes the buffer directly to Tesseract.

### Stage 2: Contact Parsing & Metadata Identification
The extracted text string is prepared for structured AI extraction. The system bypasses complex regular expressions for parsing names or numbers, relying instead on semantic parsing.

### Stage 3: LLM Structure Parsing
The parsed text is fed into `extract_resume_data` in `services/llm_client.py`. It submits the prompt request using OpenRouter (routing through Google Vertex).

#### Verbatim Resume Extraction Prompt Template
```
You are a resume parser. Extract information from the resume text below and return ONLY a valid JSON object with no preamble, no explanation, no markdown.

JSON structure:
{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "branch": "string or null (field of study/engineering branch)",
  "gender": "string or null",
  "skills": ["list", "of", "technical", "skills"],
  "experience": [
    {"role": "string", "company": "string", "duration": "string"}
  ],
  "education": [
    {"degree": "string", "institution": "string", "year": "string or null"}
  ]
}

Resume text:
{resume_text}
```

### Stage 4: Match Scoring
When evaluating a candidate, the backend constructs the scoring payload by fetching the target candidate's `ai_analysis` fields and the JD specifications. The engine calculates scores using a strict mathematical formula to avoid clustering.

#### Verbatim Scoring Prompt Template
```
You are an expert technical recruiter. Evaluate how well this candidate fits the job description. Return ONLY a valid JSON object with no preamble, no explanation, no markdown.

JSON structure:
{
  "match_score": <integer 0-100 calculated using the strict scoring rubric below>,
  "matched_skills": ["skills present in both resume and JD"],
  "missing_skills": ["skills required by JD but absent in resume"],
  "bonus_skills": ["skills candidate has that are valuable but not required"],
  "shortlist_status": "<one of: Interview Ready, Skill Gap, Not Suitable>",
  "reasoning": "3-5 sentence explanation of the score. Be specific — mention exact skills, experience relevance, and what would improve the score."
}

Strict Scoring Rubric (Calculate the score mathematically, do not guess or use generic values):
1. Required Skills Match (60 points max):
   - Calculate: (Number of Matched Required Skills / Total Number of Required Skills) * 60
2. Experience & Role Relevance (30 points max):
   - 25-30 points: Outstanding experience, matching role level and duration.
   - 15-24 points: Good relevant experience but slightly shorter duration or minor role mismatch.
   - 0-14 points: Little to no relevant industry experience.
3. Bonus Skills & Education (10 points max):
   - Up to 10 points for relevant educational degree, certifications, and valuable extra skills (bonus skills) not explicitly required by the JD but highly beneficial.

Sum the points to get the final match_score. Differentiate scores carefully (e.g., a candidate matching 4 skills must score higher than a candidate matching 3 skills, all else being equal). Do not fall back to generic "safe" scores like 60 or 65.

Scoring guide:
- 80-100: Strong match, ready to interview (Shortlist Status: Interview Ready)
- 60-79: Partial match, has gaps but trainable (Shortlist Status: Skill Gap)
- Below 60: Significant gaps (Shortlist Status: Not Suitable)

Candidate profile:
{candidate_json}

Job Description:
Title: {jd_title}
Requirements: {jd_description}
Required Skills: {required_skills}
```

### Stage 5: Auto-Ranking with Tiebreaker
Following matching, the backend runs `rerank_candidates_for_jd` inside `backend/services/ranker.py`:
1. Queries the database to retrieve all `MatchRecord` entries matching `jd_id`.
2. Orders them by `match_score` descending.
3. If two candidates have the same score, the database order acts as the tiebreaker.
4. Updates the `rank` field sequentially (1-indexed) and commits.

### Caching Strategy
To control token costs and minimize API latency, candidate match evaluations are cached directly in the database (`match_records`).
- When a single or bulk match request is received, the backend checks for an existing `candidate_id`/`jd_id` match record. If found, it returns the cached result.
- To bypass caching, a query parameter `force=True` is supported. This deletes the existing `MatchRecord` and requests a new evaluation from the LLM.

### Retry Logic
On receiving a response from the LLM:
1. The backend parses the string using JSON libraries.
2. If `JSONDecodeError` or `ValueError` is raised (e.g., due to model preamble text or incorrect JSON structures), the backend catches the error.
3. It retries once, appending the instruction: `\n\nReturn only the raw JSON object, nothing else.`
4. If the second attempt fails, it logs the error and returns a structured error object.

### Why `/no_think` is Used
Some reasoning-capable models (e.g., DeepSeek-R1) generate internal "thinking" processes inside `<think>...</think>` tags before returning the final response. 
- In structured JSON parsing environments, these tags break standard JSON parsers and can cause parsing failures.
- Including `/no_think` instructs OpenRouter and underlying endpoints to bypass reasoning tokens and return only the JSON payload. This reduces response latency, limits token consumption, and prevents JSON syntax errors.

---

## 6. API Endpoints

### Candidates Router (`/candidates`)

#### 1. `POST /candidates/upload`
* **Description**: Receives a resume file, extracts text, calls the LLM, and creates the database candidate records.
* **Payload Type**: `multipart/form-data`
* **Request Shape**: 
  - `file`: `UploadFile` (binary streams of `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`).
* **Response Shape (`CandidateDetail`)**:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1-555-0199",
    "branch": "Computer Science",
    "gender": "Female",
    "resume_filename": "resume.pdf",
    "created_at": "2026-06-18T06:00:00Z",
    "ai_analysis": {
      "id": "8ca85f64-5717-4562-b3fc-2c963f66af23",
      "candidate_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "extracted_skills": ["Python", "FastAPI", "React"],
      "extracted_experience": [
        {"role": "Software Engineer", "company": "Tech Corp", "duration": "2 years"}
      ],
      "extracted_education": [
        {"degree": "B.S. Computer Science", "institution": "State University", "year": "2022"}
      ],
      "raw_extraction": {},
      "created_at": "2026-06-18T06:00:00Z"
    }
  }
  ```
* **AI Invocation**: Yes. Triggers raw text extraction and calls the LLM client.

#### 2. `GET /candidates`
* **Description**: Returns all candidates in the system, sorted by creation date descending.
* **Response Shape**: `List[CandidateOut]` (contains Candidate metadata without the nested `ai_analysis` payload to optimize performance).
* **AI Invocation**: No (database query).

#### 3. `GET /candidates/{candidate_id}`
* **Description**: Retrieves candidate details, including `ai_analysis`.
* **Response Shape**: `CandidateDetail`
* **AI Invocation**: No (database query).

#### 4. `DELETE /candidates/{candidate_id}`
* **Description**: Removes candidate record. Associated database relationships (AI analysis and matching records) are removed via cascade delete.
* **Response Shape**: `{"message": "Candidate deleted successfully"}`
* **AI Invocation**: No (database transaction).

---

### Job Descriptions Router (`/jds`)

#### 1. `POST /jds`
* **Description**: Creates a new Job Description.
* **Request Shape (`JDCreate`)**:
  ```json
  {
    "title": "Backend Developer",
    "company": "Fidelity Systems",
    "description": "Looking for a developer skilled in Python, SQL, and API integration...",
    "required_skills": ["Python", "PostgreSQL", "REST APIs"],
    "experience_required": "2+ years"
  }
  ```
* **Response Shape (`JDOut`)**:
  ```json
  {
    "id": "2fa85f64-5717-4562-b3fc-2c963f66afa4",
    "title": "Backend Developer",
    "company": "Fidelity Systems",
    "description": "Looking for a developer skilled in Python, SQL, and API integration...",
    "required_skills": ["Python", "PostgreSQL", "REST APIs"],
    "experience_required": "2+ years",
    "created_at": "2026-06-18T06:00:00Z"
  }
  ```
* **AI Invocation**: No (database query).

#### 2. `GET /jds`
* **Description**: Lists all job descriptions, sorted by creation date descending.
* **Response Shape**: `List[JDOut]`
* **AI Invocation**: No (database query).

#### 3. `GET /jds/{jd_id}`
* **Description**: Retrieves a specific Job Description.
* **Response Shape**: `JDOut`
* **AI Invocation**: No (database query).

#### 4. `DELETE /jds/{jd_id}`
* **Description**: Removes the target JD, cascade-deleting matching records associated with it.
* **Response Shape**: `{"message": "Job description deleted successfully"}`
* **AI Invocation**: No (database transaction).

---

### Matching Router (`/match`)

#### 1. `POST /match`
* **Description**: Evaluates a candidate against a JD.
* **Query Params**: `force` (`bool`, default `false`). Set to `true` to bypass cached match results.
* **Request Shape (`MatchRequest`)**:
  ```json
  {
    "candidate_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "jd_id": "2fa85f64-5717-4562-b3fc-2c963f66afa4"
  }
  ```
* **Response Shape (`MatchRecordOut`)**:
  ```json
  {
    "id": "1fa85f64-5717-4562-b3fc-2c963f66afa2",
    "candidate_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "jd_id": "2fa85f64-5717-4562-b3fc-2c963f66afa4",
    "match_score": 85.0,
    "matched_skills": ["Python"],
    "missing_skills": ["PostgreSQL", "REST APIs"],
    "bonus_skills": ["FastAPI", "React"],
    "reasoning": "Candidate matches Python experience. However, there are gaps in PostgreSQL...",
    "rank": 1,
    "shortlist_status": "Interview Ready",
    "created_at": "2026-06-18T06:00:00Z"
  }
  ```
* **AI Invocation**: Dependent. Checks database cache. If missing or if `force=true`, invokes the LLM client.

#### 2. `POST /match/bulk`
* **Description**: Evaluates multiple candidates against a JD sequentially.
* **Query Params**: `force` (`bool`, default `false`).
* **Request Shape (`BulkMatchRequest`)**:
  ```json
  {
    "candidate_ids": [
      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "4fa85f64-5717-4562-b3fc-2c963f66afa8"
    ],
    "jd_id": "2fa85f64-5717-4562-b3fc-2c963f66afa4"
  }
  ```
* **Response Shape**: `List[MatchRecordOut]`
* **AI Invocation**: Dependent. Checks database cache. If missing or if `force=true`, invokes the LLM client.

#### 3. `GET /match/jd/{jd_id}`
* **Description**: Returns candidates matched to a JD, sorted by matching rank ascending (1 being the top candidate).
* **Query Params (Optional Filters)**: 
  - `branch` (`str`): Filter by educational background (case-insensitive substring).
  - `gender` (`str`): Filter by gender.
  - `score_min` (`float`): Minimum match score limit.
  - `score_max` (`float`): Maximum match score limit.
* **Response Shape**: `List[RankedCandidateOut]` where each item is:
  ```json
  {
    "candidate": { "id": "UUID", "name": "..." },
    "match": { "id": "UUID", "match_score": 85.0, "rank": 1, "shortlist_status": "..." }
  }
  ```
* **AI Invocation**: No (database query).

#### 4. `GET /match/{candidate_id}/{jd_id}`
* **Description**: Gets the matching details for a candidate-JD pair.
* **Response Shape**: `MatchRecordOut`
* **AI Invocation**: No (database query).

#### 5. `PATCH /match/{candidate_id}/{jd_id}/remarks`
* **Description**: Updates recruiters' interview remarks and status/outcome for a candidate under a specific JD.
* **Request Shape (`MatchRemarksUpdate`)**:
  ```json
  {
    "remarks": "Excellent communicator, scheduled round 2.",
    "outcome": "Interviewed"
  }
  ```
* **Response Shape**: `MatchRecordOut`
* **AI Invocation**: No (database transaction).

---

### Compare Router (`/compare`)

#### 1. `POST /compare`
* **Description**: Compares candidate details side-by-side.
* **Request Shape (`CompareRequest`)**:
  ```json
  {
    "candidate_ids": [
      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "4fa85f64-5717-4562-b3fc-2c963f66afa8"
    ],
    "jd_id": "2fa85f64-5717-4562-b3fc-2c963f66afa4"
  }
  ```
* **Response Shape (`CompareOut`)**:
  ```json
  {
    "jd": { "id": "UUID", "title": "..." },
    "candidates": [
      {
        "candidate": { "id": "UUID", "name": "Jane Doe" },
        "match_score": 85.0,
        "rank": 1,
        "shortlist_status": "Interview Ready",
        "matched_skills": ["Python"],
        "missing_skills": ["PostgreSQL"],
        "bonus_skills": ["React"],
        "reasoning": "...",
        "extracted_skills": ["Python", "React"],
        "extracted_experience": [],
        "extracted_education": []
      }
    ]
  }
  ```
* **AI Invocation**: No (database query).

---

### System Utilities

#### 1. `GET /settings`
* **Description**: Exposes active model details and host database URLs (redacting credentials).
* **Response Shape**: `{"openrouter_model": "google/gemini-2.5-flash", "database_url": "db:5432/talentlens"}`
* **AI Invocation**: No.

#### 2. `GET /health`
* **Description**: API health check.
* **Response Shape**: `{"status": "ok"}`
* **AI Invocation**: No.

---

## 7. Key Design Decisions and Tradeoffs

### Tradeoff 1: Sequential vs Parallel Bulk Matching
* **Decision**: Bulk matching evaluations (`/match/bulk`) execute sequentially in a loop.
* **Code Implementation**:
  ```python
  # backend/routers/match.py
  for candidate_id in data.candidate_ids:
      try:
          record = await _run_single_match(candidate_id, data.jd_id, db, force=force)
          results.append(record)
      except HTTPException:
          continue
  ```
* **Tradeoff Analysis**:
  - *Parallel execution* (e.g., using `asyncio.gather`) would process evaluations faster.
  - However, parallel execution risks hitting API rate limits (HTTP 429) on OpenRouter and underlying cloud providers, as well as concurrency limits on Postgres connection pools. Sequential execution guarantees reliable processing and graceful recovery, returning successfully completed matches even if subsequent matches fail.

### Tradeoff 2: LLM-Only Structure Extraction
* **Decision**: Candidate profile extraction is handled exclusively by the LLM, without regex preprocessing.
* **Tradeoff Analysis**:
  - *Regex-based extractors* are faster and cost-free, but they are fragile. Resume contact layouts, phone extensions, and degree names vary widely.
  - Relying on the LLM's semantic understanding allows the system to parse varied layouts, extract field branches, and group academic majors (e.g. mapping "Bachelor of Engineering in CS" to "Computer Science") reliably, justifying the higher API token costs.

### Tradeoff 3: PostgreSQL vs MongoDB
* **Decision**: PostgreSQL was chosen as the system database.
* **Tradeoff Analysis**:
  - MongoDB fits unstructured resumes due to its document-oriented storage.
  - However, recruiting workflows rely on relational operations (e.g. mapping candidates to leaderboards, filtering by JD, managing cascade deletions on deletions). PostgreSQL provides ACID compliance, structured schemas, foreign key constraints, and native JSON columns, offering both document flexibility and relational reliability.

### Tradeoff 4: Result Caching at the Database Layer
* **Decision**: Match results are cached directly in PostgreSQL rather than using an in-memory cache (like Redis).
* **Code Implementation**:
  ```python
  # backend/routers/match.py
  if not force:
      existing = db.query(MatchRecord).filter(...).first()
      if existing:
          return existing
  ```
* **Tradeoff Analysis**:
  - This avoids the overhead of managing a separate Redis instance and cache eviction policy.
  - Because resumes and JDs are mostly static, caching match evaluations in PostgreSQL provides low latency (under 5ms) without data synchronization overhead, requiring recalculation only when explicitly triggered via the UI's `force` parameter.

### Tradeoff 5: OpenRouter API over Local Ollama
* **Decision**: The system routes queries through OpenRouter (specifically pinned to Google Vertex / Gemini 2.5 Flash Lite) rather than running Ollama locally.
* **Code Implementation**:
  ```python
  # backend/services/llm_client.py
  extra_body={
      "provider": {
          "order": ["Google Vertex"],
          "allow_fallbacks": False,
      }
  }
  ```
* **Tradeoff Analysis**:
  - Running Ollama locally is cost-free and handles data privately.
  - However, local model inference is resource-intensive and requires high-performance GPUs. Cloud-hosted models (like Gemini 2.5 Flash Lite) provide higher JSON conformance, faster response times, and lower resource requirements for the hosting server.

### Tradeoff 6: Browser `window.print()` over `html2canvas` for PDF Generation
* **Decision**: PDF generation uses browser-native print layouts instead of client-side canvas rendering.
* **Code Implementation**:
  ```tsx
  // frontend/app/compare/page.tsx
  const handlePrint = () => { window.print(); };
  ```
* **Tradeoff Analysis**:
  - Canvas libraries like `html2canvas` generate PDFs as static images, which increases file size and makes text unselectable.
  - Relying on native browser printing via media queries keeps text vector-sharp, preserves selectable text, and generates compact PDFs natively.

### SOLID Principles Application
1. **Single Responsibility Principle (SRP)**:
   - File parsers are isolated in `extractor.py`.
   - LLM interactions are isolated in `llm_client.py`.
   - Ranking logic is isolated in `ranker.py`.
   - Database operations are segregated into resource-specific routers.
2. **Open/Closed Principle (OCP)**:
   - `extractor.py` is open to new formats (e.g., adding image OCR support) without modifying the parsing logic for other formats.
3. **Liskov Substitution Principle (LSP) & Interface Segregation Principle (ISP)**:
   - Adhered to via FastAPI's dependency injection system (e.g. `Depends(get_db)`). This allows database sessions to be swapped during testing without modifying router code.

### Dependency Inversion Application
* **Implementation details**:
  - Routers depend on abstractions (functions like `score_match` or `extract_text`) rather than direct database drivers or API clients.
  - While there is no formal OOP `AIProvider` base class, dependency inversion is implemented procedurally through modular service boundaries. Routers interact with clean service function interfaces, allowing underlying libraries (like OpenRouter or local parsers) to be updated without modifying API controllers.

---

## 8. Scaling Considerations

### 1. Celery + Redis for Background Task Queuing
* **The Limit**: Uploading many resumes synchronously blocks FastAPI worker threads, leading to client timeouts.
* **Scaling Strategy**:
  - Implement a Celery task queue with a Redis message broker.
  - The API endpoint immediately returns a task ID upon upload, offloading text extraction and LLM calls to Celery worker instances:
  ```python
  # Example scaling task routing
  @app.post("/candidates/upload")
  async def upload_async(file: UploadFile):
      task = process_resume_task.delay(file.filename, await file.read())
      return {"task_id": task.id, "status": "queued"}
  ```

### 2. Database Indexing Strategy
To optimize query performance for large candidate databases:
```sql
-- Indexes for candidate lookups and leaderboard rendering
CREATE INDEX idx_match_records_jd_score ON match_records(jd_id, match_score DESC);
CREATE INDEX idx_match_records_candidate ON match_records(candidate_id);
CREATE INDEX idx_ai_analysis_candidate ON ai_analysis(candidate_id);

-- GIN index for fast partial matches on candidate names and emails
CREATE INDEX idx_candidates_search_text ON candidates USING gin(to_tsvector('english', name || ' ' || email));
```

### 3. Implementing Authentication & Security
To secure system endpoints:
* Introduce a `users` table and implement JWT-based authentication:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
* Protect endpoints using FastAPI's dependency injection:
```python
# Securing candidates uploads
@router.post("/upload")
async def upload_resume(file: UploadFile, current_user: User = Depends(get_current_active_user)):
    ...
```

### 4. Handling 10,000+ Resumes
To manage large candidate databases:
* **Initial Embedding Search**: Generate text embeddings for candidate resumes and job descriptions. Use vector search (e.g., via `pgvector`) to retrieve the top 100 candidate profiles before running detailed LLM evaluations.
* **Batch Processing**: Use cursor-based pagination to process candidate matches in batches.
* **Blob Storage**: Offload PDF and image files to object storage (like AWS S3) rather than storing large binary objects in PostgreSQL.

---

## 9. Project Structure

An annotated layout of the TalentLens codebase:

```
talentlens/
├── backend/
│   ├── main.py               # FastAPI entry point. Configures routers, health routes, and CORS middleware.
│   ├── models.py             # SQLAlchemy models defining schema mappings (candidates, job_descriptions, ai_analysis, match_records).
│   ├── schemas.py            # Pydantic schemas validating input payloads, response serialization structures, and models.
│   ├── database.py           # Database connection manager. Sets up engines, SessionLocal, and get_db dependencies.
│   ├── config.py             # BaseSettings configuration loader reading from environment files.
│   ├── requirements.txt      # Backend library dependencies.
│   ├── Dockerfile            # Multi-stage Docker build file containing Tesseract OCR and Poppler binaries.
│   ├── routers/
│   │   ├── candidates.py     # Endpoints for candidate uploads, lists, details, and deletion.
│   │   ├── jds.py            # Endpoints for job description creation, listing, and deletion.
│   │   ├── match.py          # Coordinates single matching, bulk matching, and leaderboard records.
│   │   └── compare.py        # Exposes endpoint for retrieving side-by-side candidate evaluations.
│   └── services/
│       ├── extractor.py      # Core parser for PDF, DOCX, and images (featuring scanned document fallbacks).
│       ├── llm_client.py     # OpenRouter connection wrappers, retry logic, and prompts.
│       └── ranker.py         # Updates candidate ranking metrics descending by score for JDs.
└── frontend/
    ├── app/
    │   ├── page.tsx          # Dashboard containing statistics, job lists, and candidate summaries.
    │   ├── layout.tsx        # Application entry layout. Sets up themes, HTML tags, and metadata elements.
    │   ├── globals.css       # Core stylesheets configuring theme colors, margins, and custom components.
    │   ├── upload/
    │   │   └── page.tsx      # Drop zone uploader managing queue lists and toast notifications.
    │   ├── jd/
    │   │   ├── create/
    │   │   │   └── page.tsx  # Interactive form for creating job descriptions.
    │   │   └── [id]/
    │   │       └── page.tsx  # Candidate leaderboard displaying matches, scores, and rankings.
    │   ├── candidate/
    │   │   └── [id]/
    │   │       └── jd/
    │   │           └── [jd_id]/
    │   │               └── page.tsx # Detailed view of candidate fit metrics.
    │   ├── compare/
    │   │   └── page.tsx      # Side-by-side candidate comparison matrix.
    │   └── settings/
    │       └── page.tsx      # Configures Obsidian/Fidelity themes and displays active model settings.
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx # Grid template formatting sidebar placement.
    │   │   └── Sidebar.tsx   # Sidebar component for navigating application routes.
    │   └── ui/
    │       ├── InitialAvatar.tsx # Render initials inside circles for candidates.
    │       ├── ScoreBadge.tsx    # Display scores styled with conditional colors.
    │       ├── SkillTag.tsx      # Badges for matching, missing, or bonus skills.
    │       └── StatusPill.tsx    # Render shortlist tags (Interview Ready, Skill Gap, Not Suitable).
    ├── lib/
    │   ├── api.ts            # Client interface mapping frontend functions to backend endpoints.
    │   ├── types.ts          # TypeScript types mapping backend Pydantic models.
    │   └── utils.ts          # Styling helper wrapper combining classnames and Tailwind styles.
    ├── tailwind.config.ts    # Tailwind styling variables.
    ├── package.json          # Frontend dependencies and Next.js scripts.
    └── Dockerfile            # Multi-stage Docker build file compiling Next.js standalone outputs.
```

---

## 10. Setup Instructions

### Environment Variables (`.env`)
Create a `.env` file in the project root folder:
```env
# OpenRouter Credentials
OPENROUTER_API_KEY=sk-or-v1-your-key-here
# AI Model Selection (pushed to Google Vertex)
OPENROUTER_MODEL=google/gemini-2.5-flash

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/talentlens

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
```

### Running with Docker Compose
1. Build and run containers in detached mode:
   ```bash
   docker compose up --build -d
   ```
2. Confirm the containers are running and healthy:
   ```bash
   docker compose ps
   ```
3. Access the applications:
   - **Frontend Interface**: `http://localhost:3001`
   - **Backend API Docs**: `http://localhost:8001/docs`

### First-Run Walkthrough
1. **Create JD**: Navigate to `http://localhost:3001/jd/create` and create a Job Description (e.g. "Python Developer").
2. **Upload Resumes**: Go to `http://localhost:3001/upload`. Choose the newly created JD from the dropdown to automatically run matching after extraction. Upload resume PDFs, Word docs, or images.
3. **Inspect Leaderboard**: Go back to the Dashboard and open the JD view. Confirm that the candidates are ranked based on their calculated match score.
4. **Print / Share Report**: Check 2-3 candidates, click **Compare Selected**, and click **Share Comparison Report** to save the comparison layout as a PDF.
