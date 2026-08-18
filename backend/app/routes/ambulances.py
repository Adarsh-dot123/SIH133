from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ambulance, Hospital
from app.schemas import AmbulanceResponse
from app.services.referral_engine import calculate_haversine_distance
from app.routes.ws import manager

router = APIRouter(prefix="/ambulances", tags=["Ambulance Fleet & GPS"])

@router.get("", response_model=List[AmbulanceResponse])
def get_ambulances(
    hospital_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ambulance)
    if hospital_id:
        query = query.filter(Ambulance.hospital_id == hospital_id)
    if status:
        query = query.filter(Ambulance.status == status)

    ambulances = query.all()
    results = []
    for a in ambulances:
        results.append({
            "id": a.id,
            "registration_number": a.registration_number,
            "hospital_id": a.hospital_id,
            "hospital_name": a.hospital.name if a.hospital else "Emergency Base",
            "ambulance_type": a.ambulance_type,
            "current_lat": a.current_lat,
            "current_lng": a.current_lng,
            "status": a.status,
            "driver_name": a.driver_name,
            "driver_phone": a.driver_phone,
            "current_referral_id": a.current_referral_id
        })
    return results

@router.get("/nearest", response_model=AmbulanceResponse)
def get_nearest_ambulance(
    lat: float,
    lng: float,
    ambulance_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE")
    if ambulance_type:
        query = query.filter(Ambulance.ambulance_type == ambulance_type)
    
    ambulances = query.all()
    if not ambulances:
        raise HTTPException(status_code=404, detail="No available ambulances found nearby")

    best_amb = None
    min_dist = float("inf")
    for a in ambulances:
        dist = calculate_haversine_distance(lat, lng, a.current_lat, a.current_lng)
        if dist < min_dist:
            min_dist = dist
            best_amb = a

    return {
        "id": best_amb.id,
        "registration_number": best_amb.registration_number,
        "hospital_id": best_amb.hospital_id,
        "hospital_name": best_amb.hospital.name if best_amb.hospital else "Emergency Base",
        "ambulance_type": best_amb.ambulance_type,
        "current_lat": best_amb.current_lat,
        "current_lng": best_amb.current_lng,
        "status": best_amb.status,
        "driver_name": best_amb.driver_name,
        "driver_phone": best_amb.driver_phone,
        "current_referral_id": best_amb.current_referral_id
    }

@router.patch("/{ambulance_id}/location")
async def update_ambulance_location(
    ambulance_id: int,
    lat: float,
    lng: float,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.current_lat = lat
    amb.current_lng = lng
    if status:
        amb.status = status
    db.commit()

    await manager.broadcast("AMBULANCE_LOCATION_UPDATED", {
        "ambulance_id": amb.id,
        "registration_number": amb.registration_number,
        "current_lat": lat,
        "current_lng": lng,
        "status": amb.status
    })

    return {"message": "Location updated", "ambulance_id": amb.id}
