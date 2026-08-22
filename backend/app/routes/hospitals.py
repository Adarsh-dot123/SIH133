import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hospital, Bed, OxygenInventory, BloodInventory, District, PatientStay
from app.schemas import HospitalSummary, HospitalDetailResponse, OxygenUpdateRequest, BloodUpdateRequest
from app.services.ml_engine import ml_engine
from app.services.audit_service import audit_service
from app.routes.ws import manager

router = APIRouter(prefix="/hospitals", tags=["Hospitals & Resources"])

def build_hospital_summary(hosp: Hospital) -> dict:
    specs = json.loads(hosp.specialties_json) if hosp.specialties_json else []
    
    # Live Real-time Bed Counts
    gen_total = sum(1 for b in hosp.beds if b.bed_type == "GENERAL")
    gen_avail = sum(1 for b in hosp.beds if b.bed_type == "GENERAL" and b.status == "AVAILABLE")
    
    icu_total = sum(1 for b in hosp.beds if "ICU" in b.bed_type)
    icu_avail = sum(1 for b in hosp.beds if "ICU" in b.bed_type and b.status == "AVAILABLE")
    
    vent_total = sum(1 for b in hosp.beds if b.bed_type == "VENTILATOR")
    vent_avail = sum(1 for b in hosp.beds if b.bed_type == "VENTILATOR" and b.status == "AVAILABLE")
    
    o2_total = sum(1 for b in hosp.beds if b.bed_type == "OXYGEN_SUPPORTED")
    o2_avail = sum(1 for b in hosp.beds if b.bed_type == "OXYGEN_SUPPORTED" and b.status == "AVAILABLE")

    # Predictive Bed Turnover calculation
    active_stays = [s for s in hosp.patient_stays if s.is_active]
    current_free = {"GENERAL": gen_avail, "ICU": icu_avail, "VENTILATOR": vent_avail}
    forecast = ml_engine.aggregate_hospital_forecast(current_free, active_stays)

    # Dynamic Hospital Criticality Determination
    total_all_beds = gen_total + icu_total + vent_total + o2_total
    avail_all_beds = gen_avail + icu_avail + vent_avail + o2_avail
    
    status = "NORMAL"
    if (icu_total > 0 and (icu_avail == 0 or (icu_avail / icu_total) <= 0.10)):
        status = "CRITICAL"
    elif total_all_beds > 0 and (avail_all_beds == 0 or (avail_all_beds / total_all_beds) <= 0.10):
        status = "CRITICAL"
    elif vent_total > 0 and vent_avail == 0:
        status = "CRITICAL"
    elif (icu_total > 0 and (icu_avail / icu_total) <= 0.25) or (total_all_beds > 0 and (avail_all_beds / total_all_beds) <= 0.20):
        status = "WARNING"

    o2_status = "ADEQUATE"
    if hosp.oxygen_inventory:
        days_left = hosp.oxygen_inventory.bulk_tank_current_kl / max(hosp.oxygen_inventory.daily_consumption_kl, 0.1)
        if hosp.oxygen_inventory.bulk_tank_current_kl <= 3.0 or days_left <= 2.0:
            o2_status = "CRITICAL"
            status = "CRITICAL" # oxygen critical forces hospital critical
        elif hosp.oxygen_inventory.bulk_tank_current_kl <= 6.0 or days_left <= 3.5:
            o2_status = "WARNING"
            if status == "NORMAL":
                status = "WARNING"

    return {
        "id": hosp.id,
        "name": hosp.name,
        "district_id": hosp.district_id,
        "district_name": hosp.district.name if hosp.district else "Tamil Nadu",
        "state": hosp.district.state if hosp.district else "Tamil Nadu",
        "address": hosp.address,
        "latitude": hosp.latitude,
        "longitude": hosp.longitude,
        "phone": hosp.phone,
        "email": hosp.email,
        "is_empanelled_pmjay": hosp.is_empanelled_pmjay,
        "is_empanelled_cghs": hosp.is_empanelled_cghs,
        "has_hms": hosp.has_hms,
        "rating": hosp.rating,
        "specialties": specs,
        "general_beds_available": gen_avail,
        "general_beds_total": gen_total,
        "icu_beds_available": icu_avail,
        "icu_beds_total": icu_total,
        "ventilators_available": vent_avail,
        "ventilators_total": vent_total,
        "oxygen_beds_available": o2_avail,
        "oxygen_beds_total": o2_total,
        "oxygen_status": o2_status,
        "status": status,
        "predicted_available_12h": forecast["predicted_general_freed_12h"] + forecast["predicted_icu_freed_12h"],
        "predicted_available_24h": forecast["predicted_general_freed_24h"] + forecast["predicted_icu_freed_24h"],
        "predicted_icu_available_12h": forecast["predicted_icu_freed_12h"],
        "predicted_icu_available_24h": forecast["predicted_icu_freed_24h"]
    }

