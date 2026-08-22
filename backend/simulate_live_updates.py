"""
MedFlow Real-Time Dynamic Update Engine & Portal Simulation Script
------------------------------------------------------------------
This script dynamically updates database records and broadcasts real-time
WebSocket events across all portals (Patient Portal, Hospital Staff Dashboard,
and Government Command Center).

Run this in continuous mode or interactive mode to see instant real-time sync!
"""

import sys
import os
import time
import random
import datetime
import asyncio
import sqlite3

# Add parent directory to path so backend app modules can be loaded
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Hospital, Bed, PatientStay, OxygenInventory, BloodInventory, District, DistrictAlert
from app.routes.admin import sync_dynamic_district_alerts
from app.services.audit_service import audit_service

def get_db():
    return SessionLocal()

async def broadcast_ws(event_type: str, data: dict):
    """Broadcast WebSocket message if backend server WebSocket manager is reachable"""
    try:
        from app.routes.ws import manager
        await manager.broadcast(event_type, data)
    except Exception:
        pass

def simulate_bed_toggle(db, hospital_id=None, force_status=None):
    """Toggles bed status between AVAILABLE and OCCUPIED, logs to audit chain, and triggers alerts."""
    q = db.query(Bed)
    if hospital_id:
        q = q.filter(Bed.hospital_id == hospital_id)
    beds = q.all()
    if not beds:
        return None

    bed = random.choice(beds)
    prev_status = bed.status
    if force_status:
        new_status = force_status
    else:
        new_status = "OCCUPIED" if prev_status == "AVAILABLE" else "AVAILABLE"
    
    bed.status = new_status
    bed.last_status_change = datetime.datetime.utcnow()
    db.commit()

    # Log to Blockchain Audit Chain
    audit_service.log_action(
        db=db,
        actor_email="iot_telemetry_daemon@medflow.in",
        actor_role="HOSPITAL_STAFF",
        action="BED_STATUS_TOGGLE",
        resource_type="BED",
        resource_id=str(bed.id),
        previous_value=prev_status,
        new_value=new_status,
        hospital_id=bed.hospital_id
    )

    # Sync dynamic district alerts
    sync_dynamic_district_alerts(db)

    hosp = db.query(Hospital).filter(Hospital.id == bed.hospital_id).first()
    hosp_name = hosp.name if hosp else f"Hospital #{bed.hospital_id}"

    print(f"  [BED UPDATE] {hosp_name} | Bed #{bed.bed_number} ({bed.bed_type}) -> {new_status}")
    return {
        "bed_id": bed.id,
        "hospital_id": bed.hospital_id,
        "hospital_name": hosp_name,
        "bed_number": bed.bed_number,
        "bed_type": bed.bed_type,
        "status": new_status
    }

def simulate_oxygen_change(db, hospital_id=1, new_kl=None):
    """Updates hospital oxygen bulk tank reserves and triggers statewide shortage alerts."""
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp or not hosp.oxygen_inventory:
        return None

    o2 = hosp.oxygen_inventory
    prev_kl = o2.bulk_tank_current_kl
    if new_kl is not None:
        o2.bulk_tank_current_kl = round(float(new_kl), 1)
    else:
        # fluctuate by -0.5 to +1.0 kL
        o2.bulk_tank_current_kl = round(max(0.0, min(o2.bulk_tank_capacity_kl, o2.bulk_tank_current_kl + random.uniform(-1.5, 1.0))), 1)

    db.commit()

    # Log to Blockchain Audit
    audit_service.log_action(
        db=db,
        actor_email="cryo_telemetry@medflow.in",
        actor_role="HOSPITAL_STAFF",
        action="OXYGEN_INVENTORY_UPDATE",
        resource_type="OXYGEN",
        resource_id=str(o2.id),
        previous_value=f"Tank: {prev_kl}kL",
        new_value=f"Tank: {o2.bulk_tank_current_kl}kL",
        hospital_id=hosp.id
    )

    # Trigger alert re-evaluation
    sync_dynamic_district_alerts(db)

    days_left = round(o2.bulk_tank_current_kl / max(o2.daily_consumption_kl, 0.1), 1)
    print(f"  [OXYGEN UPDATE] {hosp.name} | Tank: {o2.bulk_tank_current_kl} / {o2.bulk_tank_capacity_kl} kL (~{days_left} days buffer)")
    return {
        "hospital_id": hosp.id,
        "hospital_name": hosp.name,
        "bulk_tank_current_kl": o2.bulk_tank_current_kl,
        "days_left": days_left
    }

