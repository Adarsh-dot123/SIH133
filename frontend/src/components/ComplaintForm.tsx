import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Phone, Video, User2, RefreshCw } from 'lucide-react';
import { submitNewComplaint, subscribeToComplaints, fetchLiveComplaints, PatientComplaintItem, DOCTORS_LIST, getDoctorForSpecialty } from '../services/complaintsService';

interface ComplaintFormProps {
  patientId: number;
  patientName: string;
  token?: string;
  myPeerId?: string | null;
  onCallDoctor?: (targetPeerId: string, doctorName: string, complaintId: number | string) => void;
}

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  Cardiology: ['heart', 'chest', 'cardiac', 'blood pressure', 'hypertension', 'palpitation', 'angina'],
  Pediatrics: ['child', 'baby', 'infant', 'kid', 'toddler', 'newborn', 'fever in baby'],
  Neurology: ['headache', 'migraine', 'seizure', 'stroke', 'brain', 'dizziness', 'paralysis'],
  Pulmonology: ['lung', 'breath', 'cough', 'asthma', 'oxygen', 'pneumonia', 'wheeze'],
  Nephrology: ['kidney', 'renal', 'dialysis', 'urine', 'creatinine'],
};

function detectSpecialty(text: string): string {
  const lower = text.toLowerCase();
  for (const [spec, kws] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return spec;
  }
  return 'General Medicine';
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ patientName, myPeerId, onCallDoctor }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDoctorEmail, setSelectedDoctorEmail] = useState('AUTO');
  const [detectedSpec, setDetectedSpec] = useState('General Medicine');
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [complaints, setComplaints] = useState<PatientComplaintItem[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Get current logged-in patient details
  const storedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('medflow_user') : null;
  const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const activePatientName = patientName || storedUser?.full_name || 'Patient';
  const activePatientEmail = storedUser?.email || 'patient@medflow.in';

  useEffect(() => {
    const autoSpec = detectSpecialty(title + ' ' + description);
    setDetectedSpec(autoSpec);
  }, [title, description]);

  useEffect(() => {
    const unsub = subscribeToComplaints(null, (list) => {
      setComplaints(list);
    });
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setLoadingHistory(true);
    const list = await fetchLiveComplaints(null);
    setComplaints(list);
    setLoadingHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Please enter a symptom title.'); return; }
    setSubmitting(true); setError('');

    let targetDoctor = DOCTORS_LIST[0];
    let finalSpec = detectedSpec;

    if (selectedDoctorEmail !== 'AUTO') {
      const matchedDoc = DOCTORS_LIST.find(d => d.email === selectedDoctorEmail);
      if (matchedDoc) {
        targetDoctor = matchedDoc;
        finalSpec = matchedDoc.spec;
      }
    } else {
      targetDoctor = getDoctorForSpecialty(detectedSpec);
      finalSpec = targetDoctor.spec;
    }
    
    try {
      await submitNewComplaint({
        patient_name: activePatientName,
        patient_email: activePatientEmail,
        title,
        description,
        specialization_needed: finalSpec,
        assigned_doctor_name: targetDoctor.name,
        doctor_peer_id: targetDoctor.peerId,
        patient_peer_id: myPeerId || `medflow-${activePatientEmail.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      });

      setSuccessMsg(`Consultation ticket created! Connected with ${targetDoctor.name} (${finalSpec}). You can start a live video call below.`);
      setTitle('');
      setDescription('');
      handleRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => s === 'OPEN' ? '#d97706' : s === 'IN_CALL' ? '#0d9488' : '#059669';
  const statusIcon = (s: string) => s === 'OPEN' ? <Clock size={13} /> : s === 'IN_CALL' ? <Phone size={13} /> : <CheckCircle size={13} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Complaint Form */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <MessageSquare size={20} style={{ color: '#0d9488' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Instant Doctor Video Consultation (Universal Telehealth)
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
          Logged in as <strong>{activePatientName}</strong> ({activePatientEmail}). Connect with any available doctor across India.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Select Specialist / Doctor</label>
            <select
              value={selectedDoctorEmail}
              onChange={e => setSelectedDoctorEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px', background: '#fff', boxSizing: 'border-box' }}
            >
              <option value="AUTO">✨ Auto-Match from Symptoms ({detectedSpec})</option>
              {DOCTORS_LIST.map(doc => (
                <option key={doc.email} value={doc.email}>
                  👨‍⚕️ {doc.name} — {doc.spec} ({doc.hospital})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Symptom / Health Concern Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. High fever, breathing difficulty, severe chest tightness"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Detailed Symptoms & Medical History</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe when symptoms started, severity, previous treatments or allergies..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {error && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#dc2626', display: 'flex', gap: '6px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
          {successMsg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>{successMsg}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontWeight: 700, fontSize: '0.9rem' }}
          >
            <Send size={16} />
            {submitting ? 'Connecting...' : 'Submit Consultation Request & Match Doctor'}
          </button>
        </form>
      </div>

      {/* Complaint History & Video Call Action */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Live Consultation Tickets & Video Connect
          </h4>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer' }}
          >
            <RefreshCw size={12} style={{ animation: loadingHistory ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
            <Clock size={28} style={{ margin: '0 auto 8px', color: '#0d9488' }} />
            <div style={{ fontWeight: 700 }}>No active consultation tickets</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Submit your symptoms above to start a live video call with a specialist.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map(c => {
              const docInfo = DOCTORS_LIST.find(d => d.name === c.assigned_doctor_name || d.spec.toLowerCase() === c.specialization_needed.toLowerCase()) || DOCTORS_LIST[0];
              const targetDocPeer = c.doctor_peer_id || docInfo.peerId;
              const docName = c.assigned_doctor_name || docInfo.name;

              return (
                <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Patient: <strong>{c.patient_name}</strong> • {c.specialization_needed} • {new Date(c.created_at).toLocaleTimeString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#0d9488', marginTop: '4px', fontWeight: 700 }}>
                        👨‍⚕️ Assigned Specialist: {docName} ({docInfo.hospital})
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: statusColor(c.status), background: '#ffffff', padding: '3px 8px', borderRadius: '9999px', border: `1px solid ${statusColor(c.status)}30` }}>
                      {statusIcon(c.status)}
                      {c.status.replace('_', ' ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => {
                        if (onCallDoctor) {
                          onCallDoctor(targetDocPeer, docName, c.id);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', fontWeight: 700, background: '#059669', borderColor: '#059669' }}
                    >
                      <Video size={16} /> 📹 Start Video Call with {docName}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
