from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import datetime

from app.database import get_db
from app.models import District, Hospital, Bed, OxygenInventory, DistrictAlert
from app.schemas import GovtCommandOverview, DistrictOverviewItem, DistrictAlertResponse
from app.services.audit_service import audit_service
from app.routes.ws import manager

router = APIRouter(prefix="/admin", tags=["Government Command Center"])

def compute_district_metrics(dist: District) -> dict:
    hospitals = dist.hospitals
    total_hosps = len(hospitals)
    
    total_beds = 0
    occupied_beds = 0
    total_icu = 0
    avail_icu = 0
    total_vent = 0
    avail_vent = 0
    o2_days_list = []
    critical_hosps = 0

    for h in hospitals:
        for b in h.beds:
            total_beds += 1
            if b.status in ["OCCUPIED", "RESERVED"]:
                occupied_beds += 1
            
            if "ICU" in b.bed_type:
                total_icu += 1
                if b.status == "AVAILABLE":
                    avail_icu += 1
            
            if b.bed_type == "VENTILATOR":
                total_vent += 1
                if b.status == "AVAILABLE":
                    avail_vent += 1

        if h.oxygen_inventory:
            days = h.oxygen_inventory.bulk_tank_current_kl / max(h.oxygen_inventory.daily_consumption_kl, 0.1)
            o2_days_list.append(days)

        # Check critical condition
        hosp_icu = sum(1 for b in h.beds if "ICU" in b.bed_type)
        hosp_avail_icu = sum(1 for b in h.beds if "ICU" in b.bed_type and b.status == "AVAILABLE")
        if hosp_icu > 0 and (hosp_avail_icu / hosp_icu) <= 0.10:
            critical_hosps += 1

    occupancy_pct = round((occupied_beds / max(total_beds, 1)) * 100.0, 1)
    icu_occ_pct = round(((total_icu - avail_icu) / max(total_icu, 1)) * 100.0, 1)
    avg_o2 = round(sum(o2_days_list) / max(len(o2_days_list), 1), 1)

    # Determine district alert status
    alert_status = "NORMAL"
    if total_icu > 0 and (avail_icu / total_icu) <= 0.10:
        alert_status = "CRITICAL"
    elif total_icu > 0 and (avail_icu / total_icu) <= 0.25:
        alert_status = "WARNING"

    return {
        "district_id": dist.id,
        "district_name": dist.name,
        "state": dist.state,
        "latitude": dist.latitude,
        "longitude": dist.longitude,
        "population": dist.population,
        "total_hospitals": total_hosps,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "occupancy_pct": occupancy_pct,
        "total_icu": total_icu,
        "available_icu": avail_icu,
        "icu_occupancy_pct": icu_occ_pct,
        "total_ventilators": total_vent,
        "available_ventilators": avail_vent,
        "avg_oxygen_days": avg_o2,
        "critical_hospitals_count": critical_hosps,
        "alert_status": alert_status
    }

@router.get("/overview", response_model=GovtCommandOverview)
def get_admin_overview(db: Session = Depends(get_db)):
    districts = db.query(District).all()
    dist_metrics = [compute_district_metrics(d) for d in districts]

    total_hosps = sum(d["total_hospitals"] for d in dist_metrics)
    total_beds = sum(d["total_beds"] for d in dist_metrics)
    occupied_beds = sum(d["occupied_beds"] for d in dist_metrics)
    total_icu = sum(d["total_icu"] for d in dist_metrics)
    avail_icu = sum(d["available_icu"] for d in dist_metrics)
    total_vent = sum(d["total_ventilators"] for d in dist_metrics)
    avail_vent = sum(d["available_ventilators"] for d in dist_metrics)
    
    avg_o2 = round(sum(d["avg_oxygen_days"] for d in dist_metrics) / max(len(dist_metrics), 1), 1)
    crit_districts = sum(1 for d in dist_metrics if d["alert_status"] == "CRITICAL")
    
    active_alerts = db.query(DistrictAlert).filter(DistrictAlert.is_resolved == False).count()
    
    # Statewide predictive 24h deficit (calculated based on average load)
    deficit_24h = max(0, int(total_icu * 0.15) - avail_icu)

    return {
        "total_hospitals": total_hosps,
        "total_beds": total_beds,
        "available_beds": total_beds - occupied_beds,
        "total_icu_beds": total_icu,
        "available_icu_beds": avail_icu,
        "icu_occupancy_rate": round(((total_icu - avail_icu) / max(total_icu, 1)) * 100.0, 1),
        "total_ventilators": total_vent,
        "available_ventilators": avail_vent,
        "avg_state_oxygen_days": avg_o2,
        "critical_districts_count": crit_districts,
        "active_critical_alerts": active_alerts,
        "districts": dist_metrics,
        "predicted_statewide_deficit_24h": deficit_24h
    }

@router.get("/alerts", response_model=List[DistrictAlertResponse])
def get_district_alerts(db: Session = Depends(get_db)):
    alerts = db.query(DistrictAlert).order_by(DistrictAlert.id.desc()).all()
    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "district_id": a.district_id,
            "district_name": a.district.name if a.district else "District",
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "recommended_action": a.recommended_action,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at
        })
    return results

@router.post("/reallocate")
async def trigger_resource_reallocation(
    from_district_id: int,
    to_district_id: int,
    resource_type: str,
    quantity: int,
    notes: str = None,
    db: Session = Depends(get_db)
):
    from_dist = db.query(District).filter(District.id == from_district_id).first()
    to_dist = db.query(District).filter(District.id == to_district_id).first()
    if not from_dist or not to_dist:
        raise HTTPException(status_code=404, detail="One or both districts not found")

    # Blockchain Audit Log
    audit_service.log_action(
        db=db,
        actor_email="admin_govt@health.tn.gov.in",
        actor_role="GOVT_ADMIN",
        action="INTER_DISTRICT_RESOURCE_REALLOCATION",
        resource_type=resource_type,
        resource_id=f"{from_district_id}->{to_district_id}",
        previous_value=f"Source: {from_dist.name}",
        new_value=f"Reallocated {quantity} {resource_type} to {to_dist.name}. Reason: {notes or 'Shortage mitigation'}"
    )

    # Broadcast Live Alert
    await manager.broadcast("DISTRICT_ALERT_TRIGGERED", {
        "alert_type": "RESOURCE_REALLOCATION_DISPATCHED",
        "from_district": from_dist.name,
        "to_district": to_dist.name,
        "resource": resource_type,
        "quantity": quantity
    })

    return {
        "message": f"Successfully authorized emergency transfer of {quantity} units of {resource_type} from {from_dist.name} to {to_dist.name}.",
        "status": "DISPATCHED"
    }
