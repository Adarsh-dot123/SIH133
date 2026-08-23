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
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('medflow_complaints_channel')
  : null;

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
    if (channel) channel.postMessage({ type: 'SYNC_COMPLAINTS', list });
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

  const existing = getLocalComplaints();
  const updated = [fullItem, ...existing.filter(c => String(c.id) !== String(newId))];
  saveLocalComplaints(updated);

  return fullItem;
}

export async function updateComplaintState(complaintId: number | string, status: string, doctorName?: string) {
  const existing = getLocalComplaints();
  const updated = existing.map(c => {
    if (String(c.id) === String(complaintId)) {
      return { ...c, status, ...(doctorName ? { assigned_doctor_name: doctorName } : {}) };
    }
    return c;
  });
  saveLocalComplaints(updated);
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

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SYNC_COMPLAINTS') {
      refresh();
    }
  };

  if (channel) channel.addEventListener('message', handleMessage);
  refresh();
  const interval = setInterval(refresh, 2000);

  return () => {
    if (channel) channel.removeEventListener('message', handleMessage);
    clearInterval(interval);
  };
}
