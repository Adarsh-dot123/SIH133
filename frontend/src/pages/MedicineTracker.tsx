import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Truck, ShieldAlert, BarChart3, Activity, 
  MapPin, Clock, RefreshCw, Layers, CheckCircle2, TrendingDown 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MedicineStock {
  id: string;
  name: string;
  category: string;
  stockLevel: number; // Percentage 0 - 100
  burnRate: number; // Units per hour
  minThreshold: number; // Min safety threshold e.g. 25
  facility: string;
}

export const MedicineTracker: React.FC = () => {
  const { t } = useLanguage();
  
  // Initial public health medicine supply chain data
  const [medicines, setMedicines] = useState<MedicineStock[]>([
    { id: '1', name: 'Snake Antivenom', category: 'Lifesaving Venom Immunoglobulin', stockLevel: 45, burnRate: 1.8, minThreshold: 30, facility: 'Kanchipuram PHC' },
    { id: '2', name: 'Anti-Rabies Vaccine', category: 'Viral Prophylaxis', stockLevel: 18, burnRate: 2.2, minThreshold: 25, facility: 'Walajabad Sub-Centre' },
    { id: '3', name: 'Oxytocin Injection', category: 'Maternal Care / Hemorrhage prevention', stockLevel: 60, burnRate: 3.5, minThreshold: 20, facility: 'Uthiramerur Taluk Hospital' },
    { id: '4', name: 'Insulin (Human Mix)', category: 'Chronic Care / Endocrinology', stockLevel: 22, burnRate: 1.5, minThreshold: 25, facility: 'Kanchipuram PHC' },
    { id: '5', name: 'IV Fluids (Normal Saline)', category: 'Critical Care / Rehydration', stockLevel: 80, burnRate: 6.0, minThreshold: 35, facility: 'Walajabad Sub-Centre' },
    { id: '6', name: 'Metformin 500mg', category: 'Essential Oral Anti-diabetic', stockLevel: 14, burnRate: 4.2, minThreshold: 20, facility: 'Sriperumbudur PHC' },
    { id: '7', name: 'Paracetamol 650mg', category: 'Basic Analgesic & Antipyretic', stockLevel: 90, burnRate: 12.0, minThreshold: 30, facility: 'Sriperumbudur PHC' }
  ]);

  // Active DHO SOS alerts and emergency dispatch tracking
  const [activeSOS, setActiveSOS] = useState<Record<string, {
    timeLeft: number; // in seconds
    maxTime: number;
    vehicle: string;
    origin: string;
  }>>({});

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const simulationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Simulation loop: Decrement stocks dynamically & trigger DHO alerts
  useEffect(() => {
    if (isSimulating) {
      simulationInterval.current = setInterval(() => {
        setMedicines((prevMeds) => {
          return prevMeds.map((med) => {
            // Calculate new stock level based on burn rate
            const newStock = Math.max(0, med.stockLevel - (med.burnRate * 0.1));
            
            // Check if stock has crossed safety threshold and doesn't already have an active dispatch van
            if (newStock <= med.minThreshold && !activeSOS[med.id]) {
              // Trigger emergency resupply van
              setActiveSOS((prevSOS) => ({
                ...prevSOS,
                [med.id]: {
                  timeLeft: 60, // 60 seconds delivery time for demonstration
                  maxTime: 60,
                  vehicle: `TN-19-EM-4${Math.floor(100 + Math.random() * 900)}`,
                  origin: 'District Central Medical Warehouse'
                }
              }));
            }
            return {
              ...med,
              stockLevel: Math.round(newStock * 10) / 10
            };
          });
        });
      }, 1000);
    } else {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    }

    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [isSimulating, activeSOS]);

  // 2. Countdown loop: Tick emergency dispatch timers & restore stock on arrival
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSOS((prevSOS) => {
        const nextSOS = { ...prevSOS };
        let updated = false;

        for (const [medId, sos] of Object.entries(nextSOS)) {
          if (sos.timeLeft > 1) {
            nextSOS[medId] = {
              ...sos,
              timeLeft: sos.timeLeft - 1
            };
            updated = true;
          } else {
            // Van arrived! Restock the drug to 95%
            setMedicines((prevMeds) =>
              prevMeds.map((med) =>
                med.id === medId ? { ...med, stockLevel: 95 } : med
              )
            );
            delete nextSOS[medId];
            updated = true;
          }
        }
        return updated ? nextSOS : prevSOS;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format stopwatch string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate stats
  const totalPHCs = 24;
  const criticalStockoutsCount = medicines.filter(m => m.stockLevel <= m.minThreshold).length;
  const activeDispatchesCount = Object.keys(activeSOS).length;

  const handleManualRestock = (id: string) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, stockLevel: 95 } : m));
    setActiveSOS(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top District Command Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #0f172a' }}>
          <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', color: '#0f172a' }}>
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Monitored Facilities (PHCs)</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalPHCs}</h2>
          </div>
        </div>

        <div className="card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          borderLeft: '4px solid #ef4444',
          animation: criticalStockoutsCount > 0 ? 'pulse-border 2s infinite' : 'none'
        }}>
          <div style={{ 
            padding: '12px', 
            background: criticalStockoutsCount > 0 ? '#fef2f2' : '#f1f5f9', 
            borderRadius: '10px', 
            color: criticalStockoutsCount > 0 ? '#ef4444' : '#64748b' 
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Critical Stockout Alerts</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
              {criticalStockoutsCount}
            </h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#0d9488' }}>
            <Truck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>In-Transit Resupplies</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0d9488', margin: 0 }}>{activeDispatchesCount}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid: Medicine Database & Emergency Resupply Tracking */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
      }} className="main-supply-grid">
        
        {/* Left: Essential Medicine Database */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                District Public Health Drug Inventory
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Monitored supply meters and real-time consumption velocities.
              </p>
            </div>
            
            {/* Simulation controls */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`btn btn-${isSimulating ? 'secondary' : 'primary'} btn-sm`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isSimulating ? 'spin' : ''} />
              <span>{isSimulating ? 'Pause Active Pickup Simulation' : 'Resume Auto Pickups'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {medicines.map((med) => {
              const isCritical = med.stockLevel <= med.minThreshold;
              return (
                <div key={med.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isCritical ? '#fdf2f2' : '#f8fafc',
                  border: `1px solid ${isCritical ? '#fca5a5' : '#e2e8f0'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Row Top Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {med.name}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {med.category} • <strong style={{ color: '#475569' }}>{med.facility}</strong>
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: isCritical ? '#dc2626' : '#0d9488',
                        background: isCritical ? '#fee2e2' : '#f0fdf4',
                        padding: '2px 8px',
                        borderRadius: '9999px'
                      }}>
                        {med.stockLevel}% Stock Remaining
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingDown size={11} /> Burn rate: {med.burnRate}% / min
                      </span>
                    </div>
                  </div>

                  {/* Stock Meter Progress Bar */}
                  <div style={{ 
                    height: '8px', 
                    width: '100%', 
                    background: '#e2e8f0', 
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${med.stockLevel}%`,
                      height: '100%',
                      background: isCritical ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : 'linear-gradient(90deg, #0d9488, #14b8a6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* DHO SOS Alerts banner inside the card if critical */}
                  {isCritical && (
                    <div style={{ 
                      marginTop: '4px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#fff',
                      border: '1px dashed #fca5a5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#b91c1c',
                      fontSize: '0.76rem',
                      fontWeight: 700
                    }}>
                      <ShieldAlert size={14} className="flash-icon" />
                      <span>CRITICAL SOS: DHO notified dynamically!</span>
                      <button 
                        onClick={() => handleManualRestock(med.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 8px' }}
                      >
                        Emergency Warehouse Restock
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Emergency Resupply Stopwatch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', borderTop: '4px solid #ef4444' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#ef4444' }} />
              DHO Escalation Monitor
            </h3>

            {activeDispatchesCount === 0 ? (
              <div style={{ 
                padding: '24px 16px', 
                textAlign: 'center', 
                background: '#f8fafc', 
                borderRadius: '10px', 
                border: '1px dashed #cbd5e1'
              }}>
                <CheckCircle2 size={36} style={{ color: '#0d9488', margin: '0 auto 10px auto' }} />
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>
                  All PHC Stock Levels Secure
                </h4>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  No active emergency DHO logistics triggered.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(activeSOS).map(([medId, sos]) => {
                  const medicine = medicines.find(m => m.id === medId);
                  const progressPct = ((sos.maxTime - sos.timeLeft) / sos.maxTime) * 100;
                  
                  return (
                    <div key={medId} style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: '#fff5f5',
                      border: '1px solid #fee2e2',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b' }}>
                          {medicine?.name} Resupply
                        </span>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontFamily: 'monospace', 
                          fontWeight: 700,
                          color: '#dc2626',
                          background: '#fee2e2',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {formatTime(sos.timeLeft)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#7f1d1d', lineHeight: 1.3 }}>
                        🚨 <strong>Stockout Imminent:</strong> {sos.timeLeft}s remaining | 
                        Warehouse Dispatch Van (<strong>{sos.vehicle}</strong>) en route from {sos.origin}.
                      </div>

                      {/* Dispatch progress bar */}
                      <div style={{ 
                        height: '6px', 
                        background: '#fee2e2', 
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: '#ef4444',
                          transition: 'width 1s linear'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* District Warehouse Mapping Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} style={{ color: '#0f172a' }} />
              Logistics Centers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #0f172a' }}>
                <strong>District Medical Store (Central)</strong>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  Kanchipuram HQ Store • 42 vehicles available
                </div>
              </div>
              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #64748b' }}>
                <strong>Sub-Warehouse North</strong>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  Sriperumbudur Sector • 12 vehicles available
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
