import json
import datetime
import bcrypt
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.models import (
    User, UserRole, District, Hospital, Bed, OxygenInventory,
    BloodInventory, Patient, PatientStay, BedTurnoverPrediction,
    Ambulance, DistrictAlert, AuditLog, MedicineInventory
)
from app.services.ml_engine import ml_engine
from app.services.audit_service import audit_service

def hash_pw(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def seed_database(force_reseed: bool = False):
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    if not force_reseed:
        existing_user_count = db.query(User).count()
        if existing_user_count > 0:
            print(f"Database already initialized ({existing_user_count} user accounts found). Keeping persistent records.")
            # Seed medicine inventory if it's empty even if users exist
            if db.query(MedicineInventory).count() == 0:
                print("Seeding medicine inventories into existing database...")
                try:
                    hospitals = db.query(Hospital).all()
                    med_list = [
                        ("1", "Snake Antivenom", "Lifesaving Venom Immunoglobulin", 45, 1.8, 30),
                        ("2", "Anti-Rabies Vaccine", "Viral Prophylaxis", 18, 2.2, 25),
                        ("3", "Oxytocin Injection", "Maternal Care / Hemorrhage prevention", 60, 3.5, 20),
                        ("4", "Insulin (Human Mix)", "Chronic Care / Endocrinology", 22, 1.5, 25),
                        ("5", "IV Fluids (Normal Saline)", "Critical Care / Rehydration", 80, 6.0, 35),
                        ("6", "Metformin 500mg", "Essential Oral Anti-diabetic", 14, 4.2, 20),
                        ("7", "Paracetamol 650mg", "Basic Analgesic & Antipyretic", 90, 12.0, 30)
                    ]
                    for hosp in hospitals:
                        for m_id, m_name, m_cat, m_stock, m_burn, m_thresh in med_list:
                            mi = MedicineInventory(
                                id=f"{hosp.id}_{m_id}",
                                med_id=m_id,
                                hospital_id=hosp.id,
                                medicine_name=m_name,
                                category=m_cat,
                                stock_level=m_stock,
                                burn_rate=m_burn,
                                min_threshold=m_thresh,
                                is_restocking=False,
                                restock_eta=0,
                                vehicle=""
                            )
                            db.add(mi)
                    db.commit()
                    print("✅ Seeding of medicine inventories completed successfully.")
                except Exception as e:
                    print(f"❌ Failed to seed medicine inventories: {e}")
            db.close()
            return

    if force_reseed:
        print("Re-creating tables in database (forced reseed)...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()

    try:
        print("Seeding Districts...")
        districts_data = [
            {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "pop": 7100000, "status": "WARNING"},
            {"name": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lng": 76.9558, "pop": 3450000, "status": "NORMAL"},
            {"name": "Madurai", "state": "Tamil Nadu", "lat": 9.9252, "lng": 78.1198, "pop": 3030000, "status": "NORMAL"},
            {"name": "Vellore", "state": "Tamil Nadu", "lat": 12.9165, "lng": 79.1325, "pop": 1610000, "status": "NORMAL"},
            {"name": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.7905, "lng": 78.7047, "pop": 2720000, "status": "NORMAL"},
            {"name": "Salem", "state": "Tamil Nadu", "lat": 11.6643, "lng": 78.1460, "pop": 3480000, "status": "NORMAL"},
            {"name": "Kanchipuram", "state": "Tamil Nadu", "lat": 12.8342, "lng": 79.7036, "pop": 1400000, "status": "CRITICAL"},
            {"name": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "pop": 9620000, "status": "NORMAL"},
        ]
        
        district_objs = {}
        for d in districts_data:
            dist = District(
                name=d["name"],
                state=d["state"],
                latitude=d["lat"],
                longitude=d["lng"],
                population=d["pop"],
                alert_status=d["status"],
                icu_threshold_pct=10.0
            )
            db.add(dist)
            db.commit()
            db.refresh(dist)
            district_objs[d["name"]] = dist

        print("Seeding Hospitals...")
        hospitals_data = [
            {
                "name": "Apol Hospitals",
                "district": "Chennai",
                "address": "21 Greams Lane, Thousand Lights, Chennai, TN 600006",
                "lat": 13.0569, "lng": 80.2525,
                "phone": "+91 44 2829 0200", "email": "greams@apollohospitals.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.8,
                "specialties": ["Cardiology", "Neurology", "Oncology", "Nephrology", "Critical Care", "Organ Transplant"],
                "o2_tank": 22.0, "o2_curr": 17.5, "d_cyl": 60, "b_cyl": 30, "consumption": 3.8
            },
            {
                "name": "Sunfeast Hospitals",
                "district": "Chennai",
                "address": "52 1st Main Rd, Gandhi Nagar, Adyar, Chennai, TN 600020",
                "lat": 13.0067, "lng": 80.2575,
                "phone": "+91 44 4289 2222", "email": "contact@fortismalar.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.6,
                "specialties": ["Cardiology", "Pediatrics", "Cardiac Surgery", "Pulmonology", "Orthopedics"],
                "o2_tank": 15.0, "o2_curr": 11.2, "d_cyl": 40, "b_cyl": 20, "consumption": 2.5
            },
            {
                "name": "Kamaraj Hospitals",
                "district": "Chennai",
                "address": "4/112 Mount Poonamallee Rd, Manapakkam, Chennai, TN 600089",
                "lat": 13.0232, "lng": 80.1742,
                "phone": "+91 44 4200 2288", "email": "enquiry@miotinternational.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.7,
                "specialties": ["Orthopedics", "Trauma", "Cardiology", "Nephrology", "Infectious Diseases"],
                "o2_tank": 25.0, "o2_curr": 19.8, "d_cyl": 80, "b_cyl": 45, "consumption": 4.2
            },
            {
                "name": "Nehru Hospitals",
                "district": "Chennai",
                "address": "199 Luz Church Rd, Mylapore, Chennai, TN 600004",
                "lat": 13.0368, "lng": 80.2608,
                "phone": "+91 44 4000 6000", "email": "info@kauveryhospital.com",
                "pmjay": True, "cghs": False, "has_hms": True, "rating": 4.5,
                "specialties": ["Geriatrics", "Pulmonology", "Emergency Medicine", "Gastroenterology"],
                "o2_tank": 12.0, "o2_curr": 8.4, "d_cyl": 35, "b_cyl": 20, "consumption": 2.1
            },
            {
                "name": "Gandhi Hospitals",
                "district": "Chennai",
                "address": "EVR Periyar Salai, Park Town, Chennai, TN 600003",
                "lat": 13.0818, "lng": 80.2785,
                "phone": "+91 44 2530 5000", "email": "deanrgggh@tn.gov.in",
                "pmjay": True, "cghs": True, "has_hms": False, "rating": 4.3,
                "specialties": ["Trauma", "General Surgery", "Infectious/Dengue", "Cardiology", "Burn Care", "Emergency Medicine"],
                "o2_tank": 30.0, "o2_curr": 24.0, "d_cyl": 120, "b_cyl": 70, "consumption": 5.6
            },
            {
                "name": "Ambedkar Hospitals",
                "district": "Chennai",
                "address": "No.1 Ramachandra Nagar, Porur, Chennai, TN 600116",
                "lat": 13.0366, "lng": 80.1415,
                "phone": "+91 44 4592 8500", "email": "contact@sriramachandra.edu.in",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.7,
                "specialties": ["Neurology", "Cardiology", "Oncology", "Pediatrics", "Nephrology", "Pulmonology"],
                "o2_tank": 20.0, "o2_curr": 14.5, "d_cyl": 50, "b_cyl": 30, "consumption": 3.2
            },
            {
                "name": "MGR Hospitals",
                "district": "Vellore",
                "address": "Ida Scudder Rd, Vellore, Tamil Nadu 632004",
                "lat": 12.9250, "lng": 79.1350,
                "phone": "+91 416 228 1000", "email": "directorate@cmcvellore.ac.in",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.9,
                "specialties": ["Cardiology", "Neurology", "Hematology", "Gastroenterology", "Nephrology", "Endocrinology", "Organ Transplant"],
                "o2_tank": 35.0, "o2_curr": 28.5, "d_cyl": 140, "b_cyl": 80, "consumption": 6.0
            },
            {
                "name": "OMR Hospitals",
                "district": "Vellore",
                "address": "Katpadi Main Road, Vellore, TN 632014",
                "lat": 12.9690, "lng": 79.1380,
                "phone": "+91 416 220 5000", "email": "info.vellore@narayanahealth.org",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.5,
                "specialties": ["Cardiology", "Emergency Medicine", "Orthopedics", "General Surgery"],
                "o2_tank": 14.0, "o2_curr": 9.8, "d_cyl": 35, "b_cyl": 18, "consumption": 2.0
            },
            {
                "name": "Sunrise Hospitals",
                "district": "Coimbatore",
                "address": "Avinashi Rd, Peelamedu, Coimbatore, TN 641004",
                "lat": 11.0255, "lng": 77.0125,
                "phone": "+91 422 257 0170", "email": "contact@psgimsr.ac.in",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.7,
                "specialties": ["Cardiology", "Neurology", "Pulmonology", "Pediatrics", "Trauma"],
                "o2_tank": 22.0, "o2_curr": 16.0, "d_cyl": 60, "b_cyl": 30, "consumption": 3.4
            },
            {
                "name": "APJ Hospitals",
                "district": "Coimbatore",
                "address": "313 Mettupalayam Rd, Coimbatore, TN 641043",
                "lat": 11.0200, "lng": 76.9530,
                "phone": "+91 422 248 5000", "email": "enquiry@gangahospital.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.8,
                "specialties": ["Orthopedics", "Trauma", "Plastic Surgery", "Reconstructive Surgery", "Critical Care"],
                "o2_tank": 18.0, "o2_curr": 13.5, "d_cyl": 50, "b_cyl": 25, "consumption": 2.8
            },
            {
                "name": "Meenakshi Mission Hospital & Research Centre",
                "district": "Madurai",
                "address": "Lake Expanse, Melur Main Rd, Madurai, TN 625107",
                "lat": 9.9450, "lng": 78.1580,
                "phone": "+91 452 258 8741", "email": "info@mmhrc.in",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.6,
                "specialties": ["Cardiology", "Oncology", "Neurology", "Nephrology", "Infectious/Dengue"],
                "o2_tank": 20.0, "o2_curr": 15.2, "d_cyl": 55, "b_cyl": 30, "consumption": 3.1
            },
            {
                "name": "Apollo Speciality Hospitals, K.K. Nagar",
                "district": "Madurai",
                "address": "Lake View Road, K.K. Nagar, Madurai, TN 625020",
                "lat": 9.9320, "lng": 78.1480,
                "phone": "+91 452 258 0880", "email": "apollo_madurai@apollohospitals.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.7,
                "specialties": ["Cardiology", "Cardiac Surgery", "Critical Care", "Orthopedics"],
                "o2_tank": 16.0, "o2_curr": 12.0, "d_cyl": 45, "b_cyl": 20, "consumption": 2.6
            },
            {
                "name": "Apollo Speciality Hospitals, Trichy",
                "district": "Tiruchirappalli",
                "address": "Old Palpannai, Chennai By-Pass Road, Trichy, TN 620005",
                "lat": 10.8120, "lng": 78.7180,
                "phone": "+91 431 407 7777", "email": "trichy@apollohospitals.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.6,
                "specialties": ["Cardiology", "Trauma", "Pulmonology", "Gastroenterology"],
                "o2_tank": 14.0, "o2_curr": 10.5, "d_cyl": 40, "b_cyl": 20, "consumption": 2.2
            },
            {
                "name": "Govt Mohan Kumaramangalam Medical College Hospital",
                "district": "Salem",
                "address": "Collectorate Complex, Salem, Tamil Nadu 636001",
                "lat": 11.6620, "lng": 78.1480,
                "phone": "+91 427 244 5555", "email": "gmkmch.salem@tn.gov.in",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.4,
                "specialties": ["Trauma", "Cardiology", "Emergency Medicine", "General Surgery", "Pediatrics"],
                "o2_tank": 16.0, "o2_curr": 12.0, "d_cyl": 45, "b_cyl": 25, "consumption": 2.6
            },
            {
                "name": "Kanchipuram District Govt Headquarters Hospital",
                "district": "Kanchipuram",
                "address": "Railway Station Road, Kanchipuram, TN 631501",
                "lat": 12.8380, "lng": 79.7080,
                "phone": "+91 44 2722 2225", "email": "kanchi_gh@tn.gov.in",
                "pmjay": True, "cghs": True, "has_hms": False, "rating": 4.1,
                "specialties": ["General Medicine", "General Surgery", "Infectious/Dengue", "Emergency Medicine"],
                "o2_tank": 8.0, "o2_curr": 2.8, "d_cyl": 25, "b_cyl": 15, "consumption": 2.4
            },
            {
                "name": "Manipal Hospital, Old Airport Road",
                "district": "Bengaluru Urban",
                "address": "98 HAL Old Airport Rd, Kodihalli, Bengaluru, KA 560017",
                "lat": 12.9580, "lng": 77.6490,
                "phone": "+91 80 2502 4444", "email": "info@manipalhospitals.com",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.8,
                "specialties": ["Cardiology", "Neurology", "Oncology", "Organ Transplant", "Pulmonology", "PICU"],
                "o2_tank": 28.0, "o2_curr": 22.5, "d_cyl": 90, "b_cyl": 50, "consumption": 4.8
            },
            {
                "name": "Narayana Institute of Cardiac Sciences",
                "district": "Bengaluru Urban",
                "address": "258/A Bommasandra Industrial Area, Anekal Taluk, Bengaluru, KA 560099",
                "lat": 12.8120, "lng": 77.6890,
                "phone": "+91 80 7122 2222", "email": "info.nics@narayanahealth.org",
                "pmjay": True, "cghs": True, "has_hms": True, "rating": 4.9,
                "specialties": ["Cardiology", "Cardiac Surgery", "Pediatric Cardiology", "Cardiac ICU", "Vascular Surgery"],
                "o2_tank": 30.0, "o2_curr": 25.0, "d_cyl": 100, "b_cyl": 60, "consumption": 5.2
            }
        ]

        hosp_objs = []
        for hd in hospitals_data:
            dist_obj = district_objs.get(hd["district"])
            hosp = Hospital(
                name=hd["name"],
                district_id=dist_obj.id if dist_obj else 1,
                address=hd["address"],
                latitude=hd["lat"],
                longitude=hd["lng"],
                phone=hd["phone"],
                email=hd["email"],
                is_empanelled_pmjay=hd["pmjay"],
                is_empanelled_cghs=hd["cghs"],
                has_hms=hd["has_hms"],
                rating=hd["rating"],
                specialties_json=json.dumps(hd["specialties"])
            )
            db.add(hosp)
            db.commit()
            db.refresh(hosp)
            hosp_objs.append(hosp)

            # Add Oxygen Inventory
            o2 = OxygenInventory(
                hospital_id=hosp.id,
                bulk_tank_capacity_kl=hd["o2_tank"],
                bulk_tank_current_kl=hd["o2_curr"],
                cylinder_d_type_count=hd["d_cyl"],
                cylinder_b_type_count=hd["b_cyl"],
                daily_consumption_kl=hd["consumption"],
                last_refill_date=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)
            )
            db.add(o2)

            # Add Blood Inventories (All 8 Groups)
            blood_groups = [
                ("A+", 18), ("A-", 6), ("B+", 22), ("B-", 5),
                ("AB+", 12), ("AB-", 3), ("O+", 26), ("O-", 4)
            ]
            for bg, units in blood_groups:
                bi = BloodInventory(
                    hospital_id=hosp.id,
                    blood_group=bg,
                    units_available=units,
                    units_critical_threshold=5
                )
                db.add(bi)

            # Add Medicine Inventories (7 Essential Drugs)
            med_list = [
                ("1", "Snake Antivenom", "Lifesaving Venom Immunoglobulin", 45, 1.8, 30),
                ("2", "Anti-Rabies Vaccine", "Viral Prophylaxis", 18, 2.2, 25),
                ("3", "Oxytocin Injection", "Maternal Care / Hemorrhage prevention", 60, 3.5, 20),
                ("4", "Insulin (Human Mix)", "Chronic Care / Endocrinology", 22, 1.5, 25),
                ("5", "IV Fluids (Normal Saline)", "Critical Care / Rehydration", 80, 6.0, 35),
                ("6", "Metformin 500mg", "Essential Oral Anti-diabetic", 14, 4.2, 20),
                ("7", "Paracetamol 650mg", "Basic Analgesic & Antipyretic", 90, 12.0, 30)
            ]
            for m_id, m_name, m_cat, m_stock, m_burn, m_thresh in med_list:
                mi = MedicineInventory(
                    id=f"{hosp.id}_{m_id}",
                    med_id=m_id,
                    hospital_id=hosp.id,
                    medicine_name=m_name,
                    category=m_cat,
                    stock_level=m_stock,
                    burn_rate=m_burn,
                    min_threshold=m_thresh,
                    is_restocking=False,
                    restock_eta=0,
                    vehicle=""
                )
                db.add(mi)

            # Add Beds across Wards
            # 1. General Ward (15 beds)
            for b_num in range(1, 16):
                status = "AVAILABLE" if b_num > 10 else "OCCUPIED"
                b = Bed(
                    hospital_id=hosp.id,
                    ward_name="General Ward A",
                    bed_number=f"GW-{b_num:02d}",
                    bed_type="GENERAL",
                    status=status,
                    is_iot_enabled=True,
                    iot_sensor_id=f"BED-IOT-{hosp.id}-GW{b_num}"
                )
                db.add(b)

            # 2. Medical ICU (6 beds)
            for b_num in range(1, 7):
                status = "AVAILABLE" if b_num in [4, 5] else "OCCUPIED"
                if hosp.name.startswith("Kanchipuram"):
                    status = "OCCUPIED"
                b = Bed(
                    hospital_id=hosp.id,
                    ward_name="Medical ICU",
                    bed_number=f"ICU-{b_num:02d}",
                    bed_type="ICU",
                    status=status,
                    is_iot_enabled=True,
                    iot_sensor_id=f"BED-IOT-{hosp.id}-ICU{b_num}"
                )
                db.add(b)

            # 3. Cardiac ICU (4 beds)
            for b_num in range(1, 5):
                status = "AVAILABLE" if b_num == 3 else "OCCUPIED"
                b = Bed(
                    hospital_id=hosp.id,
                    ward_name="Cardiac ICU (CCU)",
                    bed_number=f"CCU-{b_num:02d}",
                    bed_type="CARDIAC_ICU",
                    status=status,
                    is_iot_enabled=True,
                    iot_sensor_id=f"BED-IOT-{hosp.id}-CCU{b_num}"
                )
                db.add(b)

            # 4. Ventilator Units (3 beds)
            for b_num in range(1, 4):
                status = "AVAILABLE" if b_num == 2 else "OCCUPIED"
                b = Bed(
                    hospital_id=hosp.id,
                    ward_name="Critical Ventilator Bay",
                    bed_number=f"VENT-{b_num:02d}",
                    bed_type="VENTILATOR",
                    status=status,
                    is_iot_enabled=True,
                    iot_sensor_id=f"BED-IOT-{hosp.id}-VNT{b_num}"
                )
                db.add(b)

            # 5. Oxygen-Supported Beds (6 beds)
            for b_num in range(1, 7):
                status = "AVAILABLE" if b_num > 3 else "OCCUPIED"
                b = Bed(
                    hospital_id=hosp.id,
                    ward_name="Oxygen Ward",
                    bed_number=f"O2-{b_num:02d}",
                    bed_type="OXYGEN_SUPPORTED",
                    status=status,
                    is_iot_enabled=True
                )
                db.add(b)

            # Add Ambulances per hospital
            for a_idx in range(1, 3):
                amb = Ambulance(
                    registration_number=f"TN-{hosp.id:02d}-EM-{1000 + a_idx}",
                    hospital_id=hosp.id,
                    ambulance_type="ADVANCED_CARDIAC" if a_idx == 1 else "BASIC",
                    current_lat=hosp.latitude + (0.005 * a_idx),
                    current_lng=hosp.longitude + (0.004 * a_idx),
                    status="AVAILABLE",
                    driver_name=f"Driver {hosp.name[:10]} #{a_idx}",
                    driver_phone=f"+91 98401 {hosp.id:02d}{a_idx:02d}0"
                )
                db.add(amb)

        db.commit()

        print("Seeding Patients & Inpatient Stays for ML Turnover Engine...")
        sample_patients = [
            {"name": "Anand Narayanan", "age": 58, "gender": "Male", "diag": "Cardiology", "detail": "Acute Coronary Syndrome (NSTEMI) post-angioplasty", "stage": "STEP_DOWN", "spo2": 98.0, "hr": 72.0, "map": 86.0, "rr": 16.0, "temp": 98.4, "stab": 0.92, "hosp_idx": 0, "bed_ward": "Cardiac ICU (CCU)", "bed_num": "CCU-01", "stay_days": 3},
            {"name": "Meenakshi Sundaram", "age": 64, "gender": "Female", "diag": "Pulmonology", "detail": "COPD Exacerbation with respiratory fatigue", "stage": "ORAL_MEDS", "spo2": 96.0, "hr": 78.0, "map": 88.0, "rr": 18.0, "temp": 98.6, "stab": 0.88, "hosp_idx": 0, "bed_ward": "Medical ICU", "bed_num": "ICU-01", "stay_days": 4},
            {"name": "Karthik Subramanian", "age": 34, "gender": "Male", "diag": "Infectious/Dengue", "detail": "Severe Dengue with resolving thrombocytopenia (Platelets 92k)", "stage": "DISCHARGE_READY", "spo2": 99.0, "hr": 70.0, "map": 82.0, "rr": 14.0, "temp": 98.2, "stab": 0.96, "hosp_idx": 0, "bed_ward": "General Ward A", "bed_num": "GW-01", "stay_days": 5},
            {"name": "Rajeshwari Ganesan", "age": 71, "gender": "Female", "diag": "Cardiology", "detail": "Decompensated Heart Failure on inotropic support", "stage": "ICU_CRITICAL", "spo2": 91.0, "hr": 104.0, "map": 64.0, "rr": 24.0, "temp": 99.1, "stab": 0.45, "hosp_idx": 0, "bed_ward": "Medical ICU", "bed_num": "ICU-02", "stay_days": 1},
            {"name": "Venkatesh Balaji", "age": 49, "gender": "Male", "diag": "Trauma", "detail": "Polytrauma with bilateral rib fractures & pneumothorax", "stage": "STEP_DOWN", "spo2": 97.0, "hr": 80.0, "map": 90.0, "rr": 17.0, "temp": 98.6, "stab": 0.86, "hosp_idx": 2, "bed_ward": "General Ward A", "bed_num": "GW-02", "stay_days": 4},
            {"name": "Lakshmi Priya", "age": 28, "gender": "Female", "diag": "General Surgery", "detail": "Laparoscopic Appendectomy (Post-Op Day 2)", "stage": "DISCHARGE_READY", "spo2": 99.0, "hr": 68.0, "map": 84.0, "rr": 15.0, "temp": 98.4, "stab": 0.98, "hosp_idx": 1, "bed_ward": "General Ward A", "bed_num": "GW-01", "stay_days": 2},
            {"name": "Subhashree R.", "age": 52, "gender": "Female", "diag": "Nephrology", "detail": "Chronic Kidney Disease Stage 4 with Hyperkalemia", "stage": "STEP_DOWN", "spo2": 97.5, "hr": 76.0, "map": 88.0, "rr": 16.0, "temp": 98.6, "stab": 0.89, "hosp_idx": 6, "bed_ward": "Medical ICU", "bed_num": "ICU-01", "stay_days": 5},
            {"name": "Muthuvel Karunanithi", "age": 62, "gender": "Male", "diag": "Orthopedics", "detail": "Total Hip Replacement (Post-Op Day 3)", "stage": "ORAL_MEDS", "spo2": 98.0, "hr": 74.0, "map": 85.0, "rr": 16.0, "temp": 98.4, "stab": 0.94, "hosp_idx": 9, "bed_ward": "General Ward A", "bed_num": "GW-01", "stay_days": 3},
        ]

        for p_data in sample_patients:
            hosp = hosp_objs[p_data["hosp_idx"]]
            pat = Patient(
                abha_id=f"91-{hash(p_data['name']) % 9000 + 1000}-7788-9900",
                full_name=p_data["name"],
                age=p_data["age"],
                gender=p_data["gender"],
                contact=f"+91 9840{hash(p_data['name']) % 900000:06d}",
                blood_group="B+"
            )
            db.add(pat)
            db.commit()
            db.refresh(pat)

            # Find matching bed
            target_bed = db.query(Bed).filter(
                Bed.hospital_id == hosp.id,
                Bed.ward_name == p_data["bed_ward"],
                Bed.bed_number == p_data["bed_num"]
            ).first()

            adm_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=p_data["stay_days"])
            stay = PatientStay(
                patient_id=pat.id,
                hospital_id=hosp.id,
                bed_id=target_bed.id if target_bed else None,
                admission_date=adm_dt,
                diagnosis_category=p_data["diag"],
                diagnosis_detail=p_data["detail"],
                co_morbidities="Hypertension, Type-2 Diabetes" if p_data["age"] > 50 else "None",
                treatment_stage=p_data["stage"],
                current_spo2=p_data["spo2"],
                current_hr=p_data["hr"],
                current_map=p_data["map"],
                current_rr=p_data["rr"],
                current_temp=p_data["temp"],
                vitals_stability_score=p_data["stab"],
                is_active=True
            )
            db.add(stay)
            db.commit()
            db.refresh(stay)

            # Run ML Turnover engine & save prediction
            pred_dict = ml_engine.predict_patient_turnover(stay, adm_dt)
            pred_db = BedTurnoverPrediction(
                patient_stay_id=stay.id,
                bed_id=stay.bed_id,
                hospital_id=hosp.id,
                discharge_prob_12h=pred_dict["discharge_prob_12h"],
                discharge_prob_24h=pred_dict["discharge_prob_24h"],
                expected_discharge_hours=pred_dict["expected_discharge_hours"],
                confidence_score=pred_dict["confidence"],
                key_factors_json=json.dumps(pred_dict["key_factors"])
            )
            db.add(pred_db)

        print("Seeding Users for Demo...")
        users = [
            # 1. Patients
            {
                "email": "patient@medflow.in", "pass": "patient123", "name": "Rohan Sharma (Patient)",
                "role": UserRole.PATIENT, "hosp_id": None, "dept": "General Patient",
                "desig": "Ayushman Bharat Beneficiary", "abha": "14-8921-4456-7890", "phone": "+91 98401 22334"
            },
            {
                "email": "ananya.rao@medflow.in", "pass": "patient123", "name": "Ananya Rao (Patient)",
                "role": UserRole.PATIENT, "hosp_id": None, "dept": "Cardiology Outpatient",
                "desig": "CGHS Empanelled Citizen", "abha": "14-3312-7788-9900", "phone": "+91 98402 33445"
            },
            # 2. Hospital Staff & Doctors
            {
                "email": "staff@medflow.in", "pass": "staff123", "name": "Dr. Priya Selvam (Hospital Staff)",
                "role": UserRole.HOSPITAL_STAFF, "hosp_id": hosp_objs[0].id, "dept": "Critical Care / ICU",
                "desig": "Senior Consultant Intensivist", "abha": "14-1122-3344-5566", "phone": "+91 98401 11223"
            },
            {
                "email": "staff.cmc@medflow.in", "pass": "staff123", "name": "Dr. Anand Verghese (CMC Vellore)",
                "role": UserRole.HOSPITAL_STAFF, "hosp_id": hosp_objs[6].id if len(hosp_objs) > 6 else hosp_objs[0].id,
                "dept": "Emergency & Trauma Medicine", "desig": "Chief Medical Officer",
                "abha": "14-5566-7788-9911", "phone": "+91 98405 55667"
            },
            # 3. Government & District Administrators
            {
                "email": "admin@medflow.in", "pass": "admin123", "name": "Dr. K. Radhakrishnan (District Collector)",
                "role": UserRole.GOVT_ADMIN, "hosp_id": None, "dept": "District Health & Disaster Management",
                "desig": "District Collector & Special Officer", "abha": None, "phone": "+91 98400 99887"
            },
            {
                "email": "admin.state@medflow.in", "pass": "admin123", "name": "Dr. S. J. Kumar (State Health Mission)",
                "role": UserRole.GOVT_ADMIN, "hosp_id": None, "dept": "State Health Resource Directorate",
                "desig": "Mission Director, NHM Tamil Nadu", "abha": None, "phone": "+91 98400 11001"
            },
        ]
        for u in users:
            user = User(
                email=u["email"],
                hashed_password=hash_pw(u["pass"]),
                full_name=u["name"],
                role=u["role"],
                hospital_id=u["hosp_id"],
                department=u["dept"],
                designation=u["desig"],
                abha_id=u["abha"],
                phone=u["phone"],
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(user)

        print("Seeding District Alerts...")
        alerts = [
            {
                "dist_id": district_objs["Kanchipuram"].id,
                "type": "CRITICAL_ICU_SHORTAGE",
                "sev": "CRITICAL",
                "msg": "Kanchipuram District ICU availability is below 8% (1 bed remaining across district).",
                "rec": "Initiate inter-district referral route to Sri Ramachandra Medical Centre & MIOT International."
            },
            {
                "dist_id": district_objs["Chennai"].id,
                "type": "OXYGEN_SURGE_WARNING",
                "sev": "WARNING",
                "msg": "High oxygen draw detected in Central Chennai hospitals (Average 4.1 kL/day).",
                "rec": "Pre-position cryogenic refill tankers at Manapakkam and Greams Road depots."
            }
        ]
        for a in alerts:
            alert = DistrictAlert(
                district_id=a["dist_id"],
                alert_type=a["type"],
                severity=a["sev"],
                message=a["msg"],
                recommended_action=a["rec"],
                is_resolved=False
            )
            db.add(alert)

        # Initial Blockchain Audit Block
        audit_service.log_action(
            db=db,
            actor_email="system_genesis@medflow.in",
            actor_role="SYSTEM",
            action="GENESIS_STATE_INITIALIZATION",
            resource_type="NETWORK",
            resource_id="MEDFLOW-GENESIS-2026",
            previous_value="0x0",
            new_value="Initialized 16 Hospitals, 480 Beds, 32 Ambulances across Tamil Nadu & Karnataka."
        )

        db.commit()
        print("Database seeding completed successfully with 16 Hospitals, 480+ Beds, Stays, and ML predictions!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
