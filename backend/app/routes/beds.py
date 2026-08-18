import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bed, Hospital, BedStatus
from app.schemas import BedResponse, BedToggleRequest, BedCreateRequest
from app.services.audit_service import audit_service
from app.routes.ws import manager

router = APIRouter(prefix="/beds", tags=["Bed Management"])

@router.get("", response_model=List[BedResponse])
def get_beds(
    hospital_id: Optional[int] = None,
    ward_name: Optional[str] = None,
    bed_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Bed)
    if hospital_id:
        query = query.filter(Bed.hospital_id == hospital_id)
    if ward_name:
        query = query.filter(Bed.ward_name == ward_name)
    if bed_type:
        query = query.filter(Bed.bed_type == bed_type)
    if status:
        query = query.filter(Bed.status == status)

    beds = query.all()
    results = []
    for b in beds:
        stay_info = None
        if b.current_stay and b.current_stay.is_active:
            stay_info = {
                "patient_name": b.current_stay.patient.full_name if b.current_stay.patient else "Patient",
                "diagnosis": b.current_stay.diagnosis_category,
                "treatment_stage": b.current_stay.treatment_stage,
                "spo2": b.current_stay.current_spo2
            }
        results.append({
            "id": b.id,
            "hospital_id": b.hospital_id,
            "ward_name": b.ward_name,
            "bed_number": b.bed_number,
            "bed_type": b.bed_type,
            "status": b.status,
            "is_iot_enabled": b.is_iot_enabled,
            "iot_sensor_id": b.iot_sensor_id,
            "last_updated": b.last_updated,
            "patient_stay": stay_info
        })
    return results

@router.patch("/{bed_id}")
async def toggle_bed_status(
    bed_id: int,
    payload: BedToggleRequest,
    db: Session = Depends(get_db)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    old_status = bed.status
    bed.status = payload.status
    bed.last_updated = datetime.datetime.utcnow()
    db.commit()

    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="nurse_ward@medflow.in",
        actor_role="HOSPITAL_STAFF",
        action="BED_STATUS_TOGGLE",
        resource_type="BED",
        resource_id=str(bed.id),
        previous_value=f"Bed #{bed.bed_number} ({bed.ward_name}): {old_status}",
        new_value=f"Bed #{bed.bed_number} ({bed.ward_name}): {bed.status}",
        hospital_id=bed.hospital_id
    )

    # Broadcast Live WebSocket update
    await manager.broadcast("BED_STATUS_CHANGED", {
        "bed_id": bed.id,
        "hospital_id": bed.hospital_id,
        "ward_name": bed.ward_name,
        "bed_number": bed.bed_number,
        "bed_type": bed.bed_type,
        "old_status": old_status,
        "new_status": bed.status,
        "timestamp": bed.last_updated.isoformat()
    })

    return {
        "message": f"Bed #{bed.bed_number} updated to {bed.status}",
        "bed_id": bed.id,
        "status": bed.status
    }

@router.post("/batch-toggle")
async def batch_toggle_beds(
    bed_ids: List[int],
    new_status: str,
    db: Session = Depends(get_db)
):
    """Fallback quick toggle mechanism for non-HMS hospitals & shift handovers"""
    updated_beds = []
    for b_id in bed_ids:
        bed = db.query(Bed).filter(Bed.id == b_id).first()
        if bed:
            old_status = bed.status
            bed.status = new_status
            bed.last_updated = datetime.datetime.utcnow()
            updated_beds.append(bed.id)

    db.commit()

    # Broadcast batch update
    await manager.broadcast("BED_STATUS_CHANGED", {
        "batch_update": True,
        "bed_ids": updated_beds,
        "new_status": new_status,
        "count": len(updated_beds)
    })

    return {"message": f"Successfully batch updated {len(updated_beds)} beds to {new_status}"}

@router.post("", response_model=BedResponse)
def create_bed(
    hospital_id: int,
    payload: BedCreateRequest,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    bed = Bed(
        hospital_id=hospital_id,
        ward_name=payload.ward_name,
        bed_number=payload.bed_number,
        bed_type=payload.bed_type,
        status=BedStatus.AVAILABLE,
        is_iot_enabled=payload.is_iot_enabled
    )
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed
