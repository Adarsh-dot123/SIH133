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

export function sendP2PData(targetPeerId: string, payload: any) {
  const activePeer = (window as any).__medflow_peer;
  if (!activePeer || activePeer.destroyed) return;

  try {
    const conn = activePeer.connect(targetPeerId);
    conn.on('open', () => {
      conn.send(payload);
      console.log(`[P2P WebRTC] Successfully sent to ${targetPeerId}`);
    });
  } catch (err) {
    console.warn(`[P2P WebRTC] Send notice for ${targetPeerId}:`, err);
  }
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

  // 2. Transmit directly to Doctor over WebRTC DataChannel
  const targetDoctorPeer = fullItem.doctor_peer_id || docInfo.peerId;
  sendP2PData(targetDoctorPeer, { type: 'NEW_COMPLAINT', complaint: fullItem });

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

  // Broadcast resolution to peer network
  const target = existing.find(c => String(c.id) === String(complaintId));
  if (target?.patient_peer_id) {
    sendP2PData(target.patient_peer_id, { type: 'RESOLVE_COMPLAINT', complaintId });
  }
}

export async function fetchLiveComplaints(specialization: string | null): Promise<PatientComplaintItem[]> {
  const list = getLocalComplaints();
  if (specialization && specialization !== 'ALL') {
    return list.filter(c => c.specialization_needed.toLowerCase() === specialization.toLowerCase() && c.status !== 'RESOLVED');
  }
  return list.filter(c => c.status !== 'RESOLVED');
}

export function subscribeToComplaints(
  specialization: string | null,
  onUpdate: (complaints: PatientComplaintItem[]) => void
): () => void {
  const refresh = () => {
    const list = getLocalComplaints();
    if (specialization && specialization !== 'ALL') {
      onUpdate(list.filter(c => c.specialization_needed.toLowerCase() === specialization.toLowerCase() && c.status !== 'RESOLVED'));
    } else {
      onUpdate(list.filter(c => c.status !== 'RESOLVED'));
    }
  };

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SYNC_COMPLAINTS') {
      refresh();
    }
  };

  const handleP2PSync = () => {
    refresh();
  };

  if (channel) channel.addEventListener('message', handleMessage);
  window.addEventListener('medflow_p2p_sync', handleP2PSync);

  refresh();
  const interval = setInterval(refresh, 2000);

  return () => {
    if (channel) channel.removeEventListener('message', handleMessage);
    window.removeEventListener('medflow_p2p_sync', handleP2PSync);
    clearInterval(interval);
  };
}
