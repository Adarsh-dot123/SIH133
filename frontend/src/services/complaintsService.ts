import { subscribeCollection, updateFirestoreDoc } from '../firebase';

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
  created_at: string;
}

const STORAGE_KEY = 'medflow_shared_complaints';
const API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('medflow_complaints_broadcast')
  : null;

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
  const fullItem: PatientComplaintItem = {
    ...complaint,
    id: newId,
    status: complaint.status || 'OPEN',
    created_at: new Date().toISOString()
  };

  // 1. Save to local store and broadcast
  const existing = getLocalComplaints();
  const updated = [fullItem, ...existing.filter(c => String(c.id) !== String(newId))];
  saveLocalComplaints(updated);

  // 2. Push to Firestore for cross-device cloud sync
  try {
    await updateFirestoreDoc('patient_complaints', String(newId), fullItem);
  } catch {}

  // 3. Push to backend SQLite API if reachable
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await fetch(`${API}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        title: fullItem.title,
        description: fullItem.description,
        patient_peer_id: fullItem.patient_peer_id
      })
    });
    clearTimeout(timer);
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

  // 2. Firestore cloud update
  try {
    await updateFirestoreDoc('patient_complaints', String(complaintId), {
      status,
      ...(doctorName ? { assigned_doctor_name: doctorName } : {})
    });
  } catch {}

  // 3. Backend API update
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await fetch(`${API}/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ status })
    });
    clearTimeout(timer);
  } catch {}
}

export function subscribeToComplaints(
  specialization: string | null,
  onUpdate: (complaints: PatientComplaintItem[]) => void
): () => void {
  const refresh = async () => {
    let list: PatientComplaintItem[] = getLocalComplaints();

    // Try Backend API first if on localhost
    try {
      const url = specialization 
        ? `${API}/api/complaints?specialization=${encodeURIComponent(specialization)}`
        : `${API}/api/complaints`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const idMap = new Map<string, PatientComplaintItem>();
          list.forEach(item => idMap.set(String(item.id), item));
          data.forEach((item: PatientComplaintItem) => {
            const prev = idMap.get(String(item.id));
            idMap.set(String(item.id), { ...item, patient_peer_id: item.patient_peer_id || prev?.patient_peer_id });
          });
          list = Array.from(idMap.values());
        }
      }
    } catch {}

    if (specialization) {
      onUpdate(list.filter(c => c.specialization_needed === specialization && c.status !== 'RESOLVED'));
    } else {
      onUpdate(list);
    }
  };

  // 1. Subscribe to Firestore cloud updates
  const unsubFirestore = subscribeCollection('patient_complaints', (docs) => {
    if (docs && docs.length > 0) {
      const merged = docs.map(d => ({
        id: d.id,
        patient_name: d.patient_name || 'Patient',
        title: d.title || '',
        description: d.description || '',
        specialization_needed: d.specialization_needed || 'General Medicine',
        patient_peer_id: d.patient_peer_id || '',
        status: d.status || 'OPEN',
        assigned_doctor_name: d.assigned_doctor_name,
        created_at: d.created_at || new Date().toISOString()
      }));
      saveLocalComplaints(merged);
      if (specialization) {
        onUpdate(merged.filter(c => c.specialization_needed === specialization && c.status !== 'RESOLVED'));
      } else {
        onUpdate(merged);
      }
    }
  });

  // 2. BroadcastChannel cross-tab listener
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_COMPLAINTS' && Array.isArray(event.data.list)) {
      const list = event.data.list;
      if (specialization) {
        onUpdate(list.filter((c: PatientComplaintItem) => c.specialization_needed === specialization && c.status !== 'RESOLVED'));
      } else {
        onUpdate(list);
      }
    }
  };

  if (channel) channel.addEventListener('message', handleBcMessage);

  refresh();
  const interval = setInterval(refresh, 3000);

  return () => {
    unsubFirestore();
    if (channel) channel.removeEventListener('message', handleBcMessage);
    clearInterval(interval);
  };
}
