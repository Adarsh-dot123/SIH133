# MedFlow — Real-Time Predictive Hospital Resource Management Platform

> **A Judge-Ready Healthcare Innovation Platform for India** connecting **Patients/Families**, **Hospital Staff**, and **District/State Administrators** powered by the **Predictive Bed Turnover Engine (12–24h forecast)**.

---

## 1. Problem Framing (Three-Layer Systems Architecture)

Most healthcare applications only provide a static, reactive view of bed counts. In reality, healthcare crises in India suffer from systemic **information asymmetry and reactive delay** across three interconnected layers:

| Stakeholder Layer | Current Pain Point | MedFlow Solution |
| :--- | :--- | :--- |
| **Patient / Family** | Blind hospital-hopping, delayed emergency care during golden hour. | Live bed search, PMJAY filters, smart specialty-aware routing & ambulance dispatch. |
| **Hospital Staff** | Manual bed registers, no foresight into discharge-driven bed turnover. | One-click bed toggles, non-HMS shift handover, AI discharge predictor with vitals explainability. |
| **State / District Admin** | Slow resource reallocation, uncoordinated panic responses, lack of auditability. | Statewide heatmap, automated shortage threshold alerts (<10% ICU), Digital Twin simulator, and SHA-256 audit chain. |

---

## 2. Core Innovations & Differentiators

### A. Predictive Bed Turnover Engine *(Primary Technical Differentiator)*
- Converts hospital bed management from **reactive** (*what is free right now*) to **proactive** (*what beds are likely to free up within 12–24 hours*).
- Machine learning pipeline (Random Forest Classifier + Gradient Boosting Regressor) analyzes clinical indicators:
  - Diagnosis category (e.g. Cardiology/ACS, Dengue, Pulmonology/COPD, Trauma)
  - Current Treatment Stage (`ICU_CRITICAL`, `STEP_DOWN`, `ORAL_MEDS`, `DISCHARGE_READY`)
  - Length of Stay (LOS) trajectory
  - Vitals Stability Index ($SpO_2$, Heart Rate, Mean Arterial Pressure, Temp, RR)
- Outputs patient-level $P(\text{discharge} \le 12\text{h})$ and $P(\text{discharge} \le 24\text{h})$ with transparent clinical driver weights (e.g., *"$SpO_2$ Stability: +24%"*), and aggregates ward-level capacity.

### B. Smart Specialty-Aware Referral Engine
- Transparent multi-criteria decision algorithm ranking candidate hospitals based on:
  $$\text{Score} = 0.35 \cdot S_{\text{specialty}} + 0.25 \cdot S_{\text{current\_beds}} + 0.15 \cdot S_{\text{predicted\_12h}} + 0.15 \cdot S_{\text{proximity}} + 0.10 \cdot S_{\text{pmjay}}$$
- Automatically dispatches nearest available ALS/BLS ambulance with real-time Leaflet map routing and countdown ETA.

### C. Rural Inclusivity: USSD (*999#) & SMS Gateway
- Provides complete offline access for feature phones and 2G cellular areas via mock USSD dialog and SMS search queries (`ICU CHENNAI`, `OXYGEN VELLORE`).

### D. Novelty Systems
1. **Hospital Digital Twin**: "What-if" crisis simulator (+20%, +50% surge, mass casualty crashes, monsoon dengue waves) projecting time-to-zero ICU deficit and daily oxygen stockout curves.
2. **IoT Telemetry Stream**: Live sensors monitoring liquid cryogenic oxygen tank pressure ($kL$), ICU manifold flow meters ($L/\text{min}$), and smart bed weight load cells.
3. **Blockchain-Style Audit Trail**: Cryptographically hash-chained ($SHA-256$) immutable ledger recording every resource change to eliminate black-marketing and bed hoarding.
4. **ABDM / HL7 FHIR R4 Adapter**: Interoperable standard export for Ayushman Bharat Digital Mission and 14-digit ABHA ID verification.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System, Lucide Icons, Leaflet / React-Leaflet GIS mapping.
- **Backend**: Python 3.13, FastAPI, WebSockets, SQLAlchemy ORM, Pydantic v2, Scikit-Learn, NumPy, Pandas, PyJWT, Bcrypt.
- **Database**: SQLite (zero-config local demo) & PostgreSQL compatible schema.
- **DevOps**: Docker, Docker Compose, Nginx.

---

## 4. Quickstart — Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 0. Quick 1-Command Startup (Backend + Frontend together)
```bash
# Option A: Double-click start.bat on Windows
# Option B: Run via Python from root directory
python run_dev.py
```
This automatically boots both the FastAPI backend (`http://localhost:8000`) and the React/Vite frontend (`http://localhost:5173`) with live reload and auto-proxying.

### 1. Start the FastAPI Backend (Individual Terminal)
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server (Auto-seeds 16 hospitals, 480+ beds, patient stays)
uvicorn app.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000`. Swagger API docs at `http://localhost:8000/docs`.

### 2. Start the React Frontend
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 5. Running with Docker Compose

To launch all services with a single command:
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

## 6. Demo Accounts & Credentials

| Role | Email | Password | Intended Workflow |
| :--- | :--- | :--- | :--- |
| **Patient / Family** | `patient@medflow.in` | `patient123` | Search hospitals, test smart referral & ambulance route |
| **Hospital Staff** | `staff@medflow.in` | `staff123` | Bed grid toggle, non-HMS batch mode, test ML vitals recovery |
| **Govt Admin** | `admin@medflow.in` | `admin123` | Statewide heatmap, threshold alerts, Digital Twin surge simulation |

---

## 7. Running Backend Automated Tests

```bash
cd backend
python -m pytest tests/test_medflow.py -v
```
Verifies health check, JWT authentication, bed toggles, ML turnover calculations, Smart Referral ranking, Rural USSD/SMS fallback, Blockchain audit integrity, Digital Twin simulation, and ABDM FHIR R4 export.

---

## 8. License
Apache 2.0 License. Designed for Smart India Hackathon (SIH) & National Health Innovation.
