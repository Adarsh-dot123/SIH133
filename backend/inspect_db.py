import sqlite3

conn = sqlite3.connect('medflow.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 1. List all tables with row counts
tables = [t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("=" * 60)
print("TABLES IN medflow.db")
print("=" * 60)
for t in tables:
    count = c.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    print(f"  {t:35s} -> {count} rows")

# 2. Sample Hospitals
print("\n" + "=" * 60)
print("HOSPITALS (first 8)")
print("=" * 60)
for r in c.execute("SELECT id, name, address, district_id, specialties_json, is_empanelled_pmjay FROM hospitals LIMIT 8").fetchall():
    print(f"  [ID {r['id']}] {r['name']}")
    print(f"         Address: {r['address']}")
    print(f"         District: {r['district_id']} | PMJAY: {r['is_empanelled_pmjay']} | Specialties: {r['specialties_json']}")

# 3. Demo Users
print("\n" + "=" * 60)
print("DEMO & REGISTERED USER ACCOUNTS")
print("=" * 60)
for r in c.execute("SELECT id, email, role, full_name, department, designation, abha_id, hashed_password FROM users").fetchall():
    abha_str = f" | ABHA: {r['abha_id']}" if r['abha_id'] else ""
    print(f"  [ID {r['id']}] {r['email']:25s} | Role: {r['role']:15s} | Name: {r['full_name']}")
    print(f"         Dept: {r['department'] or 'General'} | Desig: {r['designation'] or '-'}{abha_str}")
    print(f"         Password Hash: {r['hashed_password'][:28]}... (Bcrypt salted)")

# 4. Districts
print("\n" + "=" * 60)
print("DISTRICTS")
print("=" * 60)
for r in c.execute("SELECT id, name, state FROM districts").fetchall():
    print(f"  [ID {r['id']}] {r['name']}, {r['state']}")

# 5. Sample Beds
print("\n" + "=" * 60)
print("BEDS (first 12)")
print("=" * 60)
for r in c.execute("SELECT id, hospital_id, ward_name, bed_number, bed_type, status FROM beds LIMIT 12").fetchall():
    print(f"  Bed #{r['id']:3d} | Hospital {r['hospital_id']} | {r['ward_name']} - {r['bed_number']} | Type: {r['bed_type']:12s} | Status: {r['status']}")

# 6. Patient Stays
print("\n" + "=" * 60)
print("PATIENT STAYS")
print("=" * 60)
for r in c.execute("SELECT id, patient_id, hospital_id, diagnosis_category, diagnosis_detail, treatment_stage, current_spo2, current_hr, current_map FROM patient_stays").fetchall():
    print(f"  Stay #{r['id']} | Patient {r['patient_id']} @ Hospital {r['hospital_id']}")
    print(f"         Diagnosis: {r['diagnosis_category']} ({r['diagnosis_detail']})")
    print(f"         Stage: {r['treatment_stage']} | SpO2: {r['current_spo2']}% | HR: {r['current_hr']} | MAP: {r['current_map']}")

# 7. Oxygen Inventory
print("\n" + "=" * 60)
print("OXYGEN INVENTORY (first 8)")
print("=" * 60)
for r in c.execute("SELECT hospital_id, bulk_tank_capacity_kl, bulk_tank_current_kl, cylinder_d_type_count FROM oxygen_inventories LIMIT 8").fetchall():
    print(f"  Hospital {r['hospital_id']:2d} | Tank: {r['bulk_tank_current_kl']}/{r['bulk_tank_capacity_kl']} kL | D-Cylinders: {r['cylinder_d_type_count']}")

# 8. Ambulances
print("\n" + "=" * 60)
print("AMBULANCES (first 8)")
print("=" * 60)
for r in c.execute("SELECT id, hospital_id, registration_number, ambulance_type, status, driver_name, driver_phone FROM ambulances LIMIT 8").fetchall():
    print(f"  #{r['id']} | Hospital {r['hospital_id']} | {r['registration_number']} | {r['ambulance_type']} | {r['status']} | Driver: {r['driver_name']} ({r['driver_phone']})")

# 9. Audit Logs (last 5)
print("\n" + "=" * 60)
print("RECENT AUDIT LOG ENTRIES (last 5)")
print("=" * 60)
for r in c.execute("SELECT id, action, resource_type, actor_email, curr_hash FROM audit_logs ORDER BY id DESC LIMIT 5").fetchall():
    print(f"  Block #{r['id']} | {r['action']} | Resource: {r['resource_type']} | Actor: {r['actor_email']}")
    print(f"         Hash: {r['curr_hash'][:32]}...")

# 10. Bed Turnover Predictions
print("\n" + "=" * 60)
print("ML BED TURNOVER PREDICTIONS")
print("=" * 60)
for r in c.execute("SELECT id, patient_stay_id, hospital_id, discharge_prob_12h, discharge_prob_24h, expected_discharge_hours, confidence_score FROM bed_turnover_predictions").fetchall():
    print(f"  Pred #{r['id']} | Stay {r['patient_stay_id']} @ Hospital {r['hospital_id']} | 12h: {r['discharge_prob_12h']:.1%} | 24h: {r['discharge_prob_24h']:.1%} | Remaining: {r['expected_discharge_hours']:.1f}h | Confidence: {r['confidence_score']:.1%}")

conn.close()
print("\n" + "=" * 60)
print("INSPECTION COMPLETE")
print("=" * 60)
