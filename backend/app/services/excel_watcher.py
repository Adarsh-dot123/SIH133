import os
import asyncio
import pandas as pd
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Hospital, Bed, BedType, BedStatus, BloodInventory
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Firebase Admin SDK setup
firebase_initialized = False
db_firestore = None

def init_firebase_admin():
    global firebase_initialized, db_firestore
    if firebase_initialized:
        return db_firestore

    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase_service_account.json")
    if os.path.exists(cred_path):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            
            if not firebase_admin._apps:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            
            db_firestore = firestore.client()
            firebase_initialized = True
            print("🔥 Firebase Admin SDK initialized successfully with service account.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
    else:
        # Check if default credential files exist in environment
        if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
            try:
                import firebase_admin
                from firebase_admin import firestore
                if not firebase_admin._apps:
                    firebase_admin.initialize_app()
                db_firestore = firestore.client()
                firebase_initialized = True
                print("🔥 Firebase Admin SDK initialized using default environment credentials.")
            except Exception as e:
                logger.error(f"❌ Failed default Firebase Admin initialization: {e}")
        else:
            print(
                "⚠️ Firebase service account credential file ('firebase_service_account.json') not found. "
                "Firestore sync will be bypassed until it is provided."
            )
    return db_firestore

def update_beds_status(db_sql: Session, hospital_id: int, bed_type: str, requested_avail: int, requested_total: int):
    # Fetch all existing beds of this type for the hospital
    beds = db_sql.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.bed_type == bed_type).all()
    
    # If the requested total is larger than the number of existing beds, add new ones
    if len(beds) < requested_total:
        diff = requested_total - len(beds)
        for i in range(diff):
            new_bed = Bed(
                hospital_id=hospital_id,
                ward_name=f"Ward-{bed_type}",
                bed_number=f"{bed_type[:3].upper()}-{len(beds) + i + 1}",
                bed_type=bed_type,
                status="AVAILABLE"
            )
            db_sql.add(new_bed)
        db_sql.flush()
        # Refetch
        beds = db_sql.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.bed_type == bed_type).all()

    # Update statuses: first N beds are AVAILABLE, the rest are OCCUPIED
    for idx, bed in enumerate(beds):
        if idx < requested_avail:
            bed.status = "AVAILABLE"
        else:
            bed.status = "OCCUPIED"

