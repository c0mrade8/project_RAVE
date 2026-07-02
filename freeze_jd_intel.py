#!/usr/bin/env python3
"""
Freeze JD Intelligence
=======================
Executes the live Gemini extraction pipeline once and freezes the structured 
parameters into a static JSON configuration file. This guarantees architectural parity 
between the online interactive dashboard and the strict offline constraint evaluation.
"""

import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure we can import from backend services
import sys
sys.path.append(str(Path(__file__).parent / "backend"))

from pae_backend.services.jd_parser import parse_job_description

# Load environment variables if running locally with a .env file
load_dotenv()

async def freeze_pipeline():
    print("[Freeze Engine] Initializing context capture...")
    
    # 1. Define paths
    jd_path = Path("data/job_description.md")
    if not jd_path.exists():
        # Fallback check if it's placed inside backend/data
        jd_path = Path("backend/data/job_description.md")
        
    output_dir = Path("backend/data")
    output_file = output_dir / "jd_intel_frozen.json"
    
    if not jd_path.exists():
        print(f"[Error] Source job description file not found at {jd_path}")
        return

    # 2. Read the source markdown JD
    print(f"[Freeze Engine] Reading source description from {jd_path}...")
    jd_text = jd_path.read_text(encoding="utf-8")

    # 3. Ensure API Key exists before invoking the generator
    if not os.getenv("GEMINI_API_KEY"):
        print("[Warning] GEMINI_API_KEY environment variable not detected. Falling back to structured heuristic.")

    # 4. Invoke live parsing logic
    print("[Freeze Engine] Transmitting schema parameters to generative model...")
    jd_intelligence = await parse_job_description(jd_text)

    # 5. Extract dictionary payload from Pydantic model
    # Works seamlessly whether parse_job_description returns a dict or a Pydantic object
    if hasattr(jd_intelligence, "model_dump"):
        data_payload = jd_intelligence.model_dump()
    elif hasattr(jd_intelligence, "__dict__"):
        data_payload = {k: v for k, v in jd_intelligence.__dict__.items() if not k.startswith('_')}
    else:
        data_payload = jd_intelligence

    # 6. Ensure output directory structure exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # 7. Serialize and write to disk
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data_payload, f, indent=2, ensure_ascii=False)

    print(f"[Success] Freezing transaction complete.")
    print(f"[Success] Structural schema configuration cached at: {output_file}")
    print("\nVerifying exported payload structures:")
    print(json.dumps(data_payload, indent=2)[:400] + "\n... [Truncated]")

if __name__ == "__main__":
    asyncio.run(freeze_pipeline())