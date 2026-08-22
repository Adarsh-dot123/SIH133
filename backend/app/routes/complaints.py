import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientComplaint, User, DoctorProfile
from app.routes.auth import get_current_user
from app.routes.ws import manager

router = APIRouter(prefix="/complaints", tags=["Complaints & ICR Calling"])


SPECIALTY_KEYWORDS = {
    "Cardiology": ["heart", "chest", "cardiac", "palpitation", "blood pressure", "hypertension", "angina"],
    "Pediatrics": ["child", "baby", "infant", "kid", "paediatric", "toddler", "newborn"],
    "Neurology": ["headache", "migraine", "seizure", "stroke", "brain", "nerve", "paralysis", "dizziness"],
    "Pulmonology": ["lung", "breath", "cough", "asthma", "oxygen", "pneumonia", "tuberculosis", "tb", "wheeze"],
    "Nephrology": ["kidney", "renal", "dialysis", "urine", "creatinine", "urinary"],
    "General Medicine": [],
}


def detect_specialty(text: str) -> str:
    lower = text.lower()
    for spec, keywords in SPECIALTY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return spec
    return "General Medicine"


class ComplaintCreate(BaseModel):
    title: str
    description: str


class ComplaintStatusUpdate(BaseModel):
    status: str  # OPEN, IN_CALL, RESOLVED
    assigned_doctor_id: Optional[int] = None


class DoctorPeerUpdate(BaseModel):
    peer_id: str


@router.post("", status_code=201)
async def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    specialty = detect_specialty(payload.title + " " + payload.description)
    complaint = PatientComplaint(
        patient_id=current_user.id,
        patient_name=current_user.full_name,
        title=payload.title,
        description=payload.description,
        specialization_needed=specialty,
        status="OPEN",
        created_at=datetime.datetime.utcnow()
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    await manager.broadcast("NEW_COMPLAINT", {
        "id": complaint.id,
        "patient_name": complaint.patient_name,
        "title": complaint.title,
        "specialization_needed": complaint.specialization_needed,
        "created_at": complaint.created_at.isoformat()
    })

    return {
        "id": complaint.id,
        "specialization_needed": specialty,
        "status": "OPEN",
        "message": f"Complaint submitted. Matched to {specialty} specialist."
    }


@router.get("")
def get_complaints(
    specialization: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PatientComplaint)
    if specialization:
        query = query.filter(PatientComplaint.specialization_needed == specialization)
    if status:
        query = query.filter(PatientComplaint.status == status)
    if current_user.role == "PATIENT":
        query = query.filter(PatientComplaint.patient_id == current_user.id)
    return query.order_by(PatientComplaint.created_at.desc()).limit(50).all()


@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(PatientComplaint).filter(PatientComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint.status = payload.status
    if payload.assigned_doctor_id:
        complaint.assigned_doctor_id = payload.assigned_doctor_id
    complaint.updated_at = datetime.datetime.utcnow()
    db.commit()

    await manager.broadcast("COMPLAINT_UPDATED", {
        "id": complaint_id,
        "status": payload.status,
        "assigned_doctor_id": payload.assigned_doctor_id
    })
    return {"id": complaint_id, "status": payload.status}


@router.get("/doctors")
def get_doctors(db: Session = Depends(get_db)):
    profiles = db.query(DoctorProfile).all()
    result = []
    for dp in profiles:
        user = db.query(User).filter(User.id == dp.user_id).first()
        if user:
            result.append({
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "specialization": dp.specialization,
                "hospital_name": dp.hospital_name,
                "is_available": dp.is_available,
                "peer_id": dp.peer_id
            })
    return result


@router.patch("/doctors/peer")
def update_doctor_peer_id(
    payload: DoctorPeerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dp = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not dp:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    dp.peer_id = payload.peer_id
    db.commit()
    return {"peer_id": payload.peer_id}
