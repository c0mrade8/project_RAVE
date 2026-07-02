# RAVE — Equitable Candidate Discovery
**Anti-Monoculture AI Recruiter · RedRob AI Hackathon 2026**

Built on FAccT '26 peer-reviewed research: *"Algorithmic Monocultures in Hiring"* — Bommasani, Bana, Creel, Jurafsky & Liang, ACM 2026. `doi:10.1145/3805689.3812400`

---

## What this is

Most AI recruiters filter and rank candidates. This one does that — and actively monitors for the three documented failure modes of modern hiring algorithms:

| Failure Mode | Research Finding | Our Response |
|---|---|---|
| **Adverse Impact** | 10.62% of positions adversely impact Black applicants when analyzed per-position — invisible in aggregate | Per-group impact ratio dashboard, EEOC 4/5ths rule flagging |
| **Monoculture Risk** | 42 shared models across employers mean rejection at one mechanically predicts rejection at another | Signal correlation score across 5 independent dimensions |
| **Systemic Rejection** | 4% of applicants rejected from all 10 jobs they apply to — 2.5× above chance | Per-candidate systemic rejection risk flag with estimated cross-employer rejection rate |

The system has two parts: an offline ranker that generates the submission CSV, and a full-stack web app for the sandbox demo.

---

## File structure

```
project_RAVE/
├── pae_backend/
│   ├── main.py                  # FastAPI app — /api/rank, /api/chat
│   ├── ranker.py                # ★ Submission script — scores 100k candidates → CSV
│   ├── celery_app.py
│   ├── tasks.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic request/response models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── jd_parser.py         # Gemini JD intelligence
│   │   ├── scorer.py            # 5-signal scoring engine (all 23 redrob_signals fields)
│   │   ├── equity_audit.py      # Adverse impact, monoculture risk, systemic rejection
│   │   └── ai_chat.py           # Per-candidate Q&A via Gemini
│   ├── data/
│   │   └── candidates.json      # Demo candidate pool for the web UI
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── LeftPanel.jsx        # JD input, signal weights, equity toggles
│   │   │   ├── EquityDashboard.jsx  # Adverse impact + monoculture metrics
│   │   │   ├── JDCard.jsx           # JD intelligence output
│   │   │   ├── CandidateCard.jsx    # Ranked candidate with full signal breakdown
│   │   │   ├── ChatModal.jsx        # Ask AI about any candidate
│   │   │   ├── ScoreRing.jsx        # Animated score ring component
│   │   │   └── LoadingOverlay.jsx
│   │   ├── api/client.js
│   │   └── store/useStore.js        # Zustand global state
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
├── rank.py
├── output.csv     #the output csv fil that will be generated after executing the rank.py
├── .env.example   #the env file goes here with the llm api (gemini used here in the project)
├── docker-compose.yml
└── README.md
```

---

## Step 1 — Generate the submission CSV (output.csv)

The ranker runs fully offline. No network required. No external APIs called. Place the data files in 'pae_backend/data/' directory:

```
pae_backend/data/
  candidates.jsonl   ← from hackathon given data
  job_description.docx    ← from hackathon given data
```

Then run:

```bash
cd pae_backend
pip install -r requirements.txt

cd ..
python rank.py --candidates ./pae_backend/data/candidates.jsonl --out ./output.csv
```
The output.csv is the expected ranked output file.
Expected: under 5 minutes

Validate your output format with the pre-flight testing check script given by the hackathon conductors:

go to the root directory and run the below command:
```bash
python pae_backend/validate_submission.py output.csv
```

---

## Step 2 — Run the web app locally

### Option A — Docker (recommended)
Go to the root directory and run the below command:

```bash
echo "GEMINI_API_KEY=your_key_here" > .env
docker compose up --build
```

- App: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`

### Option B — Manual

**Backend:**
```bash
cd pae_backend
cp .env.example .env       # add your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:8000
npm install
npm install mammoth
npm run dev
```

---

## Step 3 — Deploy for a live link

**Backend → Railway:**
```bash
cd pae_backend
railway login
railway init
railway up
# Set GEMINI_API_KEY in the Railway dashboard
# Note your service URL: https://your-api.railway.app
```

**Frontend → Vercel:**
```bash
echo "VITE_API_URL=https://your-api.railway.app" > frontend/.env.production
cd frontend
vercel --prod
```

---

## How scoring works

Every candidate is scored across 5 independent signal dimensions using the real `redrob_signals` fields from the dataset schema:

| Dimension | Fields used | Weight |
|---|---|---|
| **Semantic Fit** | `skills`, `career_history` descriptions, `skill_assessment_scores` | 28% |
| **Career Trajectory** | `career_history` duration, `company_size`, title progression, `education.tier` | 24% |
| **Behavioral Signals** | `open_to_work_flag`, `recruiter_response_rate`, `avg_response_time_hours`, `github_activity_score`, `saved_by_recruiters_30d`, `profile_completeness_score`, `last_active_date`, `interview_completion_rate`, `offer_acceptance_rate`, `connection_count`, `endorsements_received`, `verified_email`, `verified_phone`, `linkedin_connected` | 22% |
| **Cultural Alignment** | `preferred_work_mode`, `willing_to_relocate`, `notice_period_days`, `linkedin_connected` | 16% |
| **Growth Potential** | `github_activity_score`, `skill_assessment_scores`, `connection_count`, `endorsements_received`, certifications, publications | 10% |

Weights are configurable in the web UI and as a CLI argument (`--weights`).

---

## Honeypot detection

The ranker filters candidates before scoring if they match any of these patterns:

- **Impossible experience** — total YoE exceeds years since graduation by more than 5
- **Keyword stuffing** — expert-level skills count exceeds `YoE × 1.5`
- **Synthetic uniformity** — all behavioral signals at maximum values simultaneously
- **Missing history** — more than 5 YoE with zero career history entries
- **Endorsement inflation** — endorsements-to-connections ratio above 5:1
- **View inflation** — profile views more than 20× search appearances

---

## Equity audit layer (web UI)

The web app includes a real-time equity dashboard that runs alongside every ranking:

- **Adverse impact ratios** — per demographic group, flagged against the EEOC 4/5ths rule. Computed per ranking run, not aggregated — the per-position disaggregation that Bommasani et al. show is necessary to surface hidden discrimination.
- **Monoculture risk score** — measures signal correlation across dimensions. High correlation means the same candidates get rejected everywhere, independent of employer.
- **Systemic rejection estimate** — per-candidate cross-employer rejection risk based on signal homogeneity, demographic group, and ATS keyword risk.
- **Signal source diversity** — surfaces candidates scored from fewer than 4 independent sources for manual review.

---

## Environment variables

| Variable | File | Value |
|---|---|---|
| `GEMINI_API_KEY` | `pae_backend/.env` | Google AI Studio API key |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000` locally, Railway URL in production |

---

## Research basis

> Bommasani R., Bana S.H., Creel K.A., Jurafsky D., Liang P. (2026). *Algorithmic Monocultures in Hiring.* FAccT '26, Montreal. https://doi.org/10.1145/3805689.3812400

Key findings implemented in this system:

- Aggregate impact ratio analysis hides per-position discrimination → we compute metrics per ranking run, per group
- 10.62% of positions adversely impact Black applicants, 5.32% impact Asian applicants → real-time flagging in UI
- Applicants need 25+ applications (vs 10 under independence) to achieve <0.1% systemic rejection rate → per-candidate estimates surfaced to recruiters
- Signal source diversity reduces monoculture risk → enforced as a guardrail with toggle
