import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.seed.seed_data import seed_database
from app.services.ml_engine import ml_engine
from app.services.referral_engine import referral_engine, calculate_haversine_distance
from app.services.audit_service import audit_service
from app.database import SessionLocal

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    seed_database()

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["platform"] == "MedFlow"

def test_auth_login():
    response = client.post("/api/auth/login", json={
        "email": "staff@medflow.in",
        "password": "staff123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" == "access_token" in data
    assert data["user"]["role"] == "HOSPITAL_STAFF"

def test_hospitals_listing():
    response = client.get("/api/hospitals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 15
    # Verify presence of real-time beds and ML predictions
    first_hosp = data[0]
    assert "general_beds_available" in first_hosp
    assert "icu_beds_available" in first_hosp
    assert "predicted_available_12h" in first_hosp
    assert "predicted_available_24h" in first_hosp

def test_hospital_detail():
    response = client.get("/api/hospitals/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "oxygen_inventory" in data
    assert "blood_inventory" in data
    assert "beds" in data
    assert len(data["beds"]) > 0

def test_bed_status_toggle():
    # Toggle bed 1
    response = client.patch("/api/beds/1", json={
        "status": "AVAILABLE"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"

def test_ml_prediction_bounds():
    response = client.get("/api/predictions/hospital/1")
    assert response.status_code == 200
    data = response.json()
    assert "forecast_12h_total_icu" in data
    assert "forecast_24h_total_icu" in data
    assert data["forecast_12h_total_icu"] >= data["current_free_icu"]

def test_smart_referral_ranking():
    response = client.post("/api/referrals/recommend", json={
        "originating_lat": 13.0500,
        "originating_lng": 80.2500,
        "required_specialty": "Cardiology",
        "required_bed_type": "ICU",
        "patient_age": 60,
        "insurance_scheme": "PMJAY",
        "urgency_level": "CRITICAL"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    # Top hospital must have recommendation_rank = 1 and valid score
    top = data[0]
    assert top["recommendation_rank"] == 1
    assert top["overall_match_score"] > 0
    assert "scoring_breakdown" in top

def test_rural_ussd_gateway():
    response = client.post("/api/rural/ussd", json={
        "session_id": "TEST_SESS_001",
        "phone_number": "+919876543210",
        "user_input": "*999#"
    })
    assert response.status_code == 200
    data = response.json()
    assert "MEDFLOW RURAL HELPLINE" in data["message"]
    assert data["should_continue"] == True

def test_rural_sms_gateway():
    response = client.post("/api/rural/sms", json={
        "sender_phone": "+919876543210",
        "message_body": "ICU CHENNAI"
    })
    assert response.status_code == 200
    data = response.json()
    assert "BED RESULTS" in data["sms_text"]
    assert data["hospitals_found"] > 0

def test_blockchain_audit_trail_integrity():
    db = SessionLocal()
    try:
        verification = audit_service.verify_chain_integrity(db)
        assert verification["is_valid"] == True
        assert verification["total_blocks_verified"] > 0
    finally:
        db.close()

def test_digital_twin_simulation():
    response = client.post("/api/simulation/run", json={
        "scenario_type": "SURGE_PERCENT",
        "patient_influx_surge_pct": 50.0,
        "icu_demand_multiplier": 1.5,
        "oxygen_consumption_multiplier": 1.6,
        "duration_days": 7
    })
    assert response.status_code == 200
    data = response.json()
    assert data["projected_total_admissions"] > 0
    assert len(data["timeline_forecast"]) == 7
    assert len(data["mitigation_recommendations"]) > 0

def test_abdm_fhir_r4_export():
    response = client.get("/api/abdm/export/1")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "Bundle"
    assert "fhir_bundle" in data
