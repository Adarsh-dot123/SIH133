from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Hospital, District
from app.schemas import SimulationRequest, SimulationResult

router = APIRouter(prefix="/simulation", tags=["Digital Twin Simulation"])

@router.post("/run", response_model=SimulationResult)
def run_digital_twin_simulation(
    payload: SimulationRequest,
    db: Session = Depends(get_db)
):
    hospitals = db.query(Hospital).all()
    districts = db.query(District).all()

    total_beds = sum(len(h.beds) for h in hospitals)
    total_icu = sum(sum(1 for b in h.beds if "ICU" in b.bed_type) for h in hospitals)
    avail_icu = sum(sum(1 for b in h.beds if "ICU" in b.bed_type and b.status == "AVAILABLE") for h in hospitals)
    total_o2_kl = sum(h.oxygen_inventory.bulk_tank_current_kl for h in hospitals if h.oxygen_inventory)
    daily_o2_consumption = sum(h.oxygen_inventory.daily_consumption_kl for h in hospitals if h.oxygen_inventory)

    # Surge multipliers
    surge_pct = payload.patient_influx_surge_pct
    icu_mult = payload.icu_demand_multiplier
    o2_mult = payload.oxygen_consumption_multiplier

    # Baseline daily admissions in state ~ 120 patients
    baseline_admissions = 120
    projected_daily_admissions = int(baseline_admissions * (1.0 + (surge_pct / 100.0)))
    total_projected_admissions = projected_daily_admissions * payload.duration_days

    # Daily new ICU demand
    daily_new_icu_needed = int(projected_daily_admissions * 0.20 * icu_mult)
    
    # Calculate when ICU depletes
    # Net daily ICU change = new ICU needed - average daily discharges (~8)
    net_daily_icu_draw = max(1, daily_new_icu_needed - 8)
    icu_deficit_days = avail_icu / net_daily_icu_draw
    icu_deficit_hours = max(2, int(icu_deficit_days * 24))

    # Calculate oxygen depletion
    projected_daily_o2 = daily_o2_consumption * o2_mult
    o2_stockout_days = round(total_o2_kl / max(projected_daily_o2, 0.1), 1)

    # Generate timeline forecast
    timeline = []
    current_sim_icu = avail_icu
    current_sim_o2 = total_o2_kl

    for day in range(1, payload.duration_days + 1):
        current_sim_icu = max(0, current_sim_icu - net_daily_icu_draw)
        current_sim_o2 = max(0.0, round(current_sim_o2 - projected_daily_o2, 1))
        
        timeline.append({
            "day": f"Day {day}",
            "projected_admissions": projected_daily_admissions * day,
            "remaining_icu_beds": current_sim_icu,
            "remaining_oxygen_kl": current_sim_o2,
            "icu_utilization_pct": min(100.0, round(((total_icu - current_sim_icu) / max(total_icu, 1)) * 100.0, 1))
        })

    # Critical districts identification
    crit_districts = [d.name for d in districts if d.alert_status != "NORMAL"]
    if not crit_districts:
        crit_districts = [districts[0].name if districts else "Chennai"]

    # Actionable Mitigation recommendations
    recommendations = [
        f"Activate Tier-2 Step-Down Discharge Protocols: Fast-track discharge for patients with ML confidence >= 85%.",
        f"Issue immediate moratorium on elective surgeries requiring post-op ICU care during the {payload.duration_days}-day surge.",
        f"Request emergency cryogenic oxygen tanker dispatch from regional supply hub (Refill target: +{int(projected_daily_o2 * 4)} kL).",
        f"Activate inter-district ambulance transit corridors connecting {crit_districts[0]} to neighboring tertiary facilities."
    ]

    return {
        "scenario_type": payload.scenario_type,
        "projected_total_admissions": total_projected_admissions,
        "projected_icu_deficit_hours": icu_deficit_hours,
        "projected_oxygen_stockout_days": o2_stockout_days,
        "affected_hospitals_count": len(hospitals),
        "critical_districts": crit_districts,
        "timeline_forecast": timeline,
        "mitigation_recommendations": recommendations
    }
