import React, { useState, useEffect } from 'react';
import { Stethoscope, Phone, Clock, CheckCircle, RefreshCw, User2, Activity } from 'lucide-react';
import { subscribeToComplaints, updateComplaintState, PatientComplaintItem } from '../services/complaintsService';

interface DoctorDashboardProps {
  doctorName: string;
  specialization: string;
  token?: string;
  myPeerId: string | null;
  onCallPatient: (complaint: PatientComplaintItem) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctorName, specialization, myPeerId, onCallPatient
}) => {
  const [complaints, setComplaints] = useState<PatientComplaintItem[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToComplaints(specialization, (list) => {
      setComplaints(list);
      setLoading(false);
    });
    return unsub;
  }, [specialization]);

  const handleCall = async (complaint: PatientComplaintItem) => {
    if (!myPeerId) {
      alert('Connecting to video call server... please try again in a moment.');
      return;
    }
    await updateComplaintState(complaint.id, 'IN_CALL', doctorName);
    onCallPatient(complaint);
  };

  const handleResolve = async (complaintId: number | string) => {
    await updateComplaintState(complaintId, 'RESOLVED');
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
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>Peer ID: {myPeerId ? myPeerId : 'Connecting to ICR...'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{openCount}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Waiting Patients</div>
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
            Live Consultation Queue — {specialization}
          </h3>
          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Live Synced
          </div>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#0d9488' }} />
            <div style={{ fontWeight: 700 }}>No open complaints in {specialization} queue</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Patients submitting symptoms will appear here instantly.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map(c => (
              <div key={c.id} style={{ background: c.status === 'IN_CALL' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${c.status === 'IN_CALL' ? '#bbf7d0' : '#fecdd3'}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <User2 size={14} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0d9488' }}>{c.patient_name}</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                    {c.description && <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>{c.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    <Clock size={12} />{new Date(c.created_at).toLocaleTimeString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {c.status === 'OPEN' && (
                    <button
                      onClick={() => handleCall(c)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontWeight: 700 }}
                    >
                      <Phone size={14} /> 📹 Call Patient
                    </button>
                  )}
                  {(c.status === 'OPEN' || c.status === 'IN_CALL') && (
                    <button
                      onClick={() => handleResolve(c.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
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
