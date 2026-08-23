import {
  HospitalSummary, HospitalDetail, Bed, PatientStay, HospitalPredictionSummary,
  BedTurnoverPrediction, HospitalReferralScore, GovtCommandOverview, DistrictAlert,
  IoTTelemetryItem, AuditLogItem, SimulationResult
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? '/api' : 'http://localhost:8000/api');
const GOOGLE_SHEET_GVIZ_URL = "https://docs.google.com/spreadsheets/d/1tKNiTPW1_w54FWtRQZ7hg3Yww35LZaEpRBeyH1ZCjrw/gviz/tq?tqx=out:csv&gid=1397067521";

async function fetchHospitalsFromGoogleSheet(): Promise<HospitalSummary[]> {
  try {
    const res = await fetch(`${GOOGLE_SHEET_GVIZ_URL}&_t=${Date.now()}`);
    if (!res.ok) return [];
    const csv = await res.text();
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const hospitals: HospitalSummary[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
      if (row.length < 2) continue;

      const getVal = (col: string) => {
        const idx = headers.indexOf(col);
        return idx !== -1 ? row[idx] : '';
      };
      const getNum = (col: string, def = 0) => {
        const v = parseInt(getVal(col), 10);
        return isNaN(v) ? def : v;
      };

      const id = getNum('id', i);
      const name = getVal('name') || `Hospital ${id}`;

      hospitals.push({
        id,
        name,
        district_id: id <= 5 ? 1 : id <= 8 ? 2 : 3,
        district_name: id <= 5 ? 'Chennai' : id <= 8 ? 'Coimbatore' : 'Madurai',
        state: 'Tamil Nadu',
        address: `${name}, Main Road`,
        latitude: 13.05 + (id * 0.01),
        longitude: 80.24 + (id * 0.01),
        phone: '+91-44-28290200',
        is_empanelled_pmjay: true,
        is_empanelled_cghs: true,
        has_hms: true,
        rating: 4.8,
        specialties: ['Cardiology', 'Pediatrics', 'Neurology', 'Pulmonology', 'Nephrology', 'General Medicine'],
        general_beds_available: getNum('general_beds_available', 10),
        general_beds_total: getNum('general_beds_total', 15),
        icu_beds_available: getNum('icu_beds_available', 3),
        icu_beds_total: getNum('icu_beds_total', 10),
        ventilators_available: getNum('ventilators_available', 2),
        ventilators_total: getNum('ventilators_total', 3),
        oxygen_beds_available: getNum('oxygen_beds_available', 3),
        oxygen_beds_total: getNum('oxygen_beds_total', 6),
        oxygen_status: 'ADEQUATE',
        status: 'NORMAL',
        doctors_on_duty: getNum('doctors_on_duty', 12),
        predicted_available_12h: 4,
        predicted_available_24h: 7,
        predicted_icu_available_12h: 2,
        predicted_icu_available_24h: 3
      });
    }
    return hospitals;
  } catch (err) {
    console.warn("Direct Google Sheet CSV fetch fallback:", err);
    return [];
  }
}

class ApiClient {
  private token: string | null = localStorage.getItem('medflow_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('medflow_token', token);
    } else {
      localStorage.removeItem('medflow_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      if (errText) {
        try {
          const errJson = JSON.parse(errText);
          errorMsg = errJson.detail || errText;
        } catch {
          errorMsg = errText;
        }
      }
      throw new Error(errorMsg);
    }

