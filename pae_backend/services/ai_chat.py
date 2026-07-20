import os
from google import genai
from google.genai import types
from models.schemas import ChatResponse, JDIntelligence, SignalScores

# ✅ FIXED: Initialize the client using the correct modern google-genai SDK protocol
def _get_client():
    api_key = os.getenv("GEMINI_API_KEY", "")
    return genai.Client(api_key=api_key)

SYSTEM = """You are RedRob's AI recruiter assistant — expert in equitable, multi-signal candidate evaluation.
You are aware of Bommasani et al. FAccT '26 research on algorithmic monoculture in hiring.
Be specific, direct, and equity-aware. Keep answers under 180 words. No hallucinations."""

# ── Safe Schema Accessors ────────────────────────────────────────
def _get_yoe(c: dict) -> float:
    return float(c.get("profile", {}).get("years_of_experience", c.get("years_experience", 0)))

def _get_skills(c: dict) -> list[str]:
    raw = c.get("skills", [])
    return [s.get("name", "") if isinstance(s, dict) else str(s) for s in raw]

def _get_history(c: dict) -> list[dict]:
    return c.get("career_history") or c.get("experience") or []

# ── Main Service Functions ───────────────────────────────────────

async def generate_candidate_insight(candidate: dict, jd_intel: JDIntelligence, scores: SignalScores) -> str:
    """
    Generates a concise, 2-3 sentence equity-aware recruiter insight 
    for the interactive dashboard.
    """
    try:
        yoe = _get_yoe(candidate)
        skills = _get_skills(candidate)
        history = _get_history(candidate)
        
        top_strength = ""
        if history:
            top_strength = history[0].get("description", "")[:120]

        profile_data = candidate.get("profile", {})
        c_name = profile_data.get("anonymized_name", candidate.get("name", "Candidate"))
        c_title = profile_data.get("current_title", candidate.get("current_title", "Engineer"))
        c_comp = profile_data.get("current_company", candidate.get("current_company", "Enterprise"))

        prompt = f"""Generate a 2-3 sentence recruiter insight for this candidate being evaluated for: {jd_intel.role}
Candidate: {c_name}, {c_title} at {c_comp}, {yoe} yrs
Skills: {', '.join(skills[:6])}
Top strength: {top_strength}
Score: {scores.final_score}/100 | Semantic: {scores.semantic_fit} | Trajectory: {scores.career_trajectory} | Behavioral: {scores.behavioral_signals}
Referrals: {candidate.get('redrob_signals', {}).get('referral_count', 0)} | Open to work: {candidate.get('redrob_signals', {}).get('open_to_work_flag', False)}

Write a sharp, specific 2-3 sentence insight. Mention 1 equity note if relevant."""

        # ✅ FIXED: Modern client invocation method using gemini-2.5-flash
        client = _get_client()
        resp = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                temperature=0.3
            )
        )
        return resp.text.strip()
        
    except Exception as e:
        print(f"[AI Chat] Gemini insight generation error: {e}")
        profile_data = candidate.get("profile", {})
        return (f"Brings {_get_yoe(candidate)} years of experience as "
                f"{profile_data.get('current_title', 'Engineer')} at {profile_data.get('current_company', 'Enterprise')}. "
                f"Final score: {scores.final_score}/100.")

async def chat_with_candidate(candidate: dict, question: str, job_description: str, conversation_history: list, signal_scores: dict) -> ChatResponse:
    """
    Handles live conversational Q&A threads with hiring managers regarding candidate fit vectors.
    """
    try:
        history_text = ""
        for msg in conversation_history[-4:]:
            history_text += f"\n{msg.get('role', 'user').upper()}: {msg.get('content', '')}"
            
        profile_data = candidate.get("profile", {})
        yoe = _get_yoe(candidate)
        skills = _get_skills(candidate)
        
        prompt = f"""CANDIDATE PROFILE:
Name: {profile_data.get('anonymized_name', candidate.get('name', 'Candidate'))} | Role: {profile_data.get('current_title', candidate.get('current_title', 'Engineer'))} at {profile_data.get('current_company', candidate.get('current_company', 'Enterprise'))}
YoE: {yoe} | Location: {profile_data.get('location', 'Not disclosed')}
Skills: {', '.join(skills)}
Publications: {', '.join(candidate.get('publications', []))}
Scores — Semantic: {signal_scores.get('semantic_fit')}/100 | Trajectory: {signal_scores.get('career_trajectory')}/100 | Behavioral: {signal_scores.get('behavioral_signals')}/100 | Culture: {signal_scores.get('cultural_alignment')}/100 | Growth: {signal_scores.get('growth_potential')}/100 | FINAL: {signal_scores.get('final_score')}/100
Behavioral: {candidate.get('redrob_signals', {})}

JD Context: {job_description[:400]}
{history_text}

QUESTION: {question}
Answer directly and specifically:"""

        # ✅ FIXED: Modern client invocation method
        client = _get_client()
        resp = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                temperature=0.3
            )
        )
        answer = resp.text.strip()
        
        sources = []
        if any(w in answer.lower() for w in ["facct", "bommasani", "monoculture"]):
            sources.append("Bommasani et al., FAccT '26")
            
        return ChatResponse(
            reply=answer, 
            candidate_name=profile_data.get('anonymized_name', candidate.get('name', 'Candidate')), 
            sources_cited=sources
        )
        
    except Exception as e:
        profile_data = candidate.get("profile", {})
        return ChatResponse(
            reply=f"AI query services temporarily offline: {str(e)}", 
            candidate_name=profile_data.get('anonymized_name', candidate.get('name', 'Candidate')), 
            sources_cited=[]
        )