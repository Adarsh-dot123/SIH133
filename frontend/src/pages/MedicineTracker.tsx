import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertCircle, Clock, MapPin, 
  CheckCircle, Truck, Package, Layers, Info, Filter 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeCollection, updateFirestoreDoc } from '../firebase';

interface MedicineStock {
  id: string;
  med_id: string;
  hospital_id: number;
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
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');

  // 1. Subscribe to Firestore medicines collection
  useEffect(() => {
    const unsubscribe = subscribeCollection('medicines', (fireMeds) => {
      if (fireMeds && fireMeds.length > 0) {
        // Sort by compound ID to maintain order
        const sorted = [...fireMeds].sort((a, b) => a.id.localeCompare(b.id));
        setMedicines(sorted);
      } else {
        // Seeding default composite medicines mapped to fake hospitals
        const initialMeds = [
          { id: '1_1', med_id: '1', hospital_id: 1, name: 'Snake Antivenom', category: 'Lifesaving Venom Immunoglobulin', stockLevel: 45, burnRate: 1.8, minThreshold: 30, facility: 'Apol Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '2_2', med_id: '2', hospital_id: 2, name: 'Anti-Rabies Vaccine', category: 'Viral Prophylaxis', stockLevel: 18, burnRate: 2.2, minThreshold: 25, facility: 'Sunfeast Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '3_3', med_id: '3', hospital_id: 3, name: 'Oxytocin Injection', category: 'Maternal Care / Hemorrhage prevention', stockLevel: 60, burnRate: 3.5, minThreshold: 20, facility: 'Kamaraj Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '4_4', med_id: '4', hospital_id: 4, name: 'Insulin (Human Mix)', category: 'Chronic Care / Endocrinology', stockLevel: 22, burnRate: 1.5, minThreshold: 25, facility: 'Nehru Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '5_5', med_id: '5', hospital_id: 5, name: 'IV Fluids (Normal Saline)', category: 'Critical Care / Rehydration', stockLevel: 80, burnRate: 6.0, minThreshold: 35, facility: 'Gandhi Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '6_6', med_id: '6', hospital_id: 6, name: 'Metformin 500mg', category: 'Essential Oral Anti-diabetic', stockLevel: 14, burnRate: 4.2, minThreshold: 20, facility: 'Ambedkar Hospitals', isRestocking: false, restockEta: 0, vehicle: '' },
          { id: '7_7', med_id: '7', hospital_id: 7, name: 'Paracetamol 650mg', category: 'Basic Analgesic & Antipyretic', stockLevel: 90, burnRate: 12.0, minThreshold: 30, facility: 'MGR Hospitals', isRestocking: false, restockEta: 0, vehicle: '' }
        ];
        initialMeds.forEach(m => {
          updateFirestoreDoc('medicines', m.id, m);
        });
      }
    });

    return () => unsubscribe();
  }, []);


  // Extract unique facilities for filter selector
  const facilitiesList = ['ALL', ...Array.from(new Set(medicines.map(m => m.facility)))];

  // Filtered list
  const filteredMeds = selectedFacility === 'ALL' 
    ? medicines 
    : medicines.filter(m => m.facility === selectedFacility);

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

      {/* Facility Filter Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '12px',
        background: '#f8fafc',
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#334155', fontWeight: 700 }}>
          <Filter size={16} style={{ color: '#0d9488' }} />
          <span>Filter Availability by Health Facility:</span>
        </div>

        <select
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '0.82rem',
            color: '#0f172a',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {facilitiesList.map((fac) => (
            <option key={fac} value={fac}>
              {fac === 'ALL' ? 'Show All Facilities' : fac}
            </option>
          ))}
        </select>
      </div>

      {/* Main Stock Grid */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#0d9488' }} />
          Current Facility Inventory & Restock Timers
        </h2>

        {filteredMeds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <AlertCircle size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700 }}>No medicine data available for this selection.</h4>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {filteredMeds.map((med) => {
              const isEmpty = med.stockLevel <= 0;
              const isLow = med.stockLevel > 0 && med.stockLevel <= med.minThreshold;
              const isCritical = isEmpty || isLow;
              const barColor = isEmpty ? '#dc2626' : isLow ? '#ef4444' : '#0d9488';
              const badgeColor = isCritical ? '#dc2626' : '#0d9488';
              const badgeBg = isCritical ? '#fee2e2' : '#ccfbf1';
              
              return (
                <div key={med.id} className="card" style={{
                  padding: '24px',
                  borderRadius: '18px',
                  border: `1px solid ${isCritical ? '#fee2e2' : '#f1f5f9'}`,
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
                        color: badgeColor,
                        background: badgeBg,
                        padding: '3px 10px',
                        borderRadius: '9999px'
                      }}>
                        {isEmpty ? '⚠ OUT OF STOCK' : `${med.stockLevel}% Stock`}
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
                        width: `${Math.max(med.stockLevel, isEmpty ? 100 : 0)}%`,
                        height: '100%',
                        background: barColor,
                        transition: 'width 0.3s ease',
                        ...(isEmpty ? { width: '100%', opacity: 0.3 } : {})
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
                    ) : isEmpty ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        color: '#dc2626', 
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}>
                        <AlertCircle size={14} />
                        <span>⚠ CRITICAL — Stock Depleted. Awaiting Emergency Resupply.</span>
                      </div>
                    ) : isLow ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        color: '#d97706', 
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}>
                        <AlertCircle size={14} />
                        <span>⚠ Low Stock — Below safety margin ({med.minThreshold}%)</span>
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
        )}
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
