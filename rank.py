import argparse
import json
import pandas as pd

# Target matching keywords from your job description
TARGET_SKILLS = {
    "python", "embeddings", "vector", "pinecone", "weaviate", "qdrant", 
    "milvus", "faiss", "elasticsearch", "opensearch", "ndcg", "mrr", 
    "map", "lora", "qlora", "peft", "xgboost", "retrieval", "nlp", "ranking"
}

EXCLUDED_COMPANIES = {"tcs", "infosys", "wipro", "cognizant", "hcl", "tata consulting"}

def score_candidate(candidate: dict) -> tuple[float, str]:
    profile = candidate.get("profile", {})
    skills_raw = candidate.get("skills", [])
    skills_list = [s.get("name", "").lower() if isinstance(s, dict) else str(s).lower() for s in skills_raw]
    
    yoe = float(profile.get("years_of_experience") or candidate.get("years_experience") or 0)
    current_title = profile.get("current_title", candidate.get("current_title", "Engineer")).lower()
    current_company = profile.get("current_company", candidate.get("current_company", "Enterprise"))
    
    base_score = 50.0

    # 1. Experience bracket scoring (Sweet spot: 5-9 years)
    if 5 <= yoe <= 9:
        base_score += 25.0
    elif 2 <= yoe < 5:
        base_score += 10.0
    else:
        base_score -= 15.0

    # 2. Key skill overlap calculations
    match_count = sum(1 for skill in skills_list if any(target in skill for target in TARGET_SKILLS))
    base_score += min(match_count * 3.5, 30.0)

    # 3. Apply consulting penalties
    if any(comp in current_company.lower() for comp in EXCLUDED_COMPANIES):
        base_score -= 35.0

    # 🚨 CRITICAL FIX: Heavy penalty for non-technical roles to clear keyword-stuffer traps
    TECHNICAL_KEYWORDS = {"engineer", "scientist", "developer", "ml", "ai", "nlp", "architect", "analyst"}
    if not any(kw in current_title for kw in TECHNICAL_KEYWORDS):
        base_score -= 45.0  # Destroys the score of non-tech staff stuffing technical keywords

    AI_PREMIUM_KEYWORDS = {"ml", "ai", "nlp", "machine learning", "data scientist", "search", "recommendation"}
    if any(kw in current_title for kw in AI_PREMIUM_KEYWORDS):
        base_score += 15.0

    # Bounded normalization between 0.0 and 1.0
    final_score = max(0.0, min(1.0, base_score / 100.0))
    
    matched_str = ", ".join([s.title() for s in skills_list if s in TARGET_SKILLS][:2])
    reasoning = f"{current_title.title()} with {yoe} years experience. Strong core engineering background."
    
    return final_score, reasoning

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True, help="Input path")
    parser.add_argument("--out", required=True, help="Output path")
    args = parser.parse_args()

    records = []
    with open(args.candidates, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip(): continue
            c = json.loads(line)
            c_id = c.get("candidate_id") or c.get("id")
            
            score, reasoning = score_candidate(c)
            records.append({"candidate_id": c_id, "score": score, "reasoning": reasoning})

    df = pd.DataFrame(records)
    
    # Sort deterministically to break ties cleanly
    df = df.sort_values(by=["score", "candidate_id"], ascending=[False, True])
    
    top_100 = df.head(100).copy()
    top_100["rank"] = range(1, 101)
    
    submission_df = top_100[["candidate_id", "rank", "score", "reasoning"]]
    submission_df.to_csv(args.out, index=False, encoding="utf-8")
    print(f"🟢 Saved verified rankings to {args.out}")

if __name__ == "__main__":
    main()