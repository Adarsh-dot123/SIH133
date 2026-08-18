import uuid
import datetime

class ABDMFHIRAdapter:
    """
    Ayushman Bharat Digital Mission (ABDM) & HL7 FHIR R4 Standard Adapter.
    Exports clinical patient stay and bed resource states into interoperable FHIR bundles.
    """
    
    @staticmethod
    def format_fhir_bundle(patient, stay, hospital) -> dict:
        bundle_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat() + "Z"
        
        patient_resource = {
            "resourceType": "Patient",
            "id": f"pat-{patient.id}",
            "identifier": [
                {
                    "system": "https://healthid.abdm.gov.in",
                    "value": patient.abha_id or f"91-{patient.id:04d}-4321-8899"
                }
            ],
            "name": [{"text": patient.full_name}],
            "gender": (patient.gender or "unknown").lower(),
            "birthDate": f"{2026 - patient.age}-01-01"
        }

        encounter_resource = {
            "resourceType": "Encounter",
            "id": f"enc-{stay.id}",
            "status": "in-progress" if stay.is_active else "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "IMP",
                "display": "inpatient encounter"
            },
            "subject": {"reference": f"Patient/pat-{patient.id}"},
            "period": {
                "start": stay.admission_date.isoformat() + "Z",
                "end": stay.discharge_date.isoformat() + "Z" if stay.discharge_date else None
            },
            "serviceProvider": {
                "reference": f"Organization/hosp-{hospital.id}",
                "display": hospital.name
            }
        }

        condition_resource = {
            "resourceType": "Condition",
            "id": f"cond-{stay.id}",
            "clinicalStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                }]
            },
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                    "code": "encounter-diagnosis",
                    "display": "Encounter Diagnosis"
                }]
            }],
            "code": {
                "text": f"{stay.diagnosis_category} - {stay.diagnosis_detail or ''}"
            },
            "subject": {"reference": f"Patient/pat-{patient.id}"}
        }

        observation_spo2 = {
            "resourceType": "Observation",
            "id": f"obs-spo2-{stay.id}",
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": "vital-signs",
                    "display": "Vital Signs"
                }]
            }],
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "59408-5",
                    "display": "Oxygen saturation in Arterial blood by Pulse oximetry"
                }],
                "text": "SpO2"
            },
            "subject": {"reference": f"Patient/pat-{patient.id}"},
            "valueQuantity": {
                "value": stay.current_spo2,
                "unit": "%",
                "system": "http://unitsofmeasure.org",
                "code": "%"
            }
        }

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "meta": {
                "lastUpdated": now,
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"]
            },
            "type": "document",
            "timestamp": now,
            "entry": [
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": patient_resource},
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": encounter_resource},
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": condition_resource},
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": observation_spo2}
            ]
        }

abdm_adapter = ABDMFHIRAdapter()
