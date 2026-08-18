from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hospital, Bed, PatientStay, Patient, BedTurnoverPrediction
from app.schemas import (
    HospitalPredictionSummary, BedTurnoverPredictionResponse,
    PatientStayResponse, PatientStayCreate, PatientStayUpdate
)
from app.services.ml_engine import ml_engine
from app.routes.ws import manager

router = APIRouter(prefix="/predictions", tags=["Predictive Bed Turnover"])

@router.get("/hospital/{hospital_id}", response_model=HospitalPredictionSummary)
def get_hospital_predictions(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    gen_avail = sum(1 for b in hosp.beds if b.bed_type == "GENERAL" and b.status == "AVAILABLE")
    icu_avail = sum(1 for b in hosp.beds if "ICU" in b.bed_type and b.status == "AVAILABLE")
    vent_avail = sum(1 for b in hosp.beds if b.bed_type == "VENTILATOR" and b.status == "AVAILABLE")

    active_stays = db.query(PatientStay).filter(
        PatientStay.hospital_id == hospital_id,
        PatientStay.is_active == True
    ).all()

    current_free = {"GENERAL": gen_avail, "ICU": icu_avail, "VENTILATOR": vent_avail}
    forecast = ml_engine.aggregate_hospital_forecast(current_free, active_stays)

    patient_predictions = []
    for stay in active_stays:
        pred_dict = ml_engine.predict_patient_turnover(stay, stay.admission_date)
        patient_predictions.append({
            "patient_id": f"P-{stay.patient_id}",
            "patient_stay_id": stay.id,
            "bed_id": stay.bed_id,
            "ward_name": stay.bed.ward_name if stay.bed else "General Ward",
            "bed_number": stay.bed.bed_number if stay.bed else "Unassigned",
            "discharge_probability_12h": pred_dict["discharge_prob_12h"],
            "discharge_probability_24h": pred_dict["discharge_prob_24h"],
            "expected_discharge_hours": pred_dict["expected_discharge_hours"],
            "confidence": pred_dict["confidence"],
            "clinical_stage": pred_dict["clinical_stage"],
            "key_factors": pred_dict["key_factors"],
            "recommendation": pred_dict["recommendation"]
        })

    return {
        "hospital_id": hosp.id,
        "hospital_name": hosp.name,
        "current_free_general": gen_avail,
        "current_free_icu": icu_avail,
        "current_free_ventilator": vent_avail,
        "predicted_general_freed_12h": forecast["predicted_general_freed_12h"],
        "predicted_general_freed_24h": forecast["predicted_general_freed_24h"],
        "predicted_icu_freed_12h": forecast["predicted_icu_freed_12h"],
        "predicted_icu_freed_24h": forecast["predicted_icu_freed_24h"],
        "forecast_12h_total_general": forecast["forecast_12h_total_general"],
        "forecast_24h_total_general": forecast["forecast_24h_total_general"],
        "forecast_12h_total_icu": forecast["forecast_12h_total_icu"],
        "forecast_24h_total_icu": forecast["forecast_24h_total_icu"],
        "active_inpatient_predictions": patient_predictions
    }

@router.get("/patient/{stay_id}", response_model=BedTurnoverPredictionResponse)
def get_patient_prediction(stay_id: int, db: Session = Depends(get_db)):
    stay = db.query(PatientStay).filter(PatientStay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Patient stay record not found")

    pred_dict = ml_engine.predict_patient_turnover(stay, stay.admission_date)
    return {
        "patient_id": f"P-{stay.patient_id}",
        "patient_stay_id": stay.id,
        "bed_id": stay.bed_id,
        "ward_name": stay.bed.ward_name if stay.bed else "General Ward",
        "bed_number": stay.bed.bed_number if stay.bed else "Unassigned",
        "discharge_probability_12h": pred_dict["discharge_prob_12h"],
        "discharge_probability_24h": pred_dict["discharge_prob_24h"],
        "expected_discharge_hours": pred_dict["expected_discharge_hours"],
        "confidence": pred_dict["confidence"],
        "clinical_stage": pred_dict["clinical_stage"],
        "key_factors": pred_dict["key_factors"],
        "recommendation": pred_dict["recommendation"]
    }

@router.post("/patient/{stay_id}/recalculate")
async def recalculate_patient_prediction(
    stay_id: int,
    vitals_update: PatientStayUpdate,
    db: Session = Depends(get_db)
):
    stay = db.query(PatientStay).filter(PatientStay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Patient stay not found")

    if vitals_update.treatment_stage:
        stay.treatment_stage = vitals_update.treatment_stage
    if vitals_update.current_spo2 is not None:
        stay.current_spo2 = vitals_update.current_spo2
    if vitals_update.current_hr is not None:
        stay.current_hr = vitals_update.current_hr
    if vitals_update.current_map is not None:
        stay.current_map = vitals_update.current_map
    if vitals_update.current_rr is not None:
        stay.current_rr = vitals_update.current_rr
    if vitals_update.current_temp is not None:
        stay.current_temp = vitals_update.current_temp
    if vitals_update.vitals_stability_score is not None:
        stay.vitals_stability_score = vitals_update.vitals_stability_score

    db.commit()

    # Re-run ML inference
    new_pred = ml_engine.predict_patient_turnover(stay, stay.admission_date)

    # Save to predictions table
    db_pred = BedTurnoverPrediction(
        patient_stay_id=stay.id,
        bed_id=stay.bed_id,
        hospital_id=stay.hospital_id,
        discharge_prob_12h=new_pred["discharge_prob_12h"],
        discharge_prob_24h=new_pred["discharge_prob_24h"],
        expected_discharge_hours=new_pred["expected_discharge_hours"],
        confidence_score=new_pred["confidence"],
        key_factors_json=json.dumps(new_pred["key_factors"])
    )
    db.add(db_pred)
    db.commit()

    # WebSocket broadcast
    await manager.broadcast("PREDICTION_RECALCULATED", {
        "stay_id": stay.id,
        "hospital_id": stay.hospital_id,
        "discharge_prob_12h": new_pred["discharge_prob_12h"],
        "discharge_prob_24h": new_pred["discharge_prob_24h"],
        "expected_discharge_hours": new_pred["expected_discharge_hours"]
    })

    return {
        "message": "Prediction successfully updated",
        "prediction": new_pred
    }

@router.get("/stays", response_model=List[PatientStayResponse])
def get_patient_stays(hospital_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(PatientStay).filter(PatientStay.is_active == True)
    if hospital_id:
        query = query.filter(PatientStay.hospital_id == hospital_id)
    stays = query.all()
    results = []
    for s in stays:
        results.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": s.patient.full_name if s.patient else "Patient",
            "patient_age": s.patient.age if s.patient else 45,
            "patient_gender": s.patient.gender if s.patient else "Other",
            "abha_id": s.patient.abha_id if s.patient else None,
            "hospital_id": s.hospital_id,
            "bed_id": s.bed_id,
            "ward_name": s.bed.ward_name if s.bed else "General",
            "bed_number": s.bed.bed_number if s.bed else "N/A",
            "admission_date": s.admission_date,
            "diagnosis_category": s.diagnosis_category,
            "diagnosis_detail": s.diagnosis_detail,
            "co_morbidities": s.co_morbidities,
            "treatment_stage": s.treatment_stage,
            "current_spo2": s.current_spo2,
            "current_hr": s.current_hr,
            "current_map": s.current_map,
            "current_rr": s.current_rr,
            "current_temp": s.current_temp,
            "vitals_stability_score": s.vitals_stability_score,
            "is_active": s.is_active
        })
    return results
