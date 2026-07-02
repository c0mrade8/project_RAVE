from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class JDIntelligence(BaseModel):
    role: str
    seniority: str
    domain: str
    hard_skills: List[str]
    soft_skills: List[str]
    culture_signals: List[str]
    hidden_requirements: List[str]
    equity_risks_in_jd: List[str]
    market_insight: str
    ideal_profile: str

class SignalScores(BaseModel):
    semantic_fit: float
    career_trajectory: float
    behavioral_signals: float
    cultural_alignment: float
    growth_potential: float
    final_score: float

class MonocultureAnalysis(BaseModel):
    risk_score: float
    risk_level: str
    dominant_signals: List[str]
    rejection_correlation: float
    recommendation: str

class SystemicRejectionFlag(BaseModel):
    risk_level: str  # low, medium, high
    applications_to_review_ratio: int
    rejection_velocity_index: float
    rejection_trail: List[str]

class CandidateResult(BaseModel):
    id: str
    name: str
    current_title: str
    current_company: str
    years_experience: float
    location: str
    race: str
    gender: str
    education: List[Dict[str, Any]]
    skills: List[Dict[str, Any]]
    signal_scores: SignalScores
    signal_sources: List[str]
    behavioral_signals: Dict[str, Any]
    career_signals: Dict[str, Any]
    tags: List[str]
    strengths: List[str]
    risks: List[str]
    ai_insight: str
    monoculture_analysis: MonocultureAnalysis
    systemic_rejection_flag: SystemicRejectionFlag
    adverse_impact_flag: bool
    rank: int

class AdverseImpactMetric(BaseModel):
    group: str
    selection_rate: float
    impact_ratio: float
    flag: Dict[str, str]  # e.g., {"value": "ok"} or {"value": "alert"}

class EquityDashboard(BaseModel):
    monoculture_risk_score: float
    monoculture_risk_level: str
    adverse_impact_metrics: List[AdverseImpactMetric]
    systemic_rejections_prevented: int
    signal_variance_index: float

class RankRequest(BaseModel):
    job_description: str
    redrob_candidates: Optional[List[Dict[str, Any]]] = None
    weights: Optional[Dict[str, float]] = None
    equity_guardrails: Optional[Dict[str, bool]] = None

class RankResponse(BaseModel):
    jd_intelligence: JDIntelligence
    candidates: List[CandidateResult]
    equity_dashboard: EquityDashboard
    total_pool_size: int
    shortlisted: int
    processing_time_ms: float

class ChatRequest(BaseModel):
    candidate_id: str
    job_description: str
    question: str
    conversation_history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    reply: str