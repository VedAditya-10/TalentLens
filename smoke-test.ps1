# TalentLens smoke test - exercises OpenRouter end-to-end through the backend
# Run from PowerShell:  powershell -ExecutionPolicy Bypass -File .\smoke-test.ps1

$ErrorActionPreference = "Stop"
$Api = "http://localhost:8001"

function Step($n, $msg) { Write-Host "" ; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host ("    OK: " + $msg) -ForegroundColor Green }
function Fail($msg)     { Write-Host ("    FAIL: " + $msg) -ForegroundColor Red ; exit 1 }

# 0. Backend reachable
Step 0 ("Checking backend on " + $Api + " ...")
try {
  $jds = Invoke-RestMethod -Uri ($Api + "/jds") -Method Get -TimeoutSec 5
  Ok ("Backend responded with " + (@($jds).Count) + " existing JDs")
} catch {
  Fail "Cannot reach backend. Is the docker container up? Try: docker ps | findstr talentlens"
}

# 1. Create a JD
Step 1 "Creating test JD ..."
$jdBody = '{"title":"Smoke Test Engineer","description":"Test role for verifying OpenRouter wiring. Looking for Python and FastAPI experience.","required_skills":["Python","FastAPI"]}'
$jd = Invoke-RestMethod -Method Post -Uri ($Api + "/jds") -ContentType "application/json" -Body $jdBody
$jdId = $jd.id
Ok (("Created JD id=" + $jdId) + (" title='" + $jd.title + "'"))

# 2. List existing candidates
Step 2 "Listing candidates ..."
$candidates = Invoke-RestMethod -Uri ($Api + "/candidates") -Method Get
$n = @($candidates).Count
Ok (("Found " + $n) + " candidate(s) in DB")
if ($n -eq 0) {
  Write-Host "    No candidates yet - upload a PDF at http://localhost:3000/upload first, then re-run." -ForegroundColor Yellow
  exit 0
}
$candidateId = $candidates[0].id
Ok (("Using first candidate id=" + $candidateId) + (" name='" + $candidates[0].name + "'"))

# 3. Run match (real OpenRouter call)
Step 3 "Running match against OpenRouter (LLM call - may take 3-10s) ..."
$matchObj = @{ candidate_id = $candidateId; jd_id = $jdId }
$matchBody = $matchObj | ConvertTo-Json -Compress
try {
  $match = Invoke-RestMethod -Method Post -Uri ($Api + "/match") -ContentType "application/json" -Body $matchBody -TimeoutSec 60
} catch {
  $err = $_.Exception.Message
  Fail (("Match call failed: " + $err) + " - hint: try: docker restart talentlens-backend-1")
}

Ok "Match returned!"
Write-Host ("    match_score       = " + $match.match_score)
Write-Host ("    matched_skills    = " + ($match.matched_skills -join ", "))
Write-Host ("    missing_skills    = " + ($match.missing_skills -join ", "))
Write-Host ("    shortlist_status  = " + $match.shortlist_status)
if ($match.reasoning) {
  $r = $match.reasoning
  if ($r.Length -gt 140) { $r = $r.Substring(0, 140) }
  Write-Host ("    reasoning         = " + $r + "...")
}

Write-Host ""
Write-Host "[SUCCESS] OpenRouter is fully wired through the backend." -ForegroundColor Green
