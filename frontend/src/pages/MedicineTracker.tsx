import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertCircle, Clock, MapPin, 
  CheckCircle, Truck, Package, Layers, Info 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeCollection, updateFirestoreDoc } from '../firebase';

interface MedicineStock {
  id: string;
  name: string;
  category: string;
  stockLevel: number;
  burnRate: number;
  minThreshold: number;
  facility: string;
  isRestocking?: boolean;
  restockEta?: number;
  vehicle?: string;
}

export const MedicineTracker: React.FC = () => {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);

  // 1. Subscribe to Firestore medicines collection
  useEffect(() => {
    const unsubscribe = subscribeCollection('medicines', (fireMeds) => {
      if (fireMeds && fireMeds.length > 0) {
        // Sort by numeric ID to maintain order
        const sorted = [...fireMeds].sort((a, b) => Number(a.id) - Number(b.id));
        setMedicines(sorted);
      } else {
        // Initial fallback seeding of the 7 essential drugs
        const initialMeds = [
          { id: '1', name: 'Snake Antivenom', category: 'Lifesaving Venom Immunoglobulin', stockLevel: 45, burnRate: 1.8, minThreshold: 30, facility: 'Apol Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '2', name: 'Anti-Rabies Vaccine', category: 'Viral Prophylaxis', stockLevel: 18, burnRate: 2.2, minThreshold: 25, facility: 'Sunfeast Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '3', name: 'Oxytocin Injection', category: 'Maternal Care / Hemorrhage prevention', stockLevel: 60, burnRate: 3.5, minThreshold: 20, facility: 'Kamaraj Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '4', name: 'Insulin (Human Mix)', category: 'Chronic Care / Endocrinology', stockLevel: 22, burnRate: 1.5, minThreshold: 25, facility: 'Nehru Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '5', name: 'IV Fluids (Normal Saline)', category: 'Critical Care / Rehydration', stockLevel: 80, burnRate: 6.0, minThreshold: 35, facility: 'Gandhi Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '6', name: 'Metformin 500mg', category: 'Essential Oral Anti-diabetic', stockLevel: 14, burnRate: 4.2, minThreshold: 20, facility: 'Ambedkar Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '7', name: 'Paracetamol 650mg', category: 'Basic Analgesic & Antipyretic', stockLevel: 90, burnRate: 12.0, minThreshold: 30, facility: 'MGR Hospitals', isRestocking: false, restockEta: 0, vehicle: '' }
        ];
        initialMeds.forEach(m => {
          updateFirestoreDoc('medicines', m.id, m);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Local active clock for simulating burn rates and restocking countdowns remotely
  useEffect(() => {
    const timer = setInterval(() => {
      medicines.forEach((med) => {
        // If restocking, decrement countdown
        if (med.isRestocking && med.restockEta && med.restockEta > 0) {
          const nextEta = med.restockEta - 1;
          if (nextEta === 0) {
            // Arrived! Reset stock level to 95%
            updateFirestoreDoc('medicines', med.id, {
              stockLevel: 95,
              isRestocking: false,
              restockEta: 0,
              vehicle: ''
            });
          } else {
            updateFirestoreDoc('medicines', med.id, { restockEta: nextEta });
          }
        } else if (!med.isRestocking) {
          // Slowly decrement stock Level based on burn rate
          const nextStock = Math.max(0, med.stockLevel - (med.burnRate * 0.05));
          const rounded = Math.round(nextStock * 10) / 10;
          
          if (rounded !== med.stockLevel) {
            updateFirestoreDoc('medicines', med.id, { stockLevel: rounded });
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [medicines]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} mins`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      
      {/* Patient Hero Header */}
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 24px', 
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', 
        borderRadius: '24px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.15)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>
          <Package size={14} />
          <span>{t('public_drug_inventory', 'Government Essential Drug Supply Monitor')}</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.025em' }}>
          {t('sih_ps_title', 'District Public Health Medicine Availability')}
        </h1>
        <p style={{ fontSize: '0.98rem', color: '#ccfbf1', maxWidth: '720px', margin: '0 auto', lineHeight: 1.6, fontWeight: 400 }}>
          {t('sih_ps_desc', 'Live stock status, burn rates, and estimated logistics times for replenishing essential medicines across local Sub-Centres and Primary Health Centres (PHCs).')}
        </p>
      </div>

      {/* Main Stock List */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#0d9488' }} />
          Current Facility Inventory & Restock Timers
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px'
        }}>
          {medicines.map((med) => {
            const isLow = med.stockLevel <= med.minThreshold;
            
            return (
              <div key={med.id} className="card" style={{
                padding: '24px',
                borderRadius: '18px',
                border: `1px solid ${isLow ? '#fee2e2' : '#f1f5f9'}`,
                background: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}>
                {/* Header Information */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {med.name}
                    </h3>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isLow ? '#dc2626' : '#0d9488',
                      background: isLow ? '#fee2e2' : '#ccfbf1',
                      padding: '3px 10px',
                      borderRadius: '9999px'
                    }}>
                      {med.stockLevel}% Stock
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
                    {med.category}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                    <MapPin size={13} style={{ color: '#0d9488' }} />
                    <span>Stored at: <strong>{med.facility}</strong></span>
                  </div>
                </div>

                {/* Progress stock meter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${med.stockLevel}%`,
                      height: '100%',
                      background: isLow ? '#ef4444' : '#0d9488',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span>0%</span>
                    <span>Safety Margin: {med.minThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Patient-Centric Logistics Status Footer */}
                <div style={{ 
                  paddingTop: '12px', 
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {med.isRestocking && med.restockEta && med.restockEta > 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: '#b91c1c', 
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      width: '100%'
                    }}>
                      <Truck size={14} className="spin" />
                      <span>Delivery en route ({med.vehicle})</span>
                      <span style={{ 
                        marginLeft: 'auto', 
                        fontSize: '0.78rem', 
                        fontFamily: 'monospace', 
                        color: '#dc2626', 
                        background: '#fee2e2', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        {formatCountdown(med.restockEta)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      color: '#059669', 
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}>
                      <CheckCircle size={14} />
                      <span>{t('status_secured', 'Stock Level Secure / Fully Supplied')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Callout Section */}
      <div className="card" style={{ 
        padding: '20px', 
        background: '#f0fdfa', 
        border: '1px solid #ccfbf1', 
        borderRadius: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}>
        <Info size={20} style={{ color: '#0d9488', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f766e', margin: '0 0 4px 0' }}>
            About the Public Health Drug Supply Monitor
          </h4>
          <p style={{ fontSize: '0.78rem', color: '#115e59', margin: 0, lineHeight: 1.5 }}>
            This portal enables rural communities and healthcare administrators to monitor vital drug availability in real time. When stock levels drop below safety margins, the system automatically triggers a logistics request to the District Central Warehouse, prompting immediate courier dispatch.
          </p>
        </div>
      </div>

    </div>
  );
};
