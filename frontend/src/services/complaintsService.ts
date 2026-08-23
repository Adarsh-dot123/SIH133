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
const CLOUD_SYNC_ENDPOINT = 'https://api.restful-api.dev/objects/ff8081819ff5b11001a02d20a9a47e08';

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

export async function fetchFromCloud(): Promise<PatientComplaintItem[]> {
  try {
    const res = await fetch(`${CLOUD_SYNC_ENDPOINT}?_t=${Date.now()}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.items)) {
      return json.data.items;
    }
  } catch (err) {
    console.warn("Cloud sync fetch notice:", err);
  }
  return [];
}

export async function pushToCloud(items: PatientComplaintItem[]): Promise<void> {
  try {
    await fetch(CLOUD_SYNC_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'medflow_complaints',
        data: { items: items.slice(0, 50) }
      })
    });
  } catch (err) {
    console.warn("Cloud sync push notice:", err);
  }
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

  // 1. Fetch latest remote array first so we don't overwrite other devices
  const remote = await fetchFromCloud();
  const base = remote.length > 0 ? remote : getLocalComplaints();
  const updated = [fullItem, ...base.filter(c => String(c.id) !== String(newId))];

  // 2. Save locally and to Global Cloud
  saveLocalComplaints(updated);
  await pushToCloud(updated);

  return fullItem;
}

export async function updateComplaintState(complaintId: number | string, status: string, doctorName?: string) {
  const remote = await fetchFromCloud();
  const base = remote.length > 0 ? remote : getLocalComplaints();

  const updated = base.map(c => {
    if (String(c.id) === String(complaintId)) {
      return { ...c, status, ...(doctorName ? { assigned_doctor_name: doctorName } : {}) };
    }
    return c;
  });

  saveLocalComplaints(updated);
  await pushToCloud(updated);
}

export async function fetchLiveComplaints(specialization: string | null): Promise<PatientComplaintItem[]> {
  const cloudList = await fetchFromCloud();
  const list = cloudList.length > 0 ? cloudList : getLocalComplaints();
  saveLocalComplaints(list);

  if (specialization) {
    return list.filter(c => (c.specialization_needed === specialization || specialization === 'ALL') && c.status !== 'RESOLVED');
  }
  return list;
}

export function subscribeToComplaints(
  specialization: string | null,
  onUpdate: (complaints: PatientComplaintItem[]) => void
): () => void {
  const refresh = async () => {
    const list = await fetchLiveComplaints(specialization);
    onUpdate(list);
  };

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SYNC_COMPLAINTS') {
      const list = getLocalComplaints();
      if (specialization) {
        onUpdate(list.filter(c => (c.specialization_needed === specialization || specialization === 'ALL') && c.status !== 'RESOLVED'));
      } else {
        onUpdate(list);
      }
    }
  };

  if (channel) channel.addEventListener('message', handleMessage);
  
  // Instant initial load
  const initialLocal = getLocalComplaints();
  if (specialization) {
    onUpdate(initialLocal.filter(c => (c.specialization_needed === specialization || specialization === 'ALL') && c.status !== 'RESOLVED'));
  } else {
    onUpdate(initialLocal);
  }

  // Live cloud sync
  refresh();
  const interval = setInterval(refresh, 2500);

  return () => {
    if (channel) channel.removeEventListener('message', handleMessage);
    clearInterval(interval);
  };
}
