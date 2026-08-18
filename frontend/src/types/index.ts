export type UserRole = 'PATIENT' | 'HOSPITAL_STAFF' | 'GOVT_ADMIN';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  hospital_id?: number | null;
  phone?: string | null;
}

export interface HospitalSummary {
  id: number;
  name: string;
  district_id: number;
  district_name: string;
  state: string;
  address: string;
  latitude: float;
  longitude: float;
  phone: string;
  email?: string;
  is_empanelled_pmjay: boolean;
  is_empanelled_cghs: boolean;
  has_hms: boolean;
  rating: number;
  specialties: string[];
  
  general_beds_available: number;
  general_beds_total: number;
  icu_beds_available: number;
  icu_beds_total: number;
  ventilators_available: number;
  ventilators_total: number;
  oxygen_beds_available: number;
  oxygen_beds_total: number;
  oxygen_status: 'ADEQUATE' | 'WARNING' | 'CRITICAL';
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  
  predicted_available_12h: number;
  predicted_available_24h: number;
  predicted_icu_available_12h: number;
  predicted_icu_available_24h: number;
}

export type float = number;

export interface Bed {
  id: number;
  hospital_id: number;
  ward_name: string;
  bed_number: string;
  bed_type: 'GENERAL' | 'ICU' | 'PICU' | 'NICU' | 'CARDIAC_ICU' | 'OXYGEN_SUPPORTED' | 'VENTILATOR';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  is_iot_enabled: boolean;
  iot_sensor_id?: string;
  last_updated: string;
  patient_stay?: {
    patient_name: string;
    diagnosis: string;
    treatment_stage: string;
    spo2: number;
  } | null;
}

export interface OxygenInventory {
  id: number;
  hospital_id: number;
  bulk_tank_capacity_kl: number;
  bulk_tank_current_kl: number;
  cylinder_d_type_count: number;
  cylinder_b_type_count: number;
  daily_consumption_kl: number;
  estimated_days_left: number;
  last_refill_date: string;
}

export interface BloodInventoryItem {
  id: number;
  hospital_id: number;
  blood_group: string;
  units_available: number;
  units_critical_threshold: number;
  last_updated: string;
}

export interface HospitalDetail extends HospitalSummary {
  oxygen_inventory?: OxygenInventory;
  blood_inventory: BloodInventoryItem[];
  beds: Bed[];
}

export interface PatientStay {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  abha_id?: string;
  hospital_id: number;
  bed_id?: number;
  ward_name?: string;
  bed_number?: string;
  admission_date: string;
  diagnosis_category: string;
  diagnosis_detail?: string;
  co_morbidities?: string;
  treatment_stage: string;
  current_spo2: number;
  current_hr: number;
  current_map: number;
  current_rr: number;
  current_temp: number;
  vitals_stability_score: number;
  is_active: boolean;
}

export interface BedTurnoverPrediction {
  patient_id: string;
  patient_stay_id: number;
  bed_id?: number;
  ward_name?: string;
  bed_number?: string;
  discharge_probability_12h: number;
  discharge_probability_24h: number;
  expected_discharge_hours: number;
  confidence: number;
  clinical_stage: string;
  key_factors: Array<{ factor: string; impact: string; weight: string }>;
  recommendation: string;
}

export interface HospitalPredictionSummary {
  hospital_id: number;
  hospital_name: string;
  current_free_general: number;
  current_free_icu: number;
  current_free_ventilator: number;
  predicted_general_freed_12h: number;
  predicted_general_freed_24h: number;
  predicted_icu_freed_12h: number;
  predicted_icu_freed_24h: number;
  forecast_12h_total_general: number;
  forecast_24h_total_general: number;
  forecast_12h_total_icu: number;
  forecast_24h_total_icu: number;
  active_inpatient_predictions: BedTurnoverPrediction[];
}

export interface HospitalReferralScore {
  hospital_id: number;
  hospital_name: string;
  district: string;
  distance_km: number;
  estimated_travel_minutes: number;
  specialty_match: boolean;
  current_beds_available: number;
  predicted_beds_12h: number;
  overall_match_score: number;
  recommendation_rank: number;
  is_empanelled_pmjay: boolean;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  scoring_breakdown: {
    specialty_score: number;
    bed_availability_score: number;
    predicted_turnover_score: number;
    proximity_score: number;
    insurance_score: number;
    raw_total: number;
  };
}

export interface DistrictOverviewItem {
  district_id: number;
  district_name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  total_hospitals: number;
  total_beds: number;
  occupied_beds: number;
  occupancy_pct: number;
  total_icu: number;
  available_icu: number;
  icu_occupancy_pct: number;
  total_ventilators: number;
  available_ventilators: number;
  avg_oxygen_days: number;
  critical_hospitals_count: number;
  alert_status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface GovtCommandOverview {
  total_hospitals: number;
  total_beds: number;
  available_beds: number;
  total_icu_beds: number;
  available_icu_beds: number;
  icu_occupancy_rate: number;
  total_ventilators: number;
  available_ventilators: number;
  avg_state_oxygen_days: number;
  critical_districts_count: number;
  active_critical_alerts: number;
  districts: DistrictOverviewItem[];
  predicted_statewide_deficit_24h: number;
}

export interface DistrictAlert {
  id: number;
  district_id: number;
  district_name: string;
  alert_type: string;
  severity: string;
  message: string;
  recommended_action?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface IoTTelemetryItem {
  sensor_id: string;
  hospital_id: number;
  hospital_name: string;
  sensor_type: string;
  device_name: string;
  current_value: number;
  unit: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  timestamp: string;
}

export interface AuditLogItem {
  id: number;
  actor_email: string;
  actor_role: string;
  hospital_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  previous_value?: string;
  new_value?: string;
  timestamp: string;
  prev_hash: string;
  curr_hash: string;
}

export interface SimulationResult {
  scenario_type: string;
  projected_total_admissions: number;
  projected_icu_deficit_hours: number;
  projected_oxygen_stockout_days: number;
  affected_hospitals_count: number;
  critical_districts: string[];
  timeline_forecast: Array<{
    day: string;
    projected_admissions: number;
    remaining_icu_beds: number;
    remaining_oxygen_kl: number;
    icu_utilization_pct: number;
  }>;
  mitigation_recommendations: string[];
}
