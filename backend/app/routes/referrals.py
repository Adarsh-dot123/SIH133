from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ReferralRequest, Hospital, Ambulance, Bed
from app.schemas import (
    ReferralRecommendationRequest, HospitalReferralScore,
    ReferralRequestCreate, ReferralResponse
)
from app.services.referral_engine import referral_engine
from app.services.audit_service import audit_service
from app.routes.ws import manager

router = APIRouter(prefix="/referrals", tags=["Smart Referral Engine"])

@router.post("/recommend", response_model=List[HospitalReferralScore])
def recommend_hospitals(
    request: ReferralRecommendationRequest,
    db: Session = Depends(get_db)
):
    hospitals = db.query(Hospital).all()
    scored = referral_engine.rank_hospitals(
        originating_lat=request.originating_lat,
        originating_lng=request.originating_lng,
        required_specialty=request.required_specialty,
        required_bed_type=request.required_bed_type,
        hospitals=hospitals,
        insurance_scheme=request.insurance_scheme,
        urgency_level=request.urgency_level
    )
    return scored

@router.post("/request", response_model=ReferralResponse)
async def create_referral_request(
    payload: ReferralRequestCreate,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == payload.destination_hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Destination hospital not found")

    referral = ReferralRequest(
        patient_name=payload.patient_name,
        patient_age=payload.patient_age,
        required_specialty=payload.required_specialty,
        required_bed_type=payload.required_bed_type,
        originating_lat=payload.originating_lat,
        originating_lng=payload.originating_lng,
        destination_hospital_id=payload.destination_hospital_id,
        urgency_level=payload.urgency_level,
        status="DISPATCHED",
        notes=payload.notes
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)

    # Assign an available ambulance
    amb = db.query(Ambulance).filter(
        Ambulance.hospital_id == payload.destination_hospital_id,
        Ambulance.status == "AVAILABLE"
    ).first()
    
    if not amb:
        # Fallback to any available ambulance in system
        amb = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").first()

    amb_info = None
    if amb:
        amb.status = "DISPATCHED"
        amb.current_referral_id = referral.id
        db.commit()
        amb_info = {
            "id": amb.id,
            "registration_number": amb.registration_number,
            "driver_name": amb.driver_name,
            "driver_phone": amb.driver_phone,
            "current_lat": amb.current_lat,
            "current_lng": amb.current_lng,
            "status": amb.status
        }

    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="emergency_dispatcher@medflow.in",
        actor_role="SYSTEM",
        action="SMART_REFERRAL_DISPATCH",
        resource_type="REFERRAL",
        resource_id=str(referral.id),
        previous_value="None",
        new_value=f"Patient: {payload.patient_name}, Target: {hosp.name}, Bed: {payload.required_bed_type}",
        hospital_id=hosp.id
    )

    # Broadcast Live WebSocket
    await manager.broadcast("REFERRAL_DISPATCHED", {
        "referral_id": referral.id,
        "patient_name": referral.patient_name,
        "destination_hospital_name": hosp.name,
        "specialty": referral.required_specialty,
        "bed_type": referral.required_bed_type,
        "urgency_level": referral.urgency_level,
        "ambulance": amb_info
    })

    return {
        "id": referral.id,
        "patient_name": referral.patient_name,
        "patient_age": referral.patient_age,
        "required_specialty": referral.required_specialty,
        "required_bed_type": referral.required_bed_type,
        "destination_hospital_id": hosp.id,
        "destination_hospital_name": hosp.name,
        "status": referral.status,
        "urgency_level": referral.urgency_level,
        "created_at": referral.created_at,
        "ambulance": amb_info
    }

@router.get("", response_model=List[ReferralResponse])
def get_referrals(destination_hospital_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ReferralRequest).order_by(ReferralRequest.id.desc())
    if destination_hospital_id:
        query = query.filter(ReferralRequest.destination_hospital_id == destination_hospital_id)
    
    referrals = query.all()
    results = []
    for r in referrals:
        amb_info = None
        if r.ambulance:
            amb_info = {
                "id": r.ambulance.id,
                "registration_number": r.ambulance.registration_number,
                "driver_name": r.ambulance.driver_name,
                "driver_phone": r.ambulance.driver_phone,
                "current_lat": r.ambulance.current_lat,
                "current_lng": r.ambulance.current_lng,
                "status": r.ambulance.status
            }
        results.append({
            "id": r.id,
            "patient_name": r.patient_name,
            "patient_age": r.patient_age,
            "required_specialty": r.required_specialty,
            "required_bed_type": r.required_bed_type,
            "destination_hospital_id": r.destination_hospital_id,
            "destination_hospital_name": r.destination_hospital.name if r.destination_hospital else "Hospital",
            "status": r.status,
            "urgency_level": r.urgency_level,
            "created_at": r.created_at,
            "ambulance": amb_info
        })
    return results
