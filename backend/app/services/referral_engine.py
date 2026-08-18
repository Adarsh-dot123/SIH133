import math
import json

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance in kilometers using the Haversine formula"""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class SmartReferralEngine:
    def rank_hospitals(
        self,
        originating_lat: float,
        originating_lng: float,
        required_specialty: str,
        required_bed_type: str,
        hospitals: list,
        insurance_scheme: str = None,
        urgency_level: str = "HIGH"
    ) -> list:
        """
        Ranks candidate hospitals using a transparent, specialty-aware multi-criteria score.
        """
        scored_candidates = []

        for hosp in hospitals:
            dist_km = calculate_haversine_distance(
                originating_lat, originating_lng,
                hosp.latitude, hosp.longitude
            )
            # Estimate urban transit time: ~2.5 mins per km + 4 mins baseline
            est_travel_mins = round((dist_km * 2.5) + 4.0, 1)

            # Parse specialties
            try:
                specs = json.loads(hosp.specialties_json) if hosp.specialties_json else []
            except Exception:
                specs = []

            # 1. Specialty Match (0 - 35)
            specialty_match = False
            specialty_score = 0.0
            req_lower = required_specialty.lower().strip()
            
            for s in specs:
                if req_lower in s.lower() or s.lower() in req_lower:
                    specialty_match = True
                    specialty_score = 35.0
                    break
            
            if not specialty_match:
                # Partial match if general surgery / emergency
                if "Emergency Medicine" in specs or "General Medicine" in specs:
                    specialty_score = 15.0
                else:
                    specialty_score = 0.0

            # 2. Current Bed Availability (0 - 25)
            # Count free beds matching required_bed_type
            avail_beds = 0
            for b in hosp.beds:
                if b.status == "AVAILABLE":
                    if required_bed_type == "ALL" or b.bed_type == required_bed_type or (required_bed_type == "ICU" and "ICU" in b.bed_type):
                        avail_beds += 1
            
            bed_score = min(avail_beds * 5.0, 25.0)

            # 3. Predicted Bed Turnover 12h (0 - 15)
            # Check hospital's active patients discharge probability
            predicted_freed_12h = 0
            for stay in hosp.patient_stays:
                if stay.is_active:
                    for pred in stay.predictions:
                        if pred.discharge_prob_12h >= 0.65:
                            predicted_freed_12h += 1
                            break
            
            pred_score = min(predicted_freed_12h * 5.0, 15.0)

            # 4. Proximity / Travel Time (0 - 15)
            # Max 40 km radius
            proximity_score = max(0.0, 15.0 * (1.0 - min(dist_km / 40.0, 1.0)))

            # 5. Insurance Empanelment (0 - 10)
            insurance_score = 10.0
            if insurance_scheme == "PMJAY" and not hosp.is_empanelled_pmjay:
                insurance_score = 2.0
            elif insurance_scheme == "CGHS" and not hosp.is_empanelled_cghs:
                insurance_score = 2.0

            # Total score
            total_score = round(
                specialty_score + bed_score + pred_score + proximity_score + insurance_score,
                1
            )

            # Scoring breakdown for explainability
            breakdown = {
                "specialty_score": round(specialty_score, 1),
                "bed_availability_score": round(bed_score, 1),
                "predicted_turnover_score": round(pred_score, 1),
                "proximity_score": round(proximity_score, 1),
                "insurance_score": round(insurance_score, 1),
                "raw_total": total_score
            }

            scored_candidates.append({
                "hospital_id": hosp.id,
                "hospital_name": hosp.name,
                "district": hosp.district.name if hosp.district else "Tamil Nadu",
                "distance_km": dist_km,
                "estimated_travel_minutes": est_travel_mins,
                "specialty_match": specialty_match,
                "current_beds_available": avail_beds,
                "predicted_beds_12h": predicted_freed_12h,
                "overall_match_score": total_score,
                "recommendation_rank": 0, # Will be set after sorting
                "is_empanelled_pmjay": hosp.is_empanelled_pmjay,
                "phone": hosp.phone,
                "address": hosp.address,
                "latitude": hosp.latitude,
                "longitude": hosp.longitude,
                "scoring_breakdown": breakdown
            })

        # Sort descending by match score, then ascending by distance
        scored_candidates.sort(key=lambda x: (-x["overall_match_score"], x["distance_km"]))
        for idx, item in enumerate(scored_candidates):
            item["recommendation_rank"] = idx + 1

        return scored_candidates

referral_engine = SmartReferralEngine()