@router.get("", response_model=List[HospitalSummary])
def get_hospitals(
    district_id: Optional[int] = None,
    specialty: Optional[str] = None,
    pmjay_only: bool = False,
    icu_available_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Hospital)
    if district_id:
        query = query.filter(Hospital.district_id == district_id)
    if pmjay_only:
        query = query.filter(Hospital.is_empanelled_pmjay == True)
    if search:
        query = query.filter(Hospital.name.ilike(f"%{search}%"))

    hospitals = query.all()
    results = []
    
    for h in hospitals:
        summary = build_hospital_summary(h)
        if specialty and not any(specialty.lower() in s.lower() for s in summary["specialties"]):
            continue
        if icu_available_only and summary["icu_beds_available"] == 0:
            continue
        results.append(summary)

    return results

@router.get("/{hospital_id}", response_model=HospitalDetailResponse)
def get_hospital_detail(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    summary = build_hospital_summary(hosp)
    
    # Beds representation
    bed_list = []
    for b in hosp.beds:
        stay_info = None
        if b.current_stay and b.current_stay.is_active:
            stay_info = {
                "patient_name": b.current_stay.patient.full_name if b.current_stay.patient else "Patient",
                "diagnosis": b.current_stay.diagnosis_category,
                "treatment_stage": b.current_stay.treatment_stage,
                "spo2": b.current_stay.current_spo2
            }
        bed_list.append({
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

    # Oxygen
    o2_res = None
    if hosp.oxygen_inventory:
        days_left = round(hosp.oxygen_inventory.bulk_tank_current_kl / max(hosp.oxygen_inventory.daily_consumption_kl, 0.1), 1)
        o2_res = {
            "id": hosp.oxygen_inventory.id,
            "hospital_id": hosp.id,
            "bulk_tank_capacity_kl": hosp.oxygen_inventory.bulk_tank_capacity_kl,
            "bulk_tank_current_kl": hosp.oxygen_inventory.bulk_tank_current_kl,
            "cylinder_d_type_count": hosp.oxygen_inventory.cylinder_d_type_count,
            "cylinder_b_type_count": hosp.oxygen_inventory.cylinder_b_type_count,
            "daily_consumption_kl": hosp.oxygen_inventory.daily_consumption_kl,
            "estimated_days_left": days_left,
            "last_refill_date": hosp.oxygen_inventory.last_refill_date
        }

    # Blood
    blood_list = [
        {
            "id": bi.id,
            "hospital_id": bi.hospital_id,
            "blood_group": bi.blood_group,
            "units_available": bi.units_available,
            "units_critical_threshold": bi.units_critical_threshold,
            "last_updated": bi.last_updated
        }
        for bi in hosp.blood_inventories
    ]

    return {
        **summary,
        "oxygen_inventory": o2_res,
        "blood_inventory": blood_list,
        "beds": bed_list
    }

@router.patch("/{hospital_id}/oxygen")
async def update_oxygen_inventory(
    hospital_id: int,
    payload: OxygenUpdateRequest,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp or not hosp.oxygen_inventory:
        raise HTTPException(status_code=404, detail="Hospital or oxygen inventory not found")
    
    prev_val = f"Tank: {hosp.oxygen_inventory.bulk_tank_current_kl}kL, D-Cyl: {hosp.oxygen_inventory.cylinder_d_type_count}"
    
    if payload.bulk_tank_current_kl is not None:
        hosp.oxygen_inventory.bulk_tank_current_kl = payload.bulk_tank_current_kl
    if payload.cylinder_d_type_count is not None:
        hosp.oxygen_inventory.cylinder_d_type_count = payload.cylinder_d_type_count
    if payload.cylinder_b_type_count is not None:
        hosp.oxygen_inventory.cylinder_b_type_count = payload.cylinder_b_type_count
    if payload.daily_consumption_kl is not None:
        hosp.oxygen_inventory.daily_consumption_kl = payload.daily_consumption_kl

    new_val = f"Tank: {hosp.oxygen_inventory.bulk_tank_current_kl}kL, D-Cyl: {hosp.oxygen_inventory.cylinder_d_type_count}"

    db.commit()

    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="staff@medflow.in",
        actor_role="HOSPITAL_STAFF",
        action="OXYGEN_INVENTORY_UPDATE",
        resource_type="OXYGEN",
        resource_id=str(hosp.oxygen_inventory.id),
        previous_value=prev_val,
        new_value=new_val,
        hospital_id=hospital_id
    )

    # Synchronize dynamic alerts across state
    try:
        from app.routes.admin import sync_dynamic_district_alerts
        sync_dynamic_district_alerts(db)
    except Exception as e:
        print("Alert sync error:", e)

    # Broadcast Live WebSocket update
    await manager.broadcast("OXYGEN_LEVEL_UPDATED", {
        "hospital_id": hospital_id,
        "district_id": hosp.district_id,
        "bulk_tank_current_kl": hosp.oxygen_inventory.bulk_tank_current_kl,
        "cylinder_d_type_count": hosp.oxygen_inventory.cylinder_d_type_count
    })
    await manager.broadcast("DISTRICT_ALERT_TRIGGERED", {
        "district_id": hosp.district_id,
        "alert_type": "OXYGEN_INVENTORY_UPDATE",
        "hospital_name": hosp.name
    })

    return {"message": "Oxygen inventory updated successfully", "hospital_id": hospital_id}

@router.patch("/{hospital_id}/blood")
async def update_blood_inventory(
    hospital_id: int,
    payload: BloodUpdateRequest,
    db: Session = Depends(get_db)
):
    item = db.query(BloodInventory).filter(
        BloodInventory.hospital_id == hospital_id,
        BloodInventory.blood_group == payload.blood_group
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Blood group inventory not found")
    
    prev_units = item.units_available
    item.units_available = payload.units_available
    db.commit()

    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="staff@medflow.in",
        actor_role="HOSPITAL_STAFF",
        action="BLOOD_INVENTORY_UPDATE",
        resource_type="BLOOD",
        resource_id=f"{hospital_id}-{payload.blood_group}",
        previous_value=f"{payload.blood_group}: {prev_units} units",
        new_value=f"{payload.blood_group}: {payload.units_available} units",
        hospital_id=hospital_id
    )

    # Broadcast WebSocket
    await manager.broadcast("BLOOD_INVENTORY_UPDATED", {
        "hospital_id": hospital_id,
        "blood_group": payload.blood_group,
        "units_available": payload.units_available
    })

    return {"message": "Blood inventory updated", "blood_group": payload.blood_group, "units": payload.units_available}

@router.post("/{hospital_id}/medicines/{med_id}/resupply")
async def dispatch_medicine_resupply(
    hospital_id: int,
    med_id: str,
    db: Session = Depends(get_db)
):
    import random
    # Check if hospital exists
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    vehicle_id = f"TN-19-EM-4{random.randint(100, 999)}"
    
    # Update local SQLite database state
    doc_id = f"{hospital_id}_{med_id}"
    mi = db.query(MedicineInventory).filter(MedicineInventory.id == doc_id).first()
    if mi:
        mi.is_restocking = True
        mi.restock_eta = 45
        mi.vehicle = vehicle_id
        db.commit()
    
    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="admin@medflow.gov.in",
        actor_role="GOVT_ADMIN",
        action="MEDICINE_RESUPPLY_DISPATCHED",
        resource_type="MEDICINE",
        resource_id=f"{hospital_id}-{med_id}",
        previous_value="STATUS: CRITICAL",
        new_value=f"VAN DISPATCHED: {vehicle_id}",
        hospital_id=hospital_id
    )

    # Broadcast WebSocket to display live browser notification toasts
    await manager.broadcast("MEDICINE_RESUPPLY_DISPATCHED", {
        "hospital_id": hospital_id,
        "hospital_name": hosp.name,
        "med_id": med_id,
        "vehicle": vehicle_id
    })

    return {
        "message": "Medicine resupply dispatch logged in blockchain audit trail and broadcast successfully",
        "vehicle": vehicle_id
    }