    const resText = await response.text().catch(() => '');
    if (!resText) return {} as T;
    try {
      return JSON.parse(resText) as T;
    } catch {
      return {} as T;
    }
  }

  // Auth
  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Backend API with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await this.request<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res && res.access_token && res.user) {
        this.setToken(res.access_token);
        localStorage.setItem('medflow_user', JSON.stringify(res.user));
        return res;
      }
    } catch {
      // Backend not reachable on static hosting (e.g. Netlify over HTTPS)
    }

    // 2. Demo accounts fallback for cloud/Netlify deployment
    const DEMO_USERS: Record<string, any> = {
      'admin@medflow.gov.in': {
        id: 1, email: 'admin@medflow.gov.in', full_name: 'Government Administrator',
        role: 'GOVT_ADMIN', department: 'State Health Authority', designation: 'District Health Officer', phone: '+91-9000000001'
      },
      'dr.arun@apollo.in': {
        id: 2, email: 'dr.arun@apollo.in', full_name: 'Dr. Arun Sharma',
        role: 'HOSPITAL_STAFF', hospital_id: 1, department: 'Cardiology', designation: 'Senior Cardiologist', phone: '+91-9000000002'
      },
      'dr.priya@fortis.in': {
        id: 3, email: 'dr.priya@fortis.in', full_name: 'Dr. Priya Nair',
        role: 'HOSPITAL_STAFF', hospital_id: 2, department: 'Pediatrics', designation: 'Senior Pediatrician', phone: '+91-9000000003'
      },
      'dr.rajan@kamaraj.in': {
        id: 4, email: 'dr.rajan@kamaraj.in', full_name: 'Dr. Rajan Kumar',
        role: 'HOSPITAL_STAFF', hospital_id: 3, department: 'Neurology', designation: 'Senior Neurologist', phone: '+91-9000000004'
      },
      'dr.meena@nehru.in': {
        id: 5, email: 'dr.meena@nehru.in', full_name: 'Dr. Meena Patel',
        role: 'HOSPITAL_STAFF', hospital_id: 4, department: 'Pulmonology', designation: 'Senior Pulmonologist', phone: '+91-9000000005'
      },
      'dr.vikram@gandhi.in': {
        id: 6, email: 'dr.vikram@gandhi.in', full_name: 'Dr. Vikram Singh',
        role: 'HOSPITAL_STAFF', hospital_id: 5, department: 'Nephrology', designation: 'Senior Nephrologist', phone: '+91-9000000006'
      },
      'ramesh@patient.in': {
        id: 18, email: 'ramesh@patient.in', full_name: 'Ramesh Kumar',
        role: 'PATIENT', phone: '+91-9000000007'
      },
      'kavya@patient.in': {
        id: 19, email: 'kavya@patient.in', full_name: 'Kavya Reddy',
        role: 'PATIENT', phone: '+91-9000000008'
      },
      'arjun@patient.in': {
        id: 20, email: 'arjun@patient.in', full_name: 'Arjun Mehta',
        role: 'PATIENT', phone: '+91-9000000009'
      }
    };

    const demoUser = DEMO_USERS[cleanEmail];
    if (demoUser) {
      const demoToken = `medflow_demo_${btoa(cleanEmail)}_${Date.now()}`;
      this.setToken(demoToken);
      localStorage.setItem('medflow_user', JSON.stringify(demoUser));
      return {
        access_token: demoToken,
        user: demoUser
      };
    }

    throw new Error('Invalid email or password. Please check your credentials.');
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    hospital_id?: number | null;
    phone?: string;
    department?: string;
    designation?: string;
    abha_id?: string;
  }) {
    try {
      return await this.request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const user = {
        id: Math.floor(100 + Math.random() * 900),
        ...data
      };
      localStorage.setItem('medflow_user', JSON.stringify(user));
      return user;
    }
  }

  async getMe() {
    const saved = localStorage.getItem('medflow_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return this.request<any>('/auth/me');
  }

  async getUsers() {
    return this.request<any[]>('/auth/users');
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('medflow_user');
  }

  // Hospitals
  async getHospitals(params: { district_id?: number; specialty?: string; pmjay_only?: boolean; search?: string } = {}): Promise<HospitalSummary[]> {
    const query = new URLSearchParams();
    if (params.district_id) query.set('district_id', params.district_id.toString());
    if (params.specialty) query.set('specialty', params.specialty);
    if (params.pmjay_only) query.set('pmjay_only', 'true');
    if (params.search) query.set('search', params.search);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await this.request<HospitalSummary[]>(`/hospitals?${query.toString()}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {
      // Backend not available on cloud static hosts
    }

    // Direct live Google Sheet sync fallback
    const gSheetData = await fetchHospitalsFromGoogleSheet();
    if (gSheetData.length > 0) return gSheetData;

    return [];
  }

  async getHospitalDetail(id: number): Promise<HospitalDetail> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await this.request<HospitalDetail>(`/hospitals/${id}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res && res.id) return res;
    } catch {}

    const gSheetData = await fetchHospitalsFromGoogleSheet();
    const match = gSheetData.find(h => h.id === id);
    if (match) return match as unknown as HospitalDetail;
    throw new Error(`Hospital ${id} not found`);
  }

  async updateOxygen(hospitalId: number, data: { bulk_tank_current_kl?: number; cylinder_d_type_count?: number }) {
    return this.request(`/hospitals/${hospitalId}/oxygen`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateBlood(hospitalId: number, bloodGroup: string, units: number) {
    return this.request(`/hospitals/${hospitalId}/blood`, {
      method: 'PATCH',
      body: JSON.stringify({ blood_group: bloodGroup, units_available: units }),
    });
  }

  async dispatchMedicineResupply(hospitalId: number, medId: string) {
    return this.request<{ message: string; vehicle: string }>(`/hospitals/${hospitalId}/medicines/${medId}/resupply`, {
      method: 'POST',
    });
  }

  // Beds
  async getBeds(hospitalId?: number) {
    const query = hospitalId ? `?hospital_id=${hospitalId}` : '';
    return this.request<Bed[]>(`/beds${query}`);
  }

  async toggleBedStatus(bedId: number, status: string) {
    return this.request(`/beds/${bedId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async batchToggleBeds(bedIds: number[], newStatus: string) {
    return this.request('/beds/batch-toggle', {
      method: 'POST',
      body: JSON.stringify({ bed_ids: bedIds, new_status: newStatus }),
    });
  }

  // ML Predictions
  async getHospitalPredictions(hospitalId: number) {
    return this.request<HospitalPredictionSummary>(`/predictions/hospital/${hospitalId}`);
  }

  async getPatientPrediction(stayId: number) {
    return this.request<BedTurnoverPrediction>(`/predictions/patient/${stayId}`);
  }

  async getPatientStays(hospitalId?: number) {
    const query = hospitalId ? `?hospital_id=${hospitalId}` : '';
    return this.request<PatientStay[]>(`/predictions/stays${query}`);
  }

  async updatePatientVitals(stayId: number, data: any) {
    return this.request<{ message: string; prediction: any }>(`/predictions/patient/${stayId}/recalculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Smart Referrals
  async getReferralRecommendations(payload: {
    originating_lat: number;
    originating_lng: number;
    required_specialty: string;
    required_bed_type: string;
    insurance_scheme?: string;
    urgency_level: string;
  }) {
    return this.request<HospitalReferralScore[]>('/referrals/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createReferral(payload: any) {
    return this.request('/referrals/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getReferrals() {
    return this.request<any[]>('/referrals');
  }

  async getAmbulances() {
    return this.request<any[]>('/ambulances');
  }

  // Govt Admin
  async getAdminOverview() {
    return this.request<GovtCommandOverview>('/admin/overview');
  }

  async getDistrictAlerts() {
    return this.request<DistrictAlert[]>('/admin/alerts');
  }

  async reallocateResources(payload: {
    from_district_id: number;
    to_district_id: number;
    resource_type: string;
    quantity: number;
    notes?: string;
  }) {
    return this.request<{ message: string; status: string }>('/admin/reallocate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Digital Twin Simulation
  async runSimulation(payload: {
    scenario_type: string;
    patient_influx_surge_pct: number;
    icu_demand_multiplier: number;
    oxygen_consumption_multiplier: number;
    duration_days: number;
  }) {
    return this.request<SimulationResult>('/simulation/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // IoT Telemetry
  async getIoTTelemetry() {
    return this.request<IoTTelemetryItem[]>('/iot/telemetry');
  }

  // Blockchain Audit Trail
  async getAuditLogs(limit: number = 40) {
    return this.request<AuditLogItem[]>(`/audit-logs?limit=${limit}`);
  }

  async verifyAuditTrail() {
    return this.request<{
      is_valid: boolean;
      total_blocks_verified: number;
      last_block_hash: string;
      chain_integrity_status: string;
    }>('/audit-logs/verify');
  }

  // ABDM / FHIR
  async exportFHIRBundle(stayId: number) {
    return this.request<any>(`/abdm/export/${stayId}`);
  }

  async verifyABHA(abhaId: string) {
    return this.request<any>('/abdm/fetch-records', {
      method: 'POST',
      body: JSON.stringify({ abha_id: abhaId }),
    });
  }

  // Rural Gateway
  async queryUSSD(sessionId: string, userInput: string) {
    return this.request<{ session_id: string; message: string; should_continue: boolean }>('/rural/ussd', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, phone_number: '+919876543210', user_input: userInput }),
    });
  }

  async querySMS(senderPhone: string, messageBody: string) {
    return this.request<{ reply_to: string; sms_text: string; hospitals_found: number }>('/rural/sms', {
      method: 'POST',
      body: JSON.stringify({ sender_phone: senderPhone, message_body: messageBody }),
    });
  }

  // Second Opinion Medical Report Scan
  async scanSecondOpinion(file: File, userLat?: number, userLng?: number) {
    const formData = new FormData();
    formData.append('file', file);
    
    const lat = userLat !== undefined ? userLat : 13.0827;
    const lng = userLng !== undefined ? userLng : 80.2707;
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(`${API_BASE}/reports/second-opinion?user_lat=${lat}&user_lng=${lng}`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        throw new Error(errJson.detail || 'Failed to analyze second opinion');
      } catch (e: any) {
        throw new Error(e.message || `HTTP ${response.status}`);
      }
    }
    
    return response.json();
  }
}

export const api = new ApiClient();

export function createWebSocketSubscriber(onMessage: (event: string, data: any) => void) {
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const wsUrl = import.meta.env.VITE_WS_URL || (isLocalhost ? 'ws://localhost:8000/ws/live' : null);
  let socket: WebSocket | null = null;
  let reconnectTimer: any = null;

  if (!wsUrl) {
    console.log('[MedFlow WS] Cloud static environment detected. Live data powered by Google Sheets & Firestore.');
    return () => {};
  }

  function connect() {
    try {
      socket = new WebSocket(wsUrl!);

      socket.onopen = () => {
        console.log('[MedFlow WS] Connected to live event stream');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event && payload.data) {
            onMessage(payload.event, payload.data);
          }
        } catch (e) {
          console.error('[MedFlow WS] Parse error', e);
        }
      };

      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 4000);
      };

      socket.onerror = (err) => {
        socket?.close();
      };
    } catch (err) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) socket.close();
  };
}
