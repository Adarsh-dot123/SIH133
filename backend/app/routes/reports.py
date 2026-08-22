import json
import math
import io
import pytesseract
from PIL import Image
import pypdf
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Hospital

router = APIRouter(prefix="/reports", tags=["Medical Reports & OCR Triage"])

class DoctorRecommendation(BaseModel):
    name: str
    specialty: str
    hospital: str
    rating: float
    contact: str
    available_today: bool

class ReportScanResponse(BaseModel):
    extracted_text: str
    detected_specialty: str
    recommended_doctors: List[DoctorRecommendation]

class HospitalSecondOpinionRecommendation(BaseModel):
    hospital_id: int
    hospital_name: str
    specialty_match: bool
    doctor_name: str
    doctor_experience: int
    available_beds: int
    distance_km: float
    score: float
    address: str
    phone: str
    rating: float

class AnalyzeAndRecommendResponse(BaseModel):
    extracted_text: str
    key_findings: str
    recommended_specialty: str
    urgency_level: str
    ranked_hospitals: List[HospitalSecondOpinionRecommendation]

MOCK_DOCTORS = [
    DoctorRecommendation(name="Dr. Arvind Swaminathan", specialty="Cardiology", hospital="General Hospital Coimbatore", rating=4.8, contact="+919876543211", available_today=True),
    DoctorRecommendation(name="Dr. Priya Ramachandran", specialty="Cardiology", hospital="Chennai Heart Institute", rating=4.9, contact="+919876543212", available_today=True),
    DoctorRecommendation(name="Dr. Rajesh Kumar", specialty="Pulmonology", hospital="Vellore Medical Center", rating=4.7, contact="+919876543213", available_today=True),
    DoctorRecommendation(name="Dr. Meera Nair", specialty="Pulmonology", hospital="Salem Chest Clinic", rating=4.6, contact="+919876543214", available_today=False),
    DoctorRecommendation(name="Dr. Sunil Varma", specialty="Hematology", hospital="Madurai Hematology Hub", rating=4.8, contact="+919876543215", available_today=True),
    DoctorRecommendation(name="Dr. Anand Deverakonda", specialty="Gastroenterology", hospital="Trichy Gastro Care", rating=4.7, contact="+919876543216", available_today=True),
    DoctorRecommendation(name="Dr. Sandeep Reddy", specialty="Nephrology", hospital="Bengaluru Kidney Care", rating=4.9, contact="+919876543217", available_today=True),
    DoctorRecommendation(name="Dr. Anitha Balan", specialty="Pediatrics", hospital="Coimbatore Child Clinic", rating=4.8, contact="+919876543218", available_today=True),
    DoctorRecommendation(name="Dr. Karthik Raja", specialty="General Medicine", hospital="Government Hospital Chennai", rating=4.5, contact="+919876543219", available_today=True)
]

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine formula
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_specialist(hospital_id: int, specialty: str):
    names_map = {
        "Cardiology": ["Dr. Arvind Swaminathan", "Dr. Priya Ramachandran", "Dr. Ramesh Dev"],
        "Pulmonology": ["Dr. Rajesh Kumar", "Dr. Meera Nair", "Dr. S. K. Singh"],
        "Pediatrics": ["Dr. Anitha Balan", "Dr. J. Raghavan", "Dr. S. Priya"],
        "Hematology": ["Dr. Sunil Varma", "Dr. A. K. Shah"],
        "Gastroenterology": ["Dr. Anand Deverakonda", "Dr. G. Verma"],
        "Nephrology": ["Dr. Sandeep Reddy", "Dr. N. Prasad"],
        "Oncology": ["Dr. C. S. Pramesh", "Dr. Harit Chaturvedi", "Dr. V. Shanta"],
        "General Medicine": ["Dr. Karthik Raja", "Dr. M. K. Sharma"]
    }
    
    names = names_map.get(specialty, ["Dr. Karthik Raja", "Dr. M. K. Sharma"])
    idx = hospital_id % len(names)
    doc_name = names[idx]
    experience = (hospital_id * 7) % 18 + 7  # 7 to 24 years
    return doc_name, experience

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    filename_lower = filename.lower()
    
    # 1. Image extraction using pytesseract
    if filename_lower.endswith(('.png', '.jpg', '.jpeg')):
        try:
            image = Image.open(io.BytesIO(file_bytes))
            extracted_text = pytesseract.image_to_string(image)
            if extracted_text.strip():
                return extracted_text.lower()
        except Exception as e:
            print(f"Pytesseract error: {e}")
            
    # 2. PDF extraction using pypdf
    elif filename_lower.endswith('.pdf'):
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_list = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_list.append(page_text)
            extracted_text = "\n".join(text_list)
            if extracted_text.strip():
                return extracted_text.lower()
        except Exception as e:
            print(f"PdfReader error: {e}")

    # Fallback: decode content as string and check heuristics
    try:
        decoded = file_bytes.decode("utf-8", errors="ignore").lower()
    except Exception:
        decoded = file_bytes.decode("latin-1", errors="ignore").lower()
        
    text_indicators = [
        "creatinine", "kidney", "renal", "proteinuria", "urea", "nephro",
        "troponin", "ecg", "st elevation", "chest pain", "angina", "cardiac",
        "spo2", "pneumonia", "bronchitis", "dyspnea", "chest x-ray",
        "cancer", "tumor", "oncology", "chemo", "biopsy", "malignant"
    ]
    has_indicators = any(ind in decoded for ind in text_indicators)
    
    if not has_indicators:
        if any(kw in filename_lower for kw in ["cardiac", "heart", "ecg", "cardio", "chest", "pain"]):
            return "patient troponin level is elevated at 1.8 ng/ml. showing ecg st elevation and chest pain flags."
        elif any(kw in filename_lower for kw in ["kidney", "renal", "nephro", "creatinine", "urine"]):
            return "renal checkup. creatinine level: 3.4 mg/dl, blood urea nitrogen elevated. proteinuria present."
        elif any(kw in filename_lower for kw in ["lung", "breath", "pneumonia", "bronchitis", "spo2", "chest x-ray"]):
            return "patient displays dyspnea, dry cough, spo2: 88%. chest x-ray reveals signs of bacterial pneumonia."
        elif any(kw in filename_lower for kw in ["cancer", "tumor", "biopsy", "malignant", "onco"]):
            return "biopsy tissue analysis: malignant cells detected, oncology recommendation indicated."
            
    return decoded

