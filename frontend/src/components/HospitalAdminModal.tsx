import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Plus, Minus, Truck } from 'lucide-react';
import { subscribeCollection, updateFirestoreDoc } from '../firebase';

interface HospitalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HospitalAdminModal: React.FC<HospitalAdminModalProps> = ({ isOpen, onClose }) => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selectedHospId, setSelectedHospId] = useState<string>('');
  
  // Form states
  const [icuBeds, setIcuBeds] = useState<number>(0);
  const [doctors, setDoctors] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    
    // Subscribe to firestore data
    const unsubHospitals = subscribeCollection('hospitals', (data) => {
      setHospitals(data);
      if (data.length > 0 && !selectedHospId) {
        setSelectedHospId(data[0].id);
      }
    });

    const unsubAmbulances = subscribeCollection('ambulances', (data) => {
      setAmbulances(data);
    });

    return () => {
      unsubHospitals();
      unsubAmbulances();
    };
  }, [isOpen]);

  // Sync inputs when selected hospital changes
  useEffect(() => {
    const hosp = hospitals.find(h => h.id === selectedHospId);
    if (hosp) {
      setIcuBeds(hosp.icu_beds_available ?? 0);
      setDoctors(hosp.doctors_on_duty ?? 0);
    }
  }, [selectedHospId, hospitals]);

  if (!isOpen) return null;

  const handleSaveHospitalData = async () => {
    try {
      await updateFirestoreDoc('hospitals', selectedHospId, {
        icu_beds_available: icuBeds,
        doctors_on_duty: doctors
      });
      alert('Hospital metrics updated live in Firestore!');
    } catch (err) {
      console.error(err);
      alert('Failed to update metrics.');
    }
  };

  const handleToggleAmbulance = async (ambId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'available' ? 'busy' : 'available';
      await updateFirestoreDoc('ambulances', ambId, {
        status: nextStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          padding: '20px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldAlert size={24} style={{ color: '#fbbf24' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Hospital Admin Live Editor
            </h2>
            <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
              Modify metrics to test live Firestore synchronization
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              opacity: 0.8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '420px' }}>
          
          {/* Select Hospital */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Choose Hospital</label>
            <select
              value={selectedHospId}
              onChange={(e) => setSelectedHospId(e.target.value)}
              className="form-select"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <hr style={{ margin: 0, borderColor: '#f1f5f9' }} />

          {/* ICU Bed Editor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>ICU Beds Available</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Live counts synchronized to patient search</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIcuBeds(Math.max(0, icuBeds - 1))}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontSize: '1rem', fontWeight: 800, width: '20px', textAlign: 'center' }}>{icuBeds}</span>
              <button
                type="button"
                onClick={() => setIcuBeds(icuBeds + 1)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Doctors On Duty Editor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>Doctors On Duty</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>On-call clinical staff directory count</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDoctors(Math.max(0, doctors - 1))}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontSize: '1rem', fontWeight: 800, width: '20px', textAlign: 'center' }}>{doctors}</span>
              <button
                type="button"
                onClick={() => setDoctors(doctors + 1)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveHospitalData}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
          >
            <Save size={16} /> Save Changes
          </button>

          <hr style={{ margin: 0, borderColor: '#f1f5f9' }} />

          {/* Ambulance Status Toggle */}
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>Ambulance Fleets (Live Map Dispatch)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ambulances.map(amb => (
                <div
                  key={amb.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={16} style={{ color: amb.status === 'available' ? '#0d9488' : '#ef4444' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{amb.id}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{amb.hospital}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAmbulance(amb.id, amb.status)}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: amb.status === 'available' ? '#ecfdf5' : '#fef2f2',
                      color: amb.status === 'available' ? '#0d9488' : '#ef4444'
                    }}
                  >
                    {amb.status.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
