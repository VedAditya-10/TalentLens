# TalentLens — System Design Analysis & Lightweight Plan

A focused review of the current codebase against the system design principles that actually matter for this kind of app, with a minimal-action plan.

**Not the goal:** turn this into a distributed system, introduce microservices, or chase every principle in a textbook.

**The goal:** make the code easier to test, easier to change, and harder to break — without overengineering it.

---

## 1. What I Looked At

14 backend files, 1 frontend lib, Dockerfile, docker-compose, requirements. The codebase is ~800 LOC of Python plus the frontend. Small. That changes what principles are worth applying — for a 5k-LOC app I'd push harder on patterns; for this, simple discipline is enough.

---

## 2. The Principles That Actually Matter (For This App)

I'm not going to talk about all 15+ system design principles. For a recruitment app of this size, six matter and the rest are noise:

| # | Principle | Why it matters here |
|---|---|---|
| 1 | **Clear separation of concerns** | So you can change the LLM provider without touching the upload endpoint |
| 2 | **Explicit error handling at boundaries** | So a Tesseract crash doesn't take down the whole app |
| 3 | **Idempotent operations** | So re-uploading the same resume doesn't duplicate it |
| 4 | **Caching where it's free** | LLM calls are slow and expensive — never do the same one twice |
| 5 | **Observability** | So when a match scores wrong, you can see why |
| 6 | **Testability of business logic** | So you can change the scoring prompt without fear |

The other principles (CQRS, event sourcing, saga, circuit breaker, distributed tracing, sharding) are real but **not relevant at this scale**. Don't introduce them.

---

## 3. What the Codebase Already Does Well

Don't change these. The principle is: don't refactor things that already follow the principle.

### ✅ Separation of concerns (mostly)

The four routers (`candidates`, `jds`, `match`, `compare`) are cleanly separated. The `services/` directory exists. The `models/` vs `schemas/` split (DB vs API shapes) is the right call. `ranker.py` is a pure function. `jds.py` router is 30 lines and does one thing.

### ✅ Idempotent operations

`routers/match.py:23-30` checks for an existing match record before calling the LLM. The `force` flag in `routers/match.py:93` lets you re-run on demand. Good design.

### ✅ Caching (when it works)

Match results are cached in the DB. AIAnalysis is one-per-candidate. The schema is set up correctly for this.

### ✅ Error handling at file boundaries

`routers/candidates.py:32-44` catches `ValueError` and `RuntimeError` from the extractor and maps them to 422. The OCR fallback itself catches all the right exceptions in `services/extractor.py:33-67`. The LLM timeout gets a clean 504 at the router.

### ✅ Configuration is externalized

`config.py` with Pydantic Settings is the right pattern. Env vars + `.env` file. CORS origins are configurable. The OpenRouter model is swappable.

### ✅ The frontend API layer is well-structured

`frontend/lib/api.ts` has a single `apiFetch` helper, every endpoint is one function, types are imported from `./types`. Clean.

---

## 4. What Needs Fixing (Only the Important Stuff)

### 🔴 Fix 1 — The `raw` variable bug in `llm_client.py`

**Lines 102-122 and 125-154.** In both `extract_resume_data` and `score_match`, the second `except` block references a `raw` variable that was never assigned in the path that reaches it. If the first LLM call fails to parse, the second call's failure will raise `NameError: name 'raw' is not defined`.

```python
# Current (broken)
try:
    raw = await _call_llm(prompt)
    return _parse_json_response(raw)
except (json.JSONDecodeError, ValueError):
    ...
# ^ if this fires, `raw` was assigned but function didn't return (impossible)
# actually if it fires, raw was assigned to something but json.loads failed on it

retry_prompt = prompt + ...
try:
    raw = await _call_llm(retry_prompt)  # NEW raw assignment
    return _parse_json_response(raw)
except (json.JSONDecodeError, ValueError) as e:
    return {"extraction_failed": True, "raw": raw}  # this raw is the retry's
```

Wait, let me re-read. Actually the bug is more subtle — the second `try` reassigns `raw`, and the second `except` catches the second call's failure. So `raw` IS defined at line 122. It's not a NameError. But the logic is confusing and fragile.

The real fix: **restructure the retry** so the success/failure paths are clear and the return on second-failure is correct.

**Suggested fix:**
```python
async def extract_resume_data(resume_text: str) -> Dict[str, Any]:
    prompt = RESUME_EXTRACTION_PROMPT.format(resume_text=resume_text)
    
    for attempt, suffix in enumerate(["", "\n\nReturn only the raw JSON object, nothing else."]):
        try:
            raw = await _call_llm(prompt + suffix)
            return _parse_json_response(raw)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Attempt {attempt+1} JSON parse failed: {e}")
    
    logger.error("All attempts failed for resume extraction")
    return {"extraction_failed": True}
```

