import asyncio
import json
from celery_app import celery_app

# Synchronized imports matching the real service signatures
from services.jd_parser import parse_job_description
from services.scorer import score_candidate, generate_tags, generate_strengths, generate_risks
from services.equity_audit import (
    compute_adverse_impact, 
    compute_monoculture_risk, 
    build_equity_dashboard,
    build_monoculture_analysis,
    compute_systemic_rejection_flag
)

def _sync_runner(coro):
    """Utility to run async Gemini calls inside the sync Celery worker context"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(name="run_discovery_pipeline", bind=True)
def run_discovery_pipeline(self, job_description: str, dataset_path: str, weights: dict, guardrails: dict):
    # Step 1: LLM parses the JD for intent and hidden equity risks
    self.update_state(state='PROCESSING', meta={'step': 'Parsing Job Description'})
    jd_intel = _sync_runner(parse_job_description(job_description))

    # Step 2: Core Loop Scoring and Evaluation Array Processing
    self.update_state(state='PROCESSING', meta={'step': 'Processing Candidate Signals'})
    scored_candidates = []
    
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line in ["[", "]", ","]:
                continue
            if line.endswith(","):
                line = line[:-1].strip()
            
            try:
                c = json.loads(line)
            except Exception:
                continue

            # Core processing loop metrics
            scores = score_candidate(c, jd_intel, weights or {})
            mono_risk_score = compute_monoculture_risk([c])
            mono_level = "low" if mono_risk_score < 30 else ("medium" if mono_risk_score < 55 else "high")
            
            mono_analysis = build_monoculture_analysis(c, mono_risk_score, mono_level)
            systemic_flag = compute_systemic_rejection_flag(c, scores.final_score, mono_level)

            c_packed = {
                **c,
                "final_score": scores.final_score,
                "signal_scores": scores.model_dump(),
                "monoculture_analysis": mono_analysis,
                "systemic_rejection_flag": systemic_flag,
                "systemic_risk_level": mono_level,
                "tags": generate_tags(c, scores),
                "strengths": generate_strengths(c, scores, jd_intel),
                "risks": generate_risks(c, scores)
            }
            scored_candidates.append(c_packed)

    # Sort DESC by final score
    scored_candidates.sort(key=lambda x: x["final_score"], reverse=True)

    # Step 3: Global Macro Equity Audits
    self.update_state(state='PROCESSING', meta={'step': 'Running Equity Audits'})
    adverse_metrics = compute_adverse_impact(scored_candidates)
    
    enforce_diversity = guardrails.get("signal_diversity_enforcement", True)
    overall_mono_risk = compute_monoculture_risk(scored_candidates, enforce_diversity)

    # Attach adverse impact boolean flags per candidate mapping
    for rank_idx, c in enumerate(scored_candidates):
        c["rank"] = rank_idx + 1
        c["adverse_impact_flag"] = any(
            m.flag.get("value") == "alert" and m.group == c.get("race", "")
            for m in adverse_metrics
        )

    # Step 4: Build Complete Dashboard Metrics
    dashboard = build_equity_dashboard(scored_candidates, adverse_metrics, overall_mono_risk)

    # FIXED: Replaced non-existent variable reference with the length of the parsed pool array
    return {
        "jd_intelligence": jd_intel.model_dump() if hasattr(jd_intel, "model_dump") else jd_intel,
        "candidates": scored_candidates[:100],  # Return top 100 candidates for dashboard
        "equity_dashboard": dashboard,
        "total_pool_size": len(scored_candidates),
        "shortlisted": len(scored_candidates)
    }