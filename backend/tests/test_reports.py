import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_report_scanning_cardiology():
    # Test uploading a mock cardiology report file
    files = {"file": ("ecg_report.txt", b"Patient shows abnormal heart rate and chest pain.", "text/plain")}
    response = client.post("/api/reports/scan", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_specialty"] == "Cardiology"
    assert len(data["recommended_doctors"]) > 0
    assert data["recommended_doctors"][0]["specialty"] == "Cardiology"

def test_report_scanning_pulmonology():
    # Test uploading a mock pulmonology report file
    files = {"file": ("lung_scan.txt", b"Severe cough and breathing difficulty observed.", "text/plain")}
    response = client.post("/api/reports/scan", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_specialty"] == "Pulmonology"
    assert len(data["recommended_doctors"]) > 0
    assert data["recommended_doctors"][0]["specialty"] == "Pulmonology"

def test_report_scanning_general():
    # Test uploading a mock general report file
    files = {"file": ("generic.txt", b"Routine wellness checkup.", "text/plain")}
    response = client.post("/api/reports/scan", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_specialty"] == "General Medicine"
    assert len(data["recommended_doctors"]) > 0
    assert data["recommended_doctors"][0]["specialty"] == "General Medicine"
