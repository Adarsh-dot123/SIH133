import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { submitNewComplaint, subscribeToComplaints, PatientComplaintItem } from '../services/complaintsService';

interface ComplaintFormProps {
  patientId: number;
  patientName: string;
  token?: string;
  myPeerId?: string | null;
  onIncomingCall?: (callInfo: { doctorName: string; peerId: string; complaintId: number }) => void;
}

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  Cardiology: ['heart', 'chest', 'cardiac', 'blood pressure', 'hypertension', 'palpitation', 'angina'],
  Pediatrics: ['child', 'baby', 'infant', 'kid', 'toddler', 'newborn'],
  Neurology: ['headache', 'migraine', 'seizure', 'stroke', 'brain', 'dizziness'],
  Pulmonology: ['lung', 'breath', 'cough', 'asthma', 'oxygen', 'pneumonia'],
  Nephrology: ['kidney', 'renal', 'dialysis', 'urine', 'creatinine'],
};

function detectSpecialty(text: string): string {
  const lower = text.toLowerCase();
  for (const [spec, kws] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return spec;
  }
  return 'General Medicine';
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ patientName, myPeerId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [detectedSpec, setDetectedSpec] = useState('General Medicine');
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState<PatientComplaintItem[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDetectedSpec(detectSpecialty(title + ' ' + description));
  }, [title, description]);

  useEffect(() => {
    const unsub = subscribeToComplaints(null, (list) => {
      setComplaints(list);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Please enter a symptom title.'); return; }
    setSubmitting(true); setError('');
    const spec = detectedSpec;
    
    try {
      await submitNewComplaint({
        patient_name: patientName || 'Patient',
        title,
        description,
        specialization_needed: spec,
        patient_peer_id: myPeerId || undefined,
      });

      setSuccessMsg(`Complaint submitted! Matched to ${spec} specialist. A doctor will call you shortly.`);
      setTitle('');
      setDescription('');
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Talk to a Doctor</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
          Describe your symptoms and we'll connect you with the right specialist via a live video call.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Symptom / Concern Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Severe chest pain and palpitations"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Detailed Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe when it started, severity, any related symptoms..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {title && (
            <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>
              🩺 Auto-matched to: <strong>{detectedSpec}</strong> specialist
            </div>
          )}

          {error && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#dc2626', display: 'flex', gap: '6px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
          {successMsg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>{successMsg}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontWeight: 700 }}
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit & Connect to Doctor'}
          </button>
        </form>
      </div>

      {/* Complaint History */}
      {complaints.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Your Consultations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {complaints.map(c => (
              <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{c.title}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{c.specialization_needed} • {new Date(c.created_at).toLocaleString('en-IN')}</div>
                  {c.assigned_doctor_name && (
                    <div style={{ fontSize: '0.72rem', color: '#0d9488', marginTop: '2px', fontWeight: 600 }}>Attending: {c.assigned_doctor_name}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: statusColor(c.status), background: '#ffffff', padding: '3px 8px', borderRadius: '9999px', border: `1px solid ${statusColor(c.status)}30` }}>
                  {statusIcon(c.status)}
                  {c.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
