export interface PatientComplaintItem {
  id: number | string;
  _id?: string;
  patient_id?: number | string;
  patient_name: string;
  patient_email?: string;
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
const CRUD_API = 'https://crudcrud.com/api/9bc374dcb6ed46b8a5323932a9022c4e/complaints';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('medflow_complaints_channel')
  : null;

export const DOCTORS_LIST = [
  { name: 'Dr. Arun Sharma', email: 'dr.arun@apollo.in', spec: 'Cardiology', hospital: 'Apollo Hospitals', peerId: 'medflow-drarunapolloin' },
  { name: 'Dr. Priya Nair', email: 'dr.priya@fortis.in', spec: 'Pediatrics', hospital: 'Fortis Hospital', peerId: 'medflow-drpriyafortisin' },
  { name: 'Dr. Rajan Kumar', email: 'dr.rajan@kamaraj.in', spec: 'Neurology', hospital: 'Kamaraj Hospital', peerId: 'medflow-drrajankamarajin' },
  { name: 'Dr. Meena Patel', email: 'dr.meena@nehru.in', spec: 'Pulmonology', hospital: 'Nehru Hospital', peerId: 'medflow-drmeenamehruin' },
  { name: 'Dr. Vikram Singh', email: 'dr.vikram@gandhi.in', spec: 'Nephrology', hospital: 'Gandhi Hospital', peerId: 'medflow-drvikramgandhiin' },
];

export function getDoctorForSpecialty(spec: string) {
  const match = DOCTORS_LIST.find(d => d.spec.toLowerCase() === spec.toLowerCase());
  return match || DOCTORS_LIST[0];
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
    const res = await fetch(CRUD_API);
    if (!res.ok) return [];
    const items = await res.json();
    if (Array.isArray(items)) {
      return items.map((item: any) => ({
        id: item._id || item.id || Date.now(),
        _id: item._id,
        patient_name: item.patient_name || 'Patient',
        patient_email: item.patient_email,
        title: item.title || '',
        description: item.description || '',
        specialization_needed: item.specialization_needed || 'General Medicine',
        patient_peer_id: item.patient_peer_id || (item.patient_email ? `medflow-${item.patient_email.toLowerCase().replace(/[^a-z0-9]/g, '')}` : ''),
        status: item.status || 'OPEN',
        assigned_doctor_name: item.assigned_doctor_name,
        doctor_peer_id: item.doctor_peer_id,
        created_at: item.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn("CRUD Cloud sync fetch notice:", err);
  }
  return [];
}

export async function submitNewComplaint(complaint: Omit<PatientComplaintItem, 'id' | 'created_at' | 'status'> & { id?: number | string; status?: string }): Promise<PatientComplaintItem> {
  const newId = complaint.id || Date.now();
  const docInfo = getDoctorForSpecialty(complaint.specialization_needed);
  
  const fullItem: PatientComplaintItem = {
    ...complaint,
    id: newId,
    status: complaint.status || 'OPEN',
    assigned_doctor_name: complaint.assigned_doctor_name || docInfo.name,
    doctor_peer_id: complaint.doctor_peer_id || docInfo.peerId,
    created_at: new Date().toISOString()
  };

  // 1. Save locally
  const existing = getLocalComplaints();
  const updated = [fullItem, ...existing.filter(c => String(c.id) !== String(newId))];
  saveLocalComplaints(updated);

  // 2. Post to Cloud CRUD API
  try {
    const res = await fetch(CRUD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullItem)
    });
    if (res.ok) {
      const created = await res.json();
      if (created && created._id) {
        fullItem._id = created._id;
        fullItem.id = created._id;
        const fresh = [fullItem, ...existing.filter(c => String(c.id) !== String(newId))];
        saveLocalComplaints(fresh);
      }
    }
  } catch (err) {
    console.warn("CRUD Cloud POST notice:", err);
  }

  return fullItem;
}

export async function updateComplaintState(complaintId: number | string, status: string, doctorName?: string) {
  const existing = getLocalComplaints();
  const target = existing.find(c => String(c.id) === String(complaintId) || String(c._id) === String(complaintId));
  
  const updated = existing.map(c => {
    if (String(c.id) === String(complaintId) || String(c._id) === String(complaintId)) {
      return { ...c, status, ...(doctorName ? { assigned_doctor_name: doctorName } : {}) };
    }
    return c;
  });
  saveLocalComplaints(updated);

  // Update on cloud CRUD
  if (target && target._id) {
    try {
      const { _id, ...cleanData } = { ...target, status, ...(doctorName ? { assigned_doctor_name: doctorName } : {}) };
      await fetch(`${CRUD_API}/${target._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });
    } catch {}
  }
}

export async function fetchLiveComplaints(specialization: string | null): Promise<PatientComplaintItem[]> {
  const cloudList = await fetchFromCloud();
  const list = cloudList.length > 0 ? cloudList : getLocalComplaints();
  saveLocalComplaints(list);

  if (specialization && specialization !== 'ALL') {
    return list.filter(c => c.specialization_needed.toLowerCase() === specialization.toLowerCase() && c.status !== 'RESOLVED');
  }
  return list.filter(c => c.status !== 'RESOLVED');
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
      if (specialization && specialization !== 'ALL') {
        onUpdate(list.filter(c => c.specialization_needed.toLowerCase() === specialization.toLowerCase() && c.status !== 'RESOLVED'));
      } else {
        onUpdate(list.filter(c => c.status !== 'RESOLVED'));
      }
    }
  };

  if (channel) channel.addEventListener('message', handleMessage);

  // Initial load from local
  const initialLocal = getLocalComplaints();
  if (specialization && specialization !== 'ALL') {
    onUpdate(initialLocal.filter(c => c.specialization_needed.toLowerCase() === specialization.toLowerCase() && c.status !== 'RESOLVED'));
  } else {
    onUpdate(initialLocal.filter(c => c.status !== 'RESOLVED'));
  }

  // Cloud pull
  refresh();
  const interval = setInterval(refresh, 2500);

  return () => {
    if (channel) channel.removeEventListener('message', handleMessage);
    clearInterval(interval);
  };
}