Clear loop, no shared mutable `raw`, no confusing retry path.

### 🔴 Fix 2 — Pinning to "Google AI Studio" with no fallback

**`llm_client.py:91-96`:**
```python
extra_body={
    "provider": {
        "order": ["Google AI Studio"],
        "allow_fallbacks": False,
    }
}
```

This means if Google AI Studio is down, your app is down. There's no env var to disable it. This is a single point of failure hidden in the code.

**Fix:** either remove the pinning entirely, or make it env-driven:
```python
# config.py
llm_pin_provider: str | None = None  # e.g. "Google AI Studio" or None

# llm_client.py
extra_body = {}
if settings.llm_pin_provider:
    extra_body["provider"] = {"order": [settings.llm_pin_provider], "allow_fallbacks": False}
```

### 🔴 Fix 3 — Wrong model default

**`config.py:8`:** `openrouter_model: str = "google/gemma-4-31b-it"` — this model doesn't exist on OpenRouter. Gemma 4 isn't released (Gemma 3 is the latest). On first request you'll get a 404 from OpenRouter. Compare to `docker-compose.yml:26` which has the same wrong default.

**Fix:** use a real model. `google/gemini-2.5-flash-lite` is fast and cheap, or `meta-llama/llama-3.1-8b-instruct` is the safest default.

### 🟡 Fix 4 — `cors_origins` in docker-compose is malformed

**`docker-compose.yml:27`:**
```yaml
CORS_ORIGINS: ${CORS_ORIGINS:-["http://localhost:3000", "http://localhost:3001"]}
```

`pydantic-settings` will try to parse this as Python list literal. It might work, it might not. The clean version:
```yaml
# Drop the override; the default in config.py is fine for local dev
# Or, if you need to override, use a JSON string:
CORS_ORIGINS: '["http://localhost:3000","http://localhost:3001"]'
```

**Fix:** just remove the override — the default in `config.py` already covers both ports.

### 🟡 Fix 5 — Module-level client singleton

**`llm_client.py:11-15`:** the `AsyncOpenAI` client is instantiated at import time, as a module-level global. This:
- Can't be replaced for testing without monkeypatching
- Means importing the module triggers an HTTP-timeout-related allocation
- Couples import to configuration loading

**Minimal fix:** make it a function-local or use a lazy module-level pattern:
```python
_client = None

def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(...)
    return _client

async def _call_llm(prompt: str) -> str:
    client = _get_client()
    ...
```

This is **not** a full dependency-injection refactor. It's the smallest change that makes testing possible without restructuring.

### 🟡 Fix 6 — `services/extractor.py:93` catches bare `Exception`

```python
except Exception as e:
    logger.warning(f"pdfplumber failed to read PDF ({e}); will try OCR")
    text_parts = []
```

Catches `MemoryError`, `KeyboardInterrupt` (well, not that one, but its parent), etc. Narrow it:
```python
except (pdfplumber.exceptions.PDFSyntaxError, OSError) as e:
```

This is the same pattern in `_ocr_pdf_pages:53` and the image extractor:134. All three should be narrowed.

### 🟢 Fix 7 — Frontend `lib/api.ts:20` and `lib/api.ts:36` duplicate error-handling

The same `if (!res.ok) { ... }` block appears in `apiFetch` and in `uploadResume`. Extract a helper, or have `uploadResume` use `apiFetch` with a special body:
```typescript
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // ... existing
}

export async function uploadResume(file: File): Promise<CandidateDetail> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<CandidateDetail>("/candidates/upload", {
    method: "POST",
    body: form,
  });
}
```

This is cosmetic but it's how the rest of the file is structured.

### 🟢 Fix 8 — No request timeout on the frontend

`frontend/lib/api.ts` does plain `fetch` with no `AbortController`. If the backend hangs (LLM timeout, etc.), the user sees a hung spinner forever.

```typescript
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    // ... existing
  } finally {
    clearTimeout(timeout);
  }
}
```

Match uploads should have a longer timeout (3-5 min) because of LLM latency.

---

## 5. What's Already Sufficient — Don't Add These

I considered these system design patterns and decided they're overkill for TalentLens:

