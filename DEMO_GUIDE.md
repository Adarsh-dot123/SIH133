# MedFlow Hackathon Judge Demo Script

Follow this step-by-step demonstration to showcase all capabilities of the MedFlow platform in 3 to 5 minutes.

---

## Step 1: Open with the Three-Layer Systems Problem (30 Seconds)
1. Launch the platform at `http://localhost:5173`.
2. Explain: *"Existing platforms are static and reactive. MedFlow solves information asymmetry across Patients, Hospitals, and Government using a Predictive Bed Turnover Engine that forecasts freed beds 12–24 hours in advance."*

---

## Step 2: Patient Portal & Smart Specialty-Aware Referral (90 Seconds)
1. Select **Patient** role in the top-right role switcher.
2. Filter hospitals by **Specialty: Cardiology** and toggle **Ayushman Bharat (PMJAY) Empanelled**.
3. Point out the glowing purple **Prediction Badges** (*e.g. +2 ICU in 12h*).
4. Click **Smart Emergency Referral**:
   - Set Patient: *"Ramesh Sundaram (56y)"*, Bed Type: *"ICU"*, Specialty: *"Cardiology"*.
   - Click **Find Ranked Referral Hospitals**.
   - Show the transparent scoring breakdown (Specialty Match 35/35, Bed Availability, Predicted 12h turnover, Proximity).
   - Click **Dispatch Referral & Route** $\to$ Leaflet map draws the route and displays the assigned ambulance (`TN-01-EM-1001`) with driver hotline.

---

## Step 3: Hospital Staff Portal & Live ML Turnover Simulation (90 Seconds)
1. Switch role to **Hospital Staff**.
2. **Bed Grid Toggles**:
   - Single-click any bed (e.g. `ICU-01`) to toggle between `AVAILABLE`, `OCCUPIED`, and `CLEANING`.
   - Show the live toast notification confirming real-time WebSocket broadcast.
3. **ML Bed Turnover Panel**:
   - Select inpatient stay *Anand Narayanan (Cardiology ACS)*.
   - Adjust the **SpO2 Oxygenation slider** from 91% to 98% and switch Treatment Stage to **Oral Meds / Discharge Ready**.
   - Click **Recalculate Discharge ML Prediction**.
   - Watch the 12h discharge probability surge to >85% and the hospital's forecasted available beds update immediately!
4. Show **Non-HMS Batch Toggle Mode** for shift handovers.

---

## Step 4: Government Command Center, Heatmap & Digital Twin (60 Seconds)
1. Switch role to **Govt Admin**.
2. Show the **Statewide KPI Summary** and **District Heatmap Matrix** (pointing out the Kanchipuram critical shortage badge).
3. Open **Digital Twin Simulator**:
   - Select preset: **+50% Epidemic Wave**.
   - Click **Execute Digital Twin Simulation**.
   - Review the day-by-day depletion curve, time-to-zero ICU deficit (e.g., 28 hours), and automated clinical mitigation directives.
4. Show **IoT Telemetry Stream** with live cryogenic tank and bed sensors.
5. Show **Blockchain Audit Chain** and click **Verify Cryptographic Chain** to prove SHA-256 block authenticity.

---

## Step 5: Rural Offline Inclusivity (30 Seconds)
1. Click the **Rural USSD/SMS** button in the Navbar.
2. In the USSD simulator phone, enter `*999#` and reply with `1` (Emergency ICU Beds).
3. Switch to SMS tab, enter `ICU CHENNAI`, and demonstrate instant SMS emergency recommendations for 2G / non-smartphone citizens in rural India.

---

## Step 6: Close with National Impact (15 Seconds)
- *"MedFlow turns reactive bed hunting into proactive resource coordination, directly aligned with India's Ayushman Bharat Digital Mission (ABDM) and MeghRaj cloud standards."*