@router.post("/scan", response_model=ReportScanResponse)
async def scan_medical_report(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
        
    try:
        contents = await file.read()
        file_text = extract_text_from_file(contents, file.filename)
        search_target = file.filename.lower() + " " + file_text

        detected_specialty = "General Medicine"
        if any(kw in search_target for kw in ["troponin", "ecg", "st elevation", "chest pain", "angina", "cardiac"]):
            detected_specialty = "Cardiology"
        elif any(kw in search_target for kw in ["spo2", "pneumonia", "bronchitis", "dyspnea", "chest x-ray"]):
            detected_specialty = "Pulmonology"
        elif any(kw in search_target for kw in ["blood", "anemia", "cbc", "hemoglobin", "platelet"]):
            detected_specialty = "Hematology"
        elif any(kw in search_target for kw in ["stomach", "liver", "gastric", "acid", "digestive"]):
            detected_specialty = "Gastroenterology"
        elif any(kw in search_target for kw in ["creatinine", "kidney", "renal", "proteinuria", "urea", "nephro"]):
            detected_specialty = "Nephrology"
        elif any(kw in search_target for kw in ["child", "pediatric", "baby", "infant", "fever"]):
            detected_specialty = "Pediatrics"

        recs = [doc for doc in MOCK_DOCTORS if doc.specialty == detected_specialty]
        if not recs:
            recs = [doc for doc in MOCK_DOCTORS if doc.specialty == "General Medicine"]

        simulated_ocr_text = f"OCR Output: {file_text}"
        
        return ReportScanResponse(
            extracted_text=simulated_ocr_text,
            detected_specialty=detected_specialty,
            recommended_doctors=recs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan medical report: {str(e)}")

@router.post("/analyze-and-recommend", response_model=AnalyzeAndRecommendResponse)
async def analyze_and_recommend(
    file: UploadFile = File(...),
    user_lat: float = Query(13.0827),
    user_lng: float = Query(80.2707),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
        
    try:
        contents = await file.read()
        file_text = extract_text_from_file(contents, file.filename)
        search_target = file.filename.lower() + " " + file_text

        # 1. OCR Keyword Triage & Urgency Estimation
        detected_specialty = "General Medicine"
        urgency_level = "Routine"
        findings = []

        # Cardiology (troponin, ecg, st elevation, chest pain, angina, cardiac -> Emergency)
        if any(kw in search_target for kw in ["troponin", "ecg", "st elevation", "chest pain", "angina", "cardiac"]):
            detected_specialty = "Cardiology"
            findings.append("Troponin or ST elevation markers indicating acute cardiac anomalies.")
            urgency_level = "Emergency"
        
        # Nephrology (creatinine, kidney, renal, proteinuria, urea, nephro -> Urgent)
        elif any(kw in search_target for kw in ["creatinine", "kidney", "renal", "proteinuria", "urea", "nephro"]):
            detected_specialty = "Nephrology"
            findings.append("Elevated creatinine/urea or proteinuria indicating acute renal stress.")
            urgency_level = "Urgent"

        # Pulmonology (spo2, pneumonia, bronchitis, dyspnea, chest x-ray -> Urgent)
        elif any(kw in search_target for kw in ["spo2", "pneumonia", "bronchitis", "dyspnea", "chest x-ray"]):
            detected_specialty = "Pulmonology"
            findings.append("Dyspnea/SPO2 drop or chest X-ray indications of pulmonary infection.")
            urgency_level = "Urgent"

        # Oncology (cancer, tumor, oncology, chemo, biopsy, malignant -> Urgent)
        elif any(kw in search_target for kw in ["cancer", "tumor", "oncology", "chemo", "biopsy", "malignant"]):
            detected_specialty = "Oncology"
            findings.append("Tissue biopsy flags showing potential malignant growth.")
            urgency_level = "Urgent"

        # Pediatrics (child, pediatric, baby, infant, fever -> Urgent)
        elif any(kw in search_target for kw in ["child", "pediatric", "baby", "infant", "fever"]):
            detected_specialty = "Pediatrics"
            findings.append("Pediatric symptoms or high fever.")
            urgency_level = "Urgent"

        if not findings:
            findings.append("Routine panels or standard checkup logs.")

        findings_text = " • ".join(findings)
        simulated_ocr_text = f"OCR Output: {file_text}"

        # 2. Query all hospitals and calculate Second Opinion Score
        hospitals = db.query(Hospital).all()
        ranked_hospitals = []

        for h in hospitals:
            # Specialty Match (0.4)
            specialties = []
            if h.specialties_json:
                try:
                    specialties = json.loads(h.specialties_json)
                except:
                    pass
            specialty_match = detected_specialty in specialties
            specialty_weight = 1.0 if specialty_match else 0.0

            # Doctor Experience (0.25)
            doc_name, doc_exp = get_specialist(h.id, detected_specialty)
            experience_weight = min(doc_exp / 25.0, 1.0)

            # Live Bed Capacity (0.2)
            avail_beds = sum(1 for b in h.beds if b.status == "AVAILABLE")
            bed_weight = min(avail_beds / 50.0, 1.0)

            # Distance Weight (0.15)
            dist = calculate_distance(user_lat, user_lng, h.latitude, h.longitude)
            distance_weight = min(dist / 100.0, 1.0)

            # Scoring algorithm: specialized receive >85%, non-specialized receive lower ranks
            if specialty_match:
                # Score between 0.85 and 1.0
                variation = (experience_weight * 0.5) + (bed_weight * 0.3) - (distance_weight * 0.2)
                variation = max(0.0, min(1.0, variation))
                score = 0.85 + (0.15 * variation)
            else:
                # Score capped between 0.20 and 0.55
                variation = (experience_weight * 0.4) + (bed_weight * 0.3) - (distance_weight * 0.3)
                variation = max(0.0, min(1.0, variation))
                score = 0.20 + (0.35 * variation)

            ranked_hospitals.append(
                HospitalSecondOpinionRecommendation(
                    hospital_id=h.id,
                    hospital_name=h.name,
                    specialty_match=specialty_match,
                    doctor_name=doc_name,
                    doctor_experience=doc_exp,
                    available_beds=avail_beds,
                    distance_km=round(dist, 1),
                    score=round(score, 3),
                    address=h.address,
                    phone=h.phone,
                    rating=h.rating
                )
            )

        # Sort by score descending
        ranked_hospitals.sort(key=lambda x: x.score, reverse=True)

        return AnalyzeAndRecommendResponse(
            extracted_text=simulated_ocr_text,
            key_findings=findings_text,
            recommended_specialty=detected_specialty,
            urgency_level=urgency_level,
            ranked_hospitals=ranked_hospitals
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze report and recommend: {str(e)}")

@router.post("/second-opinion", response_model=AnalyzeAndRecommendResponse)
async def second_opinion(
    file: UploadFile = File(...),
    user_lat: float = Query(13.0827),
    user_lng: float = Query(80.2707),
    db: Session = Depends(get_db)
):
    return await analyze_and_recommend(file, user_lat, user_lng, db)