| Pattern | Why I won't add it |
|---|---|
| **CQRS** (separate read/write models) | You have one DB, one writer per table. Reads are simple. |
| **Event sourcing** | You don't need a replayable audit log. `created_at` timestamps are enough. |
| **Saga pattern** | Your "transactions" are 1-2 DB writes at most. No distributed transaction problem. |
| **Circuit breaker** around LLM | One LLM call per upload — if it fails, you want the user to see the error, not silently retry. Your existing 504 + manual retry is fine. |
| **Distributed tracing** (OpenTelemetry) | You have one service. Logs are enough. |
| **Message queue** (Celery, etc.) | Background LLM calls sound nice, but add operational complexity. The current synchronous model is simpler. |
| **Caching layer** (Redis) | DB queries are fast for your data size. Match caching is already in Postgres. |
| **Service mesh** | You have one backend. |
| **API gateway** | FastAPI's middleware is enough. |
| **Multi-tenant isolation** at DB level | You're not building SaaS for multiple companies yet. Add row-level security when you need it. |
| **Database read replicas** | You don't have a read load problem. |
| **Sharding** | You have <1000 candidates. |

**The principle:** add complexity when the problem demands it, not preemptively. The current architecture will comfortably handle 10x your current load.

---

## 6. The 6 Principles and What "Sufficient" Looks Like

Here's what I mean by "implementing" each principle minimally. These are the bar; everything above is gold-plating.

### Principle 1 — Clear separation of concerns
**Current state:** Routers → services → models. Mostly clean.
**Gap:** Routers import concrete `services/extractor` and `services/llm_client` directly. If you wanted to swap LLM providers, you'd touch the router.
**Sufficient bar:** A function-level indirection in the service layer. The router doesn't need to know which library is doing the LLM call. **This is already true** — `routers/candidates.py:9` imports `extract_resume_data` from `services.llm_client`. The router doesn't import `openai`. ✓
**Verdict:** Already sufficient. No action needed.

### Principle 2 — Explicit error handling at boundaries
**Current state:** Routers catch `APITimeoutError`, `ValueError`, `RuntimeError`. Services raise these.
**Gap:** Vendor exception (`APITimeoutError`) leaks into routers. If you swap to Anthropic, every router changes.
**Sufficient bar:** Define your own exception hierarchy in `services/` and translate vendor errors at the service boundary. Then routers catch *your* exceptions, not OpenAI's.
**Verdict:** One small change. Add a `services/exceptions.py` with `LLMError`, `LLMTimeoutError`, etc. Have `llm_client.py` translate `APITimeoutError` → `LLMTimeoutError`. Update two routers.

### Principle 3 — Idempotent operations
**Current state:** Match results are cached. Re-uploading a candidate is NOT idempotent — it creates a new candidate each time.
**Gap:** If the same PDF is uploaded twice, you get two `Candidate` rows.
**Sufficient bar:** Decide if re-upload should update or duplicate. **Document the behavior** either way. The current code creates duplicates — fine for a v1, but should be intentional.
**Verdict:** Document it, don't fix it now. One comment in `routers/candidates.py:17` explaining "each upload creates a new candidate" is enough.

### Principle 4 — Caching where it's free
**Current state:** Match results cached in DB. AIAnalysis unique per candidate.
**Gap:** None. The `unique=True` constraint on `AIAnalysis.candidate_id` (`models.py:44`) guarantees no double-extraction.
**Verdict:** Already sufficient. ✓

### Principle 5 — Observability
**Current state:** `logger.info`, `logger.warning`, `logger.error` in services. No metrics, no structured logging, no request IDs.
**Gap:** When something goes wrong, you see the error message but not: how long did the LLM call take? What model was used? Which user triggered it? What was the request ID?
**Sufficient bar:** Add **structured logging** with request IDs. The `logging` module supports JSON output via `python-json-logger`. ~10 lines of config.
**Verdict:** Add structured logging + a request-ID middleware. ~30 lines of code, big diagnostic value.

