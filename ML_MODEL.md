# MedFlow Predictive Bed Turnover Engine — ML Documentation

## 1. Executive Summary

The **Predictive Bed Turnover Engine** is MedFlow's core technical differentiator. While standard platforms only report current free beds, MedFlow forecasts beds likely to become available within **12 to 24 hours**.

---

## 2. Clinical Feature Vector

For each active inpatient stay $i$, the feature vector $X_i \in \mathbb{R}^{10}$ is constructed:

| Feature | Type | Range / Encoding | Description |
| :--- | :--- | :--- | :--- |
| `age` | Integer | $18 - 95$ | Patient biological age |
| `diagnosis_category` | Categorical | $0 - 9$ | Primary ICD-10 grouping (Cardiology, Pulmonology, Nephrology, Neurology, General Surgery, Orthopedics, Trauma, Infectious/Dengue, Gastroenterology, Oncology) |
| `stay_hours` | Float | $1.0 - 300.0+$ | Hours elapsed since hospital admission |
| `treatment_stage` | Ordinal | $0 - 4$ | Current clinical phase: `ADMITTED` (0), `ICU_CRITICAL` (1), `STEP_DOWN` (2), `ORAL_MEDS` (3), `DISCHARGE_READY` (4) |
| `current_spo2` | Float | $80.0 - 100.0\%$ | Arterial blood oxygen saturation percentage |
| `current_hr` | Float | $45 - 140$ bpm | Heart rate pulse |
| `current_map` | Float | $55 - 125$ mmHg | Mean Arterial Pressure |
| `current_rr` | Float | $10 - 35$ bpm | Respiratory rate |
| `current_temp` | Float | $96.0 - 104.0^\circ\text{F}$ | Core body temperature |
| `vitals_stability_score` | Float | $0.0 - 1.0$ | Trajectory stability slope over preceding 24h window |

---

## 3. Model Architecture

1. **12h Discharge Classifier**:
   - Algorithm: Random Forest Classifier ($N_{\text{estimators}} = 60$, $\text{max\_depth} = 8$)
   - Target: Binary indicator $\mathbf{1}[\text{LOS}_{\text{remaining}} \le 12\text{h}]$
   - Output: $P(\text{discharge} \le 12\text{h}) \in [0.0, 1.0]$

2. **24h Discharge Classifier**:
   - Algorithm: Random Forest Classifier ($N_{\text{estimators}} = 60$, $\text{max\_depth} = 8$)
   - Target: Binary indicator $\mathbf{1}[\text{LOS}_{\text{remaining}} \le 24\text{h}]$
   - Output: $P(\text{discharge} \le 24\text{h}) \in [0.0, 1.0]$

3. **Remaining LOS Regressor**:
   - Algorithm: Gradient Boosting Regressor ($N_{\text{estimators}} = 60$, $\text{max\_depth} = 6$)
   - Target: Continuous remaining hours to clinical discharge ($2.0 - 120.0\text{h}$)

---

## 4. Ward-Level Forecast Aggregation

Individual patient probabilities are aggregated at the ward and hospital level:

$$\text{Forecasted ICU}(12\text{h}) = \text{Current Free ICU} + \sum_{p \in \text{ICU Inpatients}} \mathbf{1}[P_{12\text{h}}(p) \ge 0.65]$$
$$\text{Forecasted ICU}(24\text{h}) = \text{Current Free ICU} + \sum_{p \in \text{ICU Inpatients}} \mathbf{1}[P_{24\text{h}}(p) \ge 0.55]$$

---

## 5. Clinical Explainability Engine

For every prediction, MedFlow computes positive and negative contributing weights to assist attending clinicians:
- Normal $SpO_2 \ge 96\%$: $+24\%$ weight contribution
- Step-down / Oral meds stage: $+32\%$ weight contribution
- Vitals stability index $\ge 0.80$: $+20\%$ weight contribution
- Unstable vitals or ICU Critical stage: Negative risk penalty
