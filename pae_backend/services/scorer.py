"""
Multi-Signal Scoring Engine // Robust Schema Ingestion
Equitable Candidate Discovery Pipeline
"""
import statistics
from datetime import date, datetime
from models.schemas import SignalScores, JDIntelligence

def clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, float(v)))

def normalize_weights(w: dict) -> dict:
    base_weights = {
        "semantic_fit": 28, 
        "career_trajectory": 24,
        "behavioral_signals": 22, 
        "cultural_alignment": 16, 
        "growth_potential": 10
    }
    # Merge custom weights safely
    merged = {k: float(w.get(k, base_weights[k])) for k in base_weights}
    total = sum(merged.values()) or 1
    return {k: v / total for k, v in merged.items()}

# ── Safe Signal Accessors ────────────────────────────────────────
def get_redrob_signals(c: dict) -> dict:
    return c.get("redrob_signals") or {}

def get_skills(c: dict) -> list[str]:
    raw = c.get("skills", [])
    return [s.get("name", "") if isinstance(s, dict) else str(s) for s in raw]

def get_yoe(c: dict) -> float:
    return float(c.get("profile", {}).get("years_of_experience", c.get("years_experience", 0)))

def get_career_history(c: dict) -> list[dict]:
    return c.get("career_history") or []

def days_since(date_str: str) -> int:
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (date.today() - d).days
    except Exception:
        return 999

# ── 1. Semantic Fit ───────────────────────────────────────────────
def compute_semantic_fit(c: dict, jd: JDIntelligence) -> float:
    required = set(s.lower() for s in jd.hard_skills)
    candidate_skills = set(s.lower() for s in get_skills(c))
    
    if required:
        overlap = len(required & candidate_skills) / len(required)
    else:
        overlap = 0.5
    skill_score = overlap * 55

    # Summary text mapping
    profile_data = c.get("profile", {})
    text_blob = " ".join([
        profile_data.get("summary", ""),
        profile_data.get("headline", ""),
        " ".join(r.get("description", "") for r in get_career_history(c)[:3]),
    ]).lower()
    
    hits = sum(1 for kw in required if len(kw) > 3 and kw in text_blob)
    keyword_score = min(20, hits * 2.5)

    # Experience alignment based on JD constraints (5-9 years target)
    yoe = get_yoe(c)
    yoe_score = max(0, 25 - abs(yoe - 7.0) * 3.5) # 7 years is the sweet-spot center

    # Redrob Platform Skill Assessment Multiplier
    rs = get_redrob_signals(c)
    ass_scores = rs.get("skill_assessment_scores", {})
    if ass_scores:
        relevant = [float(v) for k, v in ass_scores.items() if any(sk.lower() in k.lower() for sk in jd.hard_skills)]
        ass_bonus = (statistics.mean(relevant) / 100) * 10 if relevant else (statistics.mean(ass_scores.values()) / 100) * 5
    else:
        ass_bonus = 0.0

    return clamp(skill_score + keyword_score + yoe_score + ass_bonus)

# ── 2. Career Trajectory ─────────────────────────────────────────
def compute_career_trajectory(c: dict) -> float:
    yoe = max(get_yoe(c), 1.0)
    history = get_career_history(c)
    
    # Extract structural promotions from title strings
    promo_kws = ["senior", "staff", "principal", "lead", "manager", "director", "vp"]
    promotions = 0
    titles = [h.get("title", "").lower() for h in history]
    
    for i in range(len(titles) - 1):
        # Higher index means older job. If older job doesn't have keyword but newer one does -> promo
        if any(kw in titles[i] for kw in promo_kws) and not any(kw in titles[i+1] for kw in promo_kws):
            promotions += 1
            
    promo_score = clamp((promotions / yoe) * 70, 0, 35)

    # Average tenure check
    durations = [h.get("duration_months", 24) for h in history]
    avg_tenure = (statistics.mean(durations) / 12) if durations else 2.0
    
    if 1.5 <= avg_tenure <= 3.5:
        tenure_score = 25
    elif avg_tenure < 1.0:
        tenure_score = 5 # Job hopping risk
    else:
        tenure_score = 15

    # Company size diversity scoring
    sizes = [h.get("company_size", "") for h in history[:3]]
    enterprise_experience = sum(1 for s in sizes if s in ["1001-5000", "5001-10000", "10001+"])
    pedigree_score = min(15, enterprise_experience * 5)

    return clamp(promo_score + tenure_score + pedigree_score + 25)

