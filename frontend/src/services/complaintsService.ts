export interface PatientComplaintItem {
  id: number | string;
  patient_id?: number | string;
  patient_name: string;
  title: string;
  description: string;
  specialization_needed: string;
  patient_peer_id?: string;
  status: string; // OPEN, IN_CALL, RESOLVED
  assigned_doctor_name?: string;
  doctor_peer_id?: string;
  created_at: string;
}

const STORAGE_KEY = 'medflow_shared_complaints';
const RELAY_TOPIC = 'medflow_sih_live_consultations_v2026';

const SPECIALTY_DOCTOR_MAP: Record<string, { name: string; peerId: string }> = {
  Cardiology: { name: 'Dr. Arun Sharma', peerId: 'medflow-drarunapolloin' },
  Pediatrics: { name: 'Dr. Priya Nair', peerId: 'medflow-drpriyafortisin' },
  Neurology: { name: 'Dr. Rajan Kumar', peerId: 'medflow-drrajankamarajin' },
  Pulmonology: { name: 'Dr. Meena Patel', peerId: 'medflow-drmeenamehruin' },
  Nephrology: { name: 'Dr. Vikram Singh', peerId: 'medflow-drvikramgandhiin' },
  'General Medicine': { name: 'Dr. Arun Sharma', peerId: 'medflow-drarunapolloin' }
};

export function getDoctorForSpecialty(spec: string) {
  return SPECIALTY_DOCTOR_MAP[spec] || SPECIALTY_DOCTOR_MAP['Cardiology'];
}

export function getLocalComplaints(): PatientComplaintItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalComplaints(list: PatientComplaintItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function submitNewComplaint(complaint: Omit<PatientComplaintItem, 'id' | 'created_at' | 'status'> & { id?: number | string; status?: string }): Promise<PatientComplaintItem> {
  const newId = complaint.id || Date.now();
  const docInfo = getDoctorForSpecialty(complaint.specialization_needed);
  
  const fullItem: PatientComplaintItem = {
    ...complaint,
    id: newId,
    status: complaint.status || 'OPEN',
    assigned_doctor_name: docInfo.name,
    doctor_peer_id: docInfo.peerId,
    created_at: new Date().toISOString()
  };

  // 1. Save to local storage
  const existing = getLocalComplaints();
  const updated = [fullItem, ...existing.filter(c => String(c.id) !== String(newId))];
  saveLocalComplaints(updated);

  // 2. Publish to Global Real-Time Cloud Relay (Instant cross-device push)
  try {
    fetch(`https://ntfy.sh/${RELAY_TOPIC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'NEW_COMPLAINT', complaint: fullItem })
    }).catch(() => {});
  } catch {}

  return fullItem;
}

export async function updateComplaintState(complaintId: number | string, status: string, doctorName?: string) {
  // 1. Local update
  const existing = getLocalComplaints();
  const updated = existing.map(c => {
    if (String(c.id) === String(complaintId)) {
      return { ...c, status, ...(doctorName ? { assigned_doctor_name: doctorName } : {}) };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // 2. Publish to Global Cloud Relay
  try {
    fetch(`https://ntfy.sh/${RELAY_TOPIC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'STATUS_UPDATE', complaintId, status, doctorName })
    }).catch(() => {});
  } catch {}
}

export function subscribeToComplaints(
  specialization: string | null,
  onUpdate: (complaints: PatientComplaintItem[]) => void
): () => void {
  const refresh = () => {
    const list = getLocalComplaints();
    if (specialization) {
      onUpdate(list.filter(c => (c.specialization_needed === specialization || specialization === 'ALL') && c.status !== 'RESOLVED'));
    } else {
      onUpdate(list);
    }
  };

  // 1. Listen to Global Real-Time Cloud SSE Stream
  let sse: EventSource | null = null;
  try {
    sse = new EventSource(`https://ntfy.sh/${RELAY_TOPIC}/sse`);
    sse.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const parsed = typeof raw.message === 'string' ? JSON.parse(raw.message) : (raw.message || raw);

        if (parsed.type === 'NEW_COMPLAINT' && parsed.complaint) {
          const existing = getLocalComplaints();
          const updated = [parsed.complaint, ...existing.filter(c => String(c.id) !== String(parsed.complaint.id))];
          saveLocalComplaints(updated);
          refresh();
        } else if (parsed.type === 'STATUS_UPDATE') {
          const existing = getLocalComplaints();
          const updated = existing.map(c => {
            if (String(c.id) === String(parsed.complaintId)) {
              return { ...c, status: parsed.status, ...(parsed.doctorName ? { assigned_doctor_name: parsed.doctorName } : {}) };
            }
            return c;
          });
          saveLocalComplaints(updated);
          refresh();
        }
      } catch (err) {
        // ignore parse notices
      }
    };
  } catch {}

  refresh();
  const interval = setInterval(refresh, 2500);

  return () => {
    if (sse) sse.close();
    clearInterval(interval);
  };
}
