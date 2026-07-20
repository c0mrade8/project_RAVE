import os
import json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult

# Import request validation schemas
from models.schemas import RankRequest, ChatRequest, ChatResponse
from tasks import run_discovery_pipeline

CANDIDATE_POOL = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global CANDIDATE_POOL
    
    POSSIBLE_PATHS = [
        Path("/app/data/candidates.jsonl"),
        Path("/project_RAVE/pae_backend/data/candidates.jsonl"),
        Path("/project_RAVE/data/candidates.jsonl"),
        Path("./data/candidates.jsonl"),
        Path(__file__).parent / "data" / "candidates.jsonl"
    ]
    
    print("\n--- [LIFESPAN] INITIALIZING DATASTREAM INGESTION ---", flush=True)
    
    file_found = False
    for path in POSSIBLE_PATHS:
        print(f"[LIFESPAN] Checking path visibility: {path}", flush=True)
        if path.exists():
            file_found = True
            try:
                print(f"[LIFESPAN] Found dataset at {path}. Streaming rows...", flush=True)
                pool_build = []
                
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line in ["[", "]", ","]:
                            continue
                        if line.endswith(","):
                            line = line[:-1].strip()
                        try:
                            pool_build.append(json.loads(line))
                        except Exception:
                            continue
                            
                CANDIDATE_POOL = pool_build
                print(f"[LIFESPAN SUCCESS] Successfully loaded {len(CANDIDATE_POOL)} candidates into memory!\n", flush=True)
                break
            except Exception as e:
                print(f"[LIFESPAN ERROR] Exception reading {path}: {e}", flush=True)
                
    if not file_found:
        print("[LIFESPAN WARNING] candidates.jsonl could not be located anywhere in the mount architecture.\n", flush=True)
        
    yield  # The application runs while this yield is active
    print("[LIFESPAN] Shutting down application context...", flush=True)

# Register the lifespan context manager into FastAPI
app = FastAPI(
    title="RedRob Equitable Candidate Discovery API",
    description="Anti-monoculture AI recruiter with Celery & Redis Orchestration",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "RedRob Equitable Discovery API",
        "status": "running",
        "pool_size": len(CANDIDATE_POOL),
        "engine": "FastAPI + Celery + Redis"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "candidates_loaded": len(CANDIDATE_POOL)}


# ----------------------------------------------------------------------
# ASYNC PIPELINE ENDPOINTS
# ----------------------------------------------------------------------

@app.post("/api/rank")
async def rank_candidates(req: RankRequest):
    """
    Ingests the job description, chooses the candidate pool, and pushes
    the workload to Redis. Returns instantly with a task ID.
    """
    dataset_path = "/app/data/candidates.jsonl"
    
    if not os.path.exists(dataset_path):
        raise HTTPException(status_code=400, detail="Dataset file not visible to backend.")

    task = run_discovery_pipeline.delay(
        job_description=req.job_description,
        dataset_path=dataset_path,
        weights=req.weights or {},
        guardrails=req.equity_guardrails or {}
    )

    return {
        "task_id": task.id,
        "status": "processing",
        "message": "Discovery pipeline triggered in background."
    }


@app.get("/api/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Polling target for backend state updates.
    """
    task_result = AsyncResult(task_id)
    
    if task_result.state == "PENDING":
        return {
            "state": task_result.state,
            "status": "Processing signals and running equity audits..."
        }
    
    elif task_result.state == "SUCCESS":
        return {
            "state": task_result.state,
            "data": task_result.result
        }
        
    elif task_result.state == "FAILURE":
        return {
            "state": task_result.state,
            "error": str(task_result.info)
        }
    
    return {"state": task_result.state}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_about_candidate(req: ChatRequest):
    """
    Synchronous conversation endpoint for real-time manager interaction.
    """
    # FIXED: Aligned target key query lookup with schema data mapping footprint ('candidate_id')
    candidate = next(
        (c for c in CANDIDATE_POOL if str(c.get("candidate_id", c.get("id"))) == str(req.candidate_id)), 
        None
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found across loaded pool.")

    from services.jd_parser import _fallback_jd_parse
    from services.scorer import score_candidate
    from services.ai_chat import chat_with_candidate

    jd_intel = _fallback_jd_parse(req.job_description)
    scores = score_candidate(candidate, jd_intel, {})

    return await chat_with_candidate(
        candidate=candidate,
        question=req.question,
        job_description=req.job_description,
        conversation_history=req.conversation_history,
        signal_scores=scores.model_dump(),
    )