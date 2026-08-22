import React, { useState, useEffect } from 'react';
import { Stethoscope, Phone, Clock, CheckCircle, RefreshCw, User2, Activity } from 'lucide-react';

interface Complaint {
  id: number;
  patient_id: number;
  patient_name: string;
  title: string;
  description: string;
  specialization_needed: string;
  status: string;
  created_at: string;
}

interface DoctorDashboardProps {
  doctorName: string;
  specialization: string;
  token?: string;
  myPeerId: string | null;
  onCallPatient: (complaint: Complaint) => void;
}

const API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctorName, specialization, token, myPeerId, onCallPatient
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/complaints?specialization=${encodeURIComponent(specialization)}&status=OPEN`, { headers });
      if (res.ok) setComplaints(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    loadComplaints();
    const iv = setInterval(loadComplaints, 5000);
    return () => clearInterval(iv);
  }, [specialization]);

  const handleCall = async (complaint: Complaint) => {
    if (!myPeerId) {
      alert('Connecting to video call server... please try again in a few seconds.');
      return;
    }
    await fetch(`${API}/api/complaints/${complaint.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_CALL' })
    });
    onCallPatient(complaint);
  };

  const handleResolve = async (complaintId: number) => {
    await fetch(`${API}/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'RESOLVED' })
    });
    loadComplaints();
  };

  const openCount = complaints.filter(c => c.status === 'OPEN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Doctor Header Card */}
      <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', borderRadius: '20px', padding: '28px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Stethoscope size={24} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{doctorName}</h2>
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Specialization: <strong>{specialization}</strong></div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>Peer ID: {myPeerId ? myPeerId : 'Connecting...'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{openCount}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Open Complaints</div>
            </div>
            <button
              onClick={() => setIsAvailable(a => !a)}
              style={{ background: isAvailable ? 'rgba(255,255,255,0.9)' : 'rgba(239,68,68,0.8)', color: isAvailable ? '#0d9488' : '#fff', border: 'none', borderRadius: '9999px', padding: '6px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {isAvailable ? '🟢 Online & Ready' : '🔴 Busy'}
            </button>
          </div>
        </div>
      </div>

      {/* Complaints Queue */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: '#0d9488' }} />
            Patient Consultation Queue — {specialization}
          </h3>
          <button onClick={loadComplaints} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#0d9488' }} />
            <div style={{ fontWeight: 700 }}>No pending patient complaints right now</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Auto-refreshing live queue every 5 seconds...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map(c => (
              <div key={c.id} style={{ background: c.status === 'IN_CALL' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${c.status === 'IN_CALL' ? '#bbf7d0' : '#fecdd3'}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <User2 size={14} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d9488' }}>{c.patient_name}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                    {c.description && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>{c.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    <Clock size={11} />{new Date(c.created_at).toLocaleTimeString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {c.status === 'OPEN' && (
                    <button
                      onClick={() => handleCall(c)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Phone size={14} /> 📹 Call Patient
                    </button>
                  )}
                  {(c.status === 'OPEN' || c.status === 'IN_CALL') && (
                    <button
                      onClick={() => handleResolve(c.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={14} /> Mark Resolved
                    </button>
                  )}
                  {c.status === 'IN_CALL' && (
                    <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Activity size={12} /> Call in progress
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
