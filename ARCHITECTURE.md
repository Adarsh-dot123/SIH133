# MedFlow Technical Architecture Specification

## 1. System Topology

```
                                  ┌─────────────────────────────────────────┐
                                  │      React + TypeScript Frontend        │
                                  │   (Tailwind-free Clean Design Tokens)   │
                                  └────────────────────┬────────────────────┘
                                                       │ HTTP REST + WebSocket (/ws/live)
                                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     FastAPI Application Server                                   │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ Authentication    │ Bed & Resources   │ ML Turnover       │ Smart Referral    │ Govt Command &   │
│ - JWT / Bcrypt    │ - Live Bed Toggles│ - Scikit-Learn    │ - Multi-Criteria  │ District Heatmap │
│ - 3 Stakeholders  │ - O2 & Blood Bank │ - 12h/24h Forecast│ - Leaflet Routing │ - Thresholds     │
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────┤
│ Novelty: IoT Sim  │ Novelty: Digital  │ Novelty: Audit Log│ Novelty: ABDM     │ Rural Access:    │
│ - Sensor stream   │ Twin & What-If    │ - SHA-256 Chained │ - FHIR R4 Bundle  │ - USSD (*999#)   │
│ - Smart load cell │ - Surge Stress    │ - Tamper Proof    │ - ABHA Resolver   │ - SMS Gateway    │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴──────────────────┘
                                                       │
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │ Database Engine: SQLite / PostgreSQL    │
                                  │ Real-time Event Hub: In-Memory / Redis  │
                                  └─────────────────────────────────────────┘
```

## 2. Data Models & Entity Relations

- **District** (1) $\longleftrightarrow$ (N) **Hospital**: Geographic hierarchical aggregation.
- **Hospital** (1) $\longleftrightarrow$ (N) **Bed**: Ward, bed number, status, IoT telemetry id.
- **Hospital** (1) $\longleftrightarrow$ (1) **OxygenInventory**: Bulk liquid cryogenic tank & cylinder inventory.
- **Hospital** (1) $\longleftrightarrow$ (N) **BloodInventory**: 8 ABO/Rh blood groups with critical threshold flags.
- **Hospital** (1) $\longleftrightarrow$ (N) **Ambulance**: Registration number, GPS coordinates, vehicle type, driver hotline.
- **Patient** (1) $\longleftrightarrow$ (N) **PatientStay**: Inpatient admission history, diagnosis, vitals ($SpO_2$, HR, MAP, RR, Temp, stability score).
- **PatientStay** (1) $\longleftrightarrow$ (N) **BedTurnoverPrediction**: ML inferences over stay trajectory.
- **AuditLog**: SHA-256 hash-chained immutable audit block.

## 3. Real-Time WebSocket Protocol

The `/ws/live` endpoint broadcasts real-time events across all subscribed clients:

| Event Name | Trigger Source | Payload |
| :--- | :--- | :--- |
| `BED_STATUS_CHANGED` | Hospital staff toggles bed state | `bed_id`, `hospital_id`, `ward_name`, `bed_number`, `old_status`, `new_status` |
| `OXYGEN_LEVEL_UPDATED` | Staff updates cryogenic bulk tank or cylinders | `hospital_id`, `bulk_tank_current_kl`, `cylinder_d_type_count` |
| `PREDICTION_RECALCULATED` | Staff updates patient vitals | `stay_id`, `hospital_id`, `discharge_prob_12h`, `discharge_prob_24h` |
| `REFERRAL_DISPATCHED` | Patient requests emergency referral | `referral_id`, `patient_name`, `destination_hospital_name`, `ambulance` |
| `DISTRICT_ALERT_TRIGGERED` | District crosses shortage threshold or reallocation dispatched | `from_district`, `to_district`, `resource`, `quantity` |

## 4. Blockchain-Style Cryptographic Audit Ledger

Every bed status change, oxygen modification, and inter-district transfer is cryptographically linked to the preceding block:
$$\text{Block Hash} = \text{SHA-256}(\text{prev\_hash} \parallel \text{timestamp} \parallel \text{actor\_email} \parallel \text{action} \parallel \text{resource\_type} \parallel \text{new\_value})$$

The `/api/audit-logs/verify` endpoint recomputes every block from the Genesis Block to provide complete tamper detection and prevent corrupt resource manipulation.
