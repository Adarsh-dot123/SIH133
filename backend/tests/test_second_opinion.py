import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_second_opinion_cardiology_emergency():
    files = {"file": ("cardiac_emergency.txt", b"patient suffered sudden cardiac arrest, st elevation on ecg.", "text/plain")}
    response = client.post(
        "/api/reports/analyze-and-recommend",
        files=files,
        params={"user_lat": 13.0827, "user_lng": 80.2707}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_specialty"] == "Cardiology"
    assert data["urgency_level"] == "Emergency"
    assert "ranked_hospitals" in data
    ranked = data["ranked_hospitals"]
    assert len(ranked) > 0
    # Scores should be sorted descending
    scores = [h["score"] for h in ranked]
    assert scores == sorted(scores, reverse=True)

def test_second_opinion_oncology_urgent():
    files = {"file": ("biopsy_report.txt", b"biopsy reveals malignant tissue growth indicating oncology consultation.", "text/plain")}
    response = client.post(
        "/api/reports/analyze-and-recommend",
        files=files,
        params={"user_lat": 13.0827, "user_lng": 80.2707}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_specialty"] == "Oncology"
    assert data["urgency_level"] == "Urgent"
    assert len(data["ranked_hospitals"]) > 0

def test_second_opinion_nephrology_urgent():
    files = {"file": ("kidney_failure.txt", b"kidney creatinine > 5, indicating complete renal failure.", "text/plain")}
    response = client.post(
        "/api/reports/analyze-and-recommend",
        files=files,
        params={"user_lat": 13.0827, "user_lng": 80.2707}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_specialty"] == "Nephrology"
    assert data["urgency_level"] == "Urgent"

def test_second_opinion_route():
    files = {"file": ("ecg.pdf", b"abnormal cardiac rhythm, chest pain, cardiology check required.", "application/pdf")}
    response = client.post(
        "/api/reports/second-opinion",
        files=files,
        params={"user_lat": 13.0827, "user_lng": 80.2707}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_specialty"] == "Cardiology"
    assert len(data["ranked_hospitals"]) > 0