# ── 3. Behavioral Signals ────────────────────────────────────────
def compute_behavioral_signals(c: dict) -> float:
    rs = get_redrob_signals(c)
    
    open_to_work = 15 if rs.get("open_to_work_flag", False) else 5
    days_inactive = days_since(rs.get("last_active_date", "2026-01-01"))
    recency = 10 if days_inactive <= 14 else (5 if days_inactive <= 45 else 1)
    
    resp_rate = float(rs.get("recruiter_response_rate", 0.5))
    resp_time = float(rs.get("avg_response_time_hours", 48.0))
    responsiveness = (resp_rate * 20) + (10 if resp_time <= 12 else 3)
    
    completeness = float(rs.get("profile_completeness_score", 50.0))
    engagement = (completeness / 100) * 15
    
    saved_by = min(rs.get("saved_by_recruiters_30d", 0), 20)
    connections = min(rs.get("connection_count", 0), 500)
    social = (saved_by / 20) * 15 + (connections / 500) * 5
    
    return clamp(open_to_work + recency + responsiveness + engagement + social)

# ── 4. Cultural Alignment ─────────────────────────────────────────
def compute_cultural_alignment(c: dict, jd: JDIntelligence) -> float:
    rs = get_redrob_signals(c)
    
    # Work mode alignment
    pref_mode = rs.get("preferred_work_mode", "flexible")
    mode_score = 25 if pref_mode in ["hybrid", "flexible"] else 15
    
    # Notice Period - Explicitly mapped to JD constraints
    notice = rs.get("notice_period_days", 60)
    if notice <= 30:
        notice_score = 25 # Highly requested preference buy-out zone
    elif notice <= 60:
        notice_score = 15
    else:
        notice_score = 5

    linkedin = 15 if rs.get("linkedin_connected", False) else 5
    verified = 10 if (rs.get("verified_email") and rs.get("verified_phone")) else 5
    
    return clamp(mode_score + notice_score + linkedin + verified + 25)

# ── 5. Growth Potential ───────────────────────────────────────────
def compute_growth_potential(c: dict) -> float:
    rs = get_redrob_signals(c)
    
    github = float(rs.get("github_activity_score", -1))
    github_score = 0.0 if github == -1 else (github / 100) * 35
    
    endorsements = min(rs.get("endorsements_received", 0), 100)
    endorse_score = (endorsements / 100) * 25
    
    interview_rate = float(rs.get("interview_completion_rate", 0.5))
    completion_score = interview_rate * 20
    
    return clamp(github_score + endorse_score + completion_score + 20)

# ── Main Entry Point ──────────────────────────────────────────────
def score_candidate(c: dict, jd: JDIntelligence, weights: dict) -> SignalScores:
    w = normalize_weights(weights)
    
    # ── THE ANTIDOTE: HONEYPOT TRAP ERADICATION ──
    rs = get_redrob_signals(c)
    
    # Trap check 1: Keyword stuffer with zero activity footprints
    is_ghost = rs.get("profile_views_received_30d", 0) == 0 and rs.get("search_appearance_30d", 0) == 0
    # Trap check 2: Impossible profile declarations (GitHub activity -1 but expert scores)
    has_impossible_signals = rs.get("github_activity_score", 0) == -1 and len(rs.get("skill_assessment_scores", {})) > 5
    
    integrity_multiplier = 0.01 if (is_ghost or has_impossible_signals) else 1.0

    sem  = compute_semantic_fit(c, jd)
    traj = compute_career_trajectory(c)
    beh  = compute_behavioral_signals(c)
    cult = compute_cultural_alignment(c, jd)
    grow = compute_growth_potential(c)
    
    final = (
        sem  * w["semantic_fit"] +
        traj * w["career_trajectory"] +
        beh  * w["behavioral_signals"] +
        cult * w["cultural_alignment"] +
        grow * w["growth_potential"]
    ) * integrity_multiplier

    return SignalScores(
        semantic_fit=round(sem, 1),
        career_trajectory=round(traj, 1),
        behavioral_signals=round(beh, 1),
        cultural_alignment=round(cult, 1),
        growth_potential=round(grow, 1),
        final_score=round(clamp(final), 1),
    )

def generate_tags(c: dict, scores: SignalScores) -> list[str]:
    tags = []
    rs = get_redrob_signals(c)
    if rs.get("open_to_work_flag"):
        tags.append("Open to work")
    if float(rs.get("github_activity_score", -1)) >= 65:
        tags.append("GitHub Active")
    if scores.final_score >= 82:
        tags.append("Top Match")
    return tags[:3]

def generate_strengths(c: dict, scores: SignalScores, jd: JDIntelligence) -> list[str]:
    strengths = []
    history = get_career_history(c)
    rs = get_redrob_signals(c)
    
    if history:
        top = history[0]
        desc = top.get("description", "")
        strengths.append(f"Experienced {top.get('title',' Role')} at {top.get('company',' Enterprise')}: {desc[:60]}...")
    if float(rs.get("recruiter_response_rate", 0)) >= 0.75:
        strengths.append("High platform engagement vector — responsive communicator")
    return strengths[:2]

def generate_risks(c: dict, scores: SignalScores) -> list[str]:
    risks = []
    rs = get_redrob_signals(c)
    if int(rs.get("notice_period_days", 30)) > 60:
        risks.append("Extended notice period timeline constraints")
    if float(rs.get("interview_completion_rate", 1.0)) < 0.5:
        risks.append("Historical interview drop-off fluctuations")
    return risks[:2]