def sync_dataframe_to_databases(df: pd.DataFrame):
    blood_groups_map = {
        "blood_a_pos": "A+",
        "blood_a_neg": "A-",
        "blood_b_pos": "B+",
        "blood_b_neg": "B-",
        "blood_o_pos": "O+",
        "blood_o_neg": "O-",
        "blood_ab_pos": "AB+",
        "blood_ab_neg": "AB-"
    }

    # 1. Sync to SQL Database (SQLite)
    db_sql = SessionLocal()
    try:
        for _, row in df.iterrows():
            # Skip empty or NaN IDs
            raw_id = row.get("id")
            if pd.isna(raw_id) or str(raw_id).strip().lower() in ("nan", ""):
                continue
            try:
                hosp_id = int(float(raw_id))
            except Exception:
                continue

            hosp = db_sql.query(Hospital).filter(Hospital.id == hosp_id).first()
            if hosp:
                # Dynamically update the name in SQLite to match the Google Sheet
                if "name" in row and pd.notna(row["name"]):
                    hosp.name = str(row["name"])

                # Update each type of bed
                update_beds_status(db_sql, hosp_id, "GENERAL", int(row.get("general_beds_available", 0)), int(row.get("general_beds_total", 0)))
                update_beds_status(db_sql, hosp_id, "ICU", int(row.get("icu_beds_available", 0)), int(row.get("icu_beds_total", 0)))
                update_beds_status(db_sql, hosp_id, "VENTILATOR", int(row.get("ventilators_available", 0)), int(row.get("ventilators_total", 0)))
                update_beds_status(db_sql, hosp_id, "OXYGEN_SUPPORTED", int(row.get("oxygen_beds_available", 0)), int(row.get("oxygen_beds_total", 0)))

                # Update blood availability (only if columns exist in Google Sheet)
                for col_name, blood_grp in blood_groups_map.items():
                    if col_name in row:
                        val = row.get(col_name)
                        if pd.notna(val):
                            bi = db_sql.query(BloodInventory).filter(
                                BloodInventory.hospital_id == hosp_id,
                                BloodInventory.blood_group == blood_grp
                            ).first()
                            if bi:
                                bi.units_available = int(val)
                            else:
                                bi = BloodInventory(
                                    hospital_id=hosp_id,
                                    blood_group=blood_grp,
                                    units_available=int(val),
                                    units_critical_threshold=5
                                )
                                db_sql.add(bi)
        db_sql.commit()
        print("✅ SQLite database synchronized successfully.")
    except Exception as e:
        db_sql.rollback()
        logger.error(f"❌ SQLite database sync failed: {e}")
    finally:
        db_sql.close()

    # 2. Sync to Firestore
    fs = init_firebase_admin()
    if fs:
        for _, row in df.iterrows():
            raw_id = row.get("id")
            if pd.isna(raw_id) or str(raw_id).strip().lower() in ("nan", ""):
                continue
            try:
                hosp_id_int = int(float(raw_id))
                hosp_id = str(hosp_id_int)
            except Exception:
                continue

            doc_ref = fs.collection("hospitals").document(hosp_id)
            
            # Construct the blood inventory list matching standard schemas (if columns exist)
            blood_inv_list = []
            has_blood_cols = any(col_name in row for col_name in blood_groups_map)
            
            if has_blood_cols:
                for col_name, blood_grp in blood_groups_map.items():
                    if col_name in row:
                        val = row.get(col_name)
                        if pd.notna(val):
                            blood_inv_list.append({
                                "blood_group": blood_grp,
                                "units_available": int(val)
                            })

            firestore_payload = {
                "id": hosp_id,
                "name": str(row["name"]),
                "general_beds_available": int(row.get("general_beds_available", 0)),
                "general_beds_total": int(row.get("general_beds_total", 0)),
                "icu_beds_available": int(row.get("icu_beds_available", 0)),
                "icu_beds_total": int(row.get("icu_beds_total", 0)),
                "ventilators_available": int(row.get("ventilators_available", 0)),
                "ventilators_total": int(row.get("ventilators_total", 0)),
                "oxygen_beds_available": int(row.get("oxygen_beds_available", 0)),
                "oxygen_beds_total": int(row.get("oxygen_beds_total", 0)),
                "doctors_on_duty": int(row.get("doctors_on_duty", 0))
            }
            if has_blood_cols:
                firestore_payload["blood_inventory"] = blood_inv_list

            doc_ref.set(firestore_payload, merge=True)

            # 3. Dynamic Medicine Sync: check if med_stock exists on this row
            if "med_stock" in row and pd.notna(row["med_stock"]):
                try:
                    import datetime
                    med_stock_val = int(float(row["med_stock"]))
                    med_doc_ref = fs.collection("medicines").document(str(hosp_id_int))
                    
                    # Fetch existing doc to avoid overwriting category/burnRate
                    med_doc = med_doc_ref.get()
                    if med_doc.exists:
                        med_doc_ref.update({
                            "stockLevel": med_stock_val,
                            "facility": str(row["name"]),
                            "lastUpdated": datetime.datetime.utcnow().isoformat()
                        })
                    else:
                        med_mapping = {
                            1: {"name": "Snake Antivenom", "category": "Lifesaving Venom Immunoglobulin", "minThreshold": 30},
                            2: {"name": "Anti-Rabies Vaccine", "category": "Viral Prophylaxis", "minThreshold": 25},
                            3: {"name": "Oxytocin Injection", "category": "Maternal Care / Hemorrhage prevention", "minThreshold": 20},
                            4: {"name": "Insulin (Human Mix)", "category": "Chronic Care / Endocrinology", "minThreshold": 25},
                            5: {"name": "IV Fluids (Normal Saline)", "category": "Critical Care / Rehydration", "minThreshold": 35},
                            6: {"name": "Metformin 500mg", "category": "Essential Oral Anti-diabetic", "minThreshold": 20},
                            7: {"name": "Paracetamol 650mg", "category": "Basic Analgesic & Antipyretic", "minThreshold": 30}
                        }
                        med_info = med_mapping.get(hosp_id_int, {"name": f"Essential Drug {hosp_id_int}", "category": "General Medication", "minThreshold": 25})
                        med_doc_ref.set({
                            "id": str(hosp_id_int),
                            "name": med_info["name"],
                            "category": med_info["category"],
                            "stockLevel": med_stock_val,
                            "minThreshold": med_info["minThreshold"],
                            "facility": str(row["name"]),
                            "burnRate": 1.5,
                            "isRestocking": False,
                            "restockEta": 0,
                            "vehicle": "",
                            "lastUpdated": datetime.datetime.utcnow().isoformat()
                        })
                except Exception as ex:
                    logger.error(f"❌ Medicine Firestore sync failed for hospital {hosp_id_int}: {ex}")

        print("✅ Firestore database synchronized successfully.")

def extract_spreadsheet_id(url: str) -> str:
    import re
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if match:
        return match.group(1)
    return None

def sync_excel_to_databases():
    excel_path = "hospitals_data.xlsx"
    if not os.path.exists(excel_path):
        return

    print("📊 Local Excel modification detected. Synchronizing...")
    try:
        df = pd.read_excel(excel_path)
        sync_dataframe_to_databases(df)
    except Exception as e:
        logger.error(f"❌ Excel parsing/sync failed: {e}")

async def start_excel_watcher_task():
    import hashlib
    gsheet_url = settings.GOOGLE_SHEET_URL
    spreadsheet_id = extract_spreadsheet_id(gsheet_url) if gsheet_url else None
    
    if spreadsheet_id:
        print(f"🌐 Google Sheet Watcher initialized for Spreadsheet ID: {spreadsheet_id}")
        csv_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv"
        last_hash = None
        
        while True:
            try:
                # Fetch CSV directly from Google Sheets
                df = pd.read_csv(csv_url)
                # Compute md5 hash to check if content changed
                content_str = df.to_csv(index=False)
                content_hash = hashlib.md5(content_str.encode('utf-8')).hexdigest()
                
                if last_hash is None or content_hash != last_hash:
                    print("📊 Google Sheet modification detected. Synchronizing to SQL & Firestore...")
                    last_hash = content_hash
                    sync_dataframe_to_databases(df)
            except Exception as e:
                logger.error(f"Error fetching Google Sheet: {e}")
            await asyncio.sleep(10)
    else:
        print("📁 Google Sheet URL not configured. Falling back to local hospitals_data.xlsx watcher...")
        excel_path = "hospitals_data.xlsx"
        last_mtime = None

        if os.path.exists(excel_path):
            try:
                last_mtime = os.path.getmtime(excel_path)
                sync_excel_to_databases()
            except Exception as e:
                logger.error(f"Initial Excel read failed: {e}")

        while True:
            await asyncio.sleep(5)
            if os.path.exists(excel_path):
                try:
                    mtime = os.path.getmtime(excel_path)
                    if last_mtime is None or mtime > last_mtime:
                        last_mtime = mtime
                        sync_excel_to_databases()
                except Exception as e:
                    logger.error(f"Error checking Excel file: {e}")
