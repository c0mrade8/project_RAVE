"""
Smoke test: confirms the FastAPI app boots and responds.

Adjust the import below to match where your FastAPI `app` instance
actually lives, e.g.:
    from app.main import app
    from main import app
"""
from fastapi.testclient import TestClient

from main import app  

client = TestClient(app)


def test_app_starts_and_responds():
    # Hits root; if you don't have a "/" route, point this at any route
    # that doesn't require auth, e.g. "/health" or "/docs".
    response = client.get("/")
    assert response.status_code in (200, 404)  # 404 is fine if "/" isn't defined