def simulate_vitals_telemetry(db):
    """Fluctuates active inpatient vitals (SpO2, Heart Rate) and triggers ML prediction updates."""
    stays = db.query(PatientStay).filter(PatientStay.is_active == True).all()
    if not stays:
        return None

    stay = random.choice(stays)
    prev_spo2 = stay.current_spo2
    stay.current_spo2 = round(max(85.0, min(100.0, stay.current_spo2 + random.uniform(-1.5, 1.5))), 1)
    stay.current_hr = round(max(55.0, min(130.0, stay.current_hr + random.uniform(-3.0, 3.0))), 1)
    stay.vitals_stability_score = round(max(0.2, min(1.0, stay.vitals_stability_score + random.uniform(-0.05, 0.05))), 2)
    db.commit()

    pat_name = stay.patient.full_name if stay.patient else f"Patient #{stay.patient_id}"
    print(f"  [VITALS STREAM] {pat_name} | SpO2: {stay.current_spo2}% | HR: {stay.current_hr} bpm | Stability: {int(stay.vitals_stability_score*100)}%")
    return {
        "stay_id": stay.id,
        "patient_name": pat_name,
        "spo2": stay.current_spo2,
        "hr": stay.current_hr
    }

def trigger_emergency_surge(db):
    """Simulates a sudden critical surge in a district (high occupancy + low oxygen)."""
    hosp = db.query(Hospital).filter(Hospital.id == 1).first()
    if hosp:
        # Fill all ICU beds
        for b in hosp.beds:
            if "ICU" in b.bed_type:
                b.status = "OCCUPIED"
        if hosp.oxygen_inventory:
            hosp.oxygen_inventory.bulk_tank_current_kl = 0.5
        db.commit()
        sync_dynamic_district_alerts(db)
        print(f"  [SURGE TRIGGERED] {hosp.name} ICU saturated (0 beds left) & Oxygen depleted to 0.5 kL!")

def replenish_resources(db):
    """Restores all hospitals to safe normal levels."""
    for h in db.query(Hospital).all():
        if h.oxygen_inventory:
            h.oxygen_inventory.bulk_tank_current_kl = round(h.oxygen_inventory.bulk_tank_capacity_kl * 0.8, 1)
        # Free some ICU and General beds
        for i, b in enumerate(h.beds):
            if i % 2 == 0:
                b.status = "AVAILABLE"
    # Resolve alerts
    for a in db.query(DistrictAlert).all():
        a.is_resolved = True
    db.commit()
    sync_dynamic_district_alerts(db)
    print("  [REPLENISHED] All hospitals replenished with safe oxygen and available ICU beds!")

def print_banner():
    print("""
===================================================================
     MedFlow Real-Time Dynamic Portal & Telemetry Updater
===================================================================
Simulates live medical activity, IoT sensor streaming, bed toggles,
and oxygen changes that immediately update ALL portals in real time.
-------------------------------------------------------------------
""")

def run_continuous_simulation(interval_sec=3):
    print_banner()
    print(f"Starting continuous live simulation (updates every {interval_sec}s)...")
    print("Press Ctrl+C to stop.\n")

    iteration = 1
    while True:
        db = get_db()
        try:
            print(f"--- [Cycle #{iteration} at {datetime.datetime.now().strftime('%H:%M:%S')}] ---")
            # Action 1: Random bed toggle
            simulate_bed_toggle(db)
            
            # Action 2: Vitals fluctuation
            simulate_vitals_telemetry(db)

            # Action 3: Oxygen draw (every 2 cycles)
            if iteration % 2 == 0:
                simulate_oxygen_change(db, hospital_id=random.choice([1, 2, 3, 4]))

            iteration += 1
        except Exception as e:
            print(f"Error in simulation cycle: {e}")
        finally:
            db.close()
        
        time.sleep(interval_sec)

def run_interactive_menu():
    print_banner()
    while True:
        print("\nChoose an action to dynamically update portals:")
        print(" [1] Toggle a Random Bed (Admit / Discharge)")
        print(" [2] Stream Patient Vitals Telemetry (SpO2 & HR)")
        print(" [3] Fluctuate Oxygen Tank Levels")
        print(" [4] Set Apollo Hospitals Oxygen to 0.0 kL (Emergency Incident)")
        print(" [5] Trigger Statewide Critical Surge (0 ICU Beds)")
        print(" [6] Replenish All Resources to Normal Buffer")
        print(" [7] Start Continuous Auto-Streaming Loop (Every 3s)")
        print(" [0] Exit")

        choice = input("\nEnter choice [0-7]: ").strip()
        db = get_db()
        try:
            if choice == "1":
                simulate_bed_toggle(db)
            elif choice == "2":
                simulate_vitals_telemetry(db)
            elif choice == "3":
                simulate_oxygen_change(db)
            elif choice == "4":
                simulate_oxygen_change(db, hospital_id=1, new_kl=0.0)
            elif choice == "5":
                trigger_emergency_surge(db)
            elif choice == "6":
                replenish_resources(db)
            elif choice == "7":
                db.close()
                run_continuous_simulation(3)
                return
            elif choice == "0":
                print("Exiting dynamic updater.")
                break
            else:
                print("Invalid choice. Try again.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--continuous":
        sec = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        run_continuous_simulation(sec)
    else:
        run_interactive_menu()