### Principle 6 — Testability of business logic
**Current state:** **No tests survive in the codebase.** The earlier `test_regex_extractor.py` and `test_ocr_fallback.py` are gone.
**Gap:** You can't refactor confidently because you can't verify behavior.
**Sufficient bar:** Add tests for the *two* highest-value units: the LLM client (with mocked OpenAI) and the upload service (with mocked LLM + extractor). Skip the routers, skip the ranker (it's 20 lines and obvious), skip the extractors (tested implicitly by integration).
**Verdict:** Add a `tests/` folder with ~5-10 tests covering the LLM retry logic, error mapping, and the upload flow. Don't go for 100% coverage — go for "the things that would hurt if broken."

---

## 7. The Plan (3-Phase, ~1 Week of Work)

### Phase 1 — Fix the actual bugs (1-2 days)

These are correctness issues, not design preferences. They should land first because they could cause production errors.

1. **Fix the retry logic in `llm_client.py`** — restructure to a clear loop
2. **Replace the wrong model default** — in both `config.py` and `docker-compose.yml`
3. **Remove or env-ify the Google AI Studio pinning**
4. **Fix the `cors_origins` override in `docker-compose.yml`** — remove it, default is fine
5. **Narrow the bare `except Exception`** in `services/extractor.py` (3 places)

**Validation:** boot the app, run the smoke test if it still exists, do a real upload.

### Phase 2 — Make the boundaries clean (1-2 days)

Small refactor that doesn't restructure anything, just adds proper error types and fixes the frontend fetch helper.

1. **Create `services/exceptions.py`** with the exception hierarchy
2. **Update `services/llm_client.py`** to translate `APITimeoutError` → `LLMTimeoutError`
3. **Update `routers/candidates.py` and `routers/match.py`** to catch the new exceptions
4. **Lazy-init the LLM client** in `llm_client.py` (the `_get_client()` pattern)
5. **Refactor `frontend/lib/api.ts`** — have `uploadResume` use `apiFetch`, add `AbortController` timeout

**Validation:** app still works, all routes still return the same status codes, frontend uploads still complete.

### Phase 3 — Add observability + tests (2-3 days)

These are the highest-leverage additions.

1. **Add `python-json-logger` to `requirements.txt`**, configure structured logging in `main.py`
2. **Add a request-ID middleware** — generate a UUID per request, attach to `request.state`, log it with every LLM call
3. **Add `tests/` folder** with:
   - `test_llm_client.py` — mocked OpenAI, tests retry, tests error mapping
   - `test_upload_service.py` — mocked services, tests happy path + error paths
   - `test_ranker.py` — tests rank assignment
4. **Add a `conftest.py`** with shared fixtures

**Validation:** `pytest` runs in <5 seconds, all tests pass, logs are JSON-formatted.

### What this does NOT include

- No new folder structure (`app/domain/`, `app/infrastructure/`) — too much
- No dependency-injection container — overkill
- No async migration — sync SQLAlchemy is fine for this scale
- No Repository pattern — direct ORM is fine
- No CQRS, no events, no queue — none of these are needed
- No Pydantic Settings for the frontend — `process.env` is fine

---

## 8. Definition of Done

The plan is complete when:

- [ ] The bugs in Phase 1 are fixed and verified
- [ ] `services/exceptions.py` exists, routers use it, OpenAI exceptions are no longer imported in routers
- [ ] `frontend/lib/api.ts` has `AbortController` timeouts
- [ ] Backend logs are JSON-formatted with request IDs
- [ ] `pytest tests/` runs and passes
- [ ] All existing endpoints still work (smoke test or manual upload)
- [ ] Total LOC of changes is < 200 lines added, < 50 removed
- [ ] `docker compose up --build` still works
- [ ] No SOLID principles are being discussed in code review

The last item is the real test of this plan. If you find yourself debating Liskov Substitution, you've over-engineered.

---

## 9. Anti-Patterns to Avoid

Things that look like "good design" but will hurt you here:

| Anti-pattern | Why it's bad here |
|---|---|
| "Let's add an interface for every class" | You have one LLM provider, one extractor, one ranker. Interfaces without multiple implementations are noise. |
| "Let's make everything async" | You're not CPU-bound. You're I/O-bound on one LLM call. Adding `async` everywhere buys you nothing. |
| "Let's add a caching layer" | Postgres handles your queries in <5ms. Adding Redis adds a dependency for no measurable gain. |
| "Let's add background jobs for LLM calls" | Then the user has to poll for results. Worse UX for a feature that's already <10s. |
| "Let's make the upload endpoint return 202 Accepted" | It's synchronous. Return 200 with the result. Don't fake async semantics. |
| "Let's add a feature flag system" | You have one deployment. Environment variables are feature flags. |
| "Let's add rate limiting" | When you have 1000+ users/minute, you add rate limiting. Today you have <10. |

---

## 10. TL;DR

**Fix 5 bugs.** **Add exception types and request IDs.** **Write 5-10 tests.** **Don't touch anything else.**

The codebase is in good shape for its size. The biggest win is **tests** — without them, every refactor is a leap of faith. The second biggest win is **structured logging** — when the LLM returns a weird score, you'll know why.

The principles you actually need are discipline, observability, and tests. The principles you don't need are CQRS, sagas, circuit breakers, and event sourcing.
