import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw,
  TrendingDown, CheckCircle, Activity, MapPin, Building, Share2,
  Wifi, WifiOff, Clock, Package, Truck
} from 'lucide-react';
import { GovtCommandOverview, DistrictAlert, DistrictOverviewItem } from '../types';
import { api, createWebSocketSubscriber } from '../api/client';
import { subscribeCollection, updateFirestoreDoc } from '../firebase';

export const GovtCommandCenter: React.FC = () => {
  const [overview, setOverview] = useState<GovtCommandOverview | null>(null);
  const [alerts, setAlerts] = useState<DistrictAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOverviewItem | null>(null);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Medicine supply states
  const [medicines, setMedicines] = useState<any[]>([]);

  // Subscribe to medicines Firestore updates
  useEffect(() => {
    const unsubscribe = subscribeCollection('medicines', (fireMeds) => {
      if (fireMeds && fireMeds.length > 0) {
        const sorted = [...fireMeds].sort((a, b) => Number(a.id) - Number(b.id));
        setMedicines(sorted);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle local resupply eta tick
  useEffect(() => {
    const timer = setInterval(() => {
      medicines.forEach((med) => {
        if (med.isRestocking && med.restockEta && med.restockEta > 0) {
          const nextEta = med.restockEta - 1;
          if (nextEta === 0) {
            updateFirestoreDoc('medicines', med.id, {
              stockLevel: 95,
              isRestocking: false,
              restockEta: 0,
              vehicle: ''
            });
          } else {
            updateFirestoreDoc('medicines', med.id, { restockEta: nextEta });
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [medicines]);

  // Reallocation modal state
  const [isReallocating, setIsReallocating] = useState<boolean>(false);
  const [fromDistrictId, setFromDistrictId] = useState<number>(1); // Chennai
  const [toDistrictId, setToDistrictId] = useState<number>(7); // Kanchipuram
  const [resourceType, setResourceType] = useState<string>('D-Type Oxygen Cylinders (47L)');
  const [quantity, setQuantity] = useState<number>(50);
  const [reallocationSuccess, setReallocationSuccess] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [justRefreshed, setJustRefreshed] = useState<boolean>(false);

  const loadGovtData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setIsRefreshing(true);
    }
    try {
      const [ov, al] = await Promise.all([
        api.getAdminOverview(),
        api.getDistrictAlerts()
      ]);
      setOverview(ov);
      setAlerts(al);
      setLastUpdated(new Date());
      if (!silent) {
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 2000);
      }
      if (ov.districts.length > 0) {
        setSelectedDistrict((prev) => {
          if (!prev) return ov.districts[0];
          const updated = ov.districts.find(d => d.district_id === prev.district_id);
          return updated || ov.districts[0];
        });
      }
    } catch (err) {
      console.error('Failed to load Govt overview', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Real-time WebSocket sync & periodic polling across ALL events
  useEffect(() => {
    loadGovtData();

    // 1. WebSocket real-time subscription for immediate updates from ANY portal
    const unsubscribe = createWebSocketSubscriber((event) => {
      // Refresh on ANY live state change event from any portal
      loadGovtData(true);
    });

    // 2. 5-second dynamic polling
    if (isLiveSync) {
      pollingRef.current = setInterval(() => {
        loadGovtData(true);
      }, 5000);
    }

    return () => {
      unsubscribe();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLiveSync]);

  const handleTriggerReallocation = async () => {
    try {
      const res = await api.reallocateResources({
        from_district_id: fromDistrictId,
        to_district_id: toDistrictId,
        resource_type: resourceType,
        quantity: quantity,
        notes: 'Emergency shortage threshold mitigation authorized by State Command Center'
      });
      setReallocationSuccess(res.message);
      loadGovtData();
      setTimeout(() => {
        setIsReallocating(false);
        setReallocationSuccess(null);
      }, 2500);
    } catch (err: any) {
      alert('Reallocation authorization failed: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={26} style={{ color: '#0d9488' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              State Health Operations Command Center
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Unified real-time surveillance & automated shortage detection across all Tamil Nadu & Karnataka healthcare districts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => setIsLiveSync(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: isLiveSync ? '#f0fdf4' : '#fef2f2',
              color: isLiveSync ? '#16a34a' : '#dc2626',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {isLiveSync ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isLiveSync ? 'Live Sync Active (5s)' : 'Live Sync Paused'}
          </button>
          <button
            onClick={() => loadGovtData(false)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: justRefreshed ? '#ecfdf5' : '#ffffff',
              borderColor: justRefreshed ? '#10b981' : '#cbd5e1',
              color: justRefreshed ? '#059669' : '#0f172a',
              transition: 'all 0.2s ease'
            }}
            title="Force fetch latest feeds from all hospital wards and districts"
          >
            {justRefreshed ? (
              <>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <span>Feeds Updated!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isRefreshing ? 'Fetching...' : 'Refresh Feeds'}</span>
              </>
            )}
          </button>
          <button onClick={() => setIsReallocating(true)} className="btn btn-primary btn-sm">
            <Share2 size={14} /> Inter-District Reallocation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Statewide Hospitals Monitored</div>
            <div className="kpi-value">{overview.total_hospitals}</div>
            <div className="kpi-subtext">Across {overview.districts.length} Districts</div>
          </div>

          <div className="kpi-card danger">
            <div className="kpi-label">Available ICU Beds</div>
            <div className="kpi-value" style={{ color: overview.available_icu_beds > 0 ? '#059669' : '#e11d48' }}>
              {overview.available_icu_beds}
              <span style={{ fontSize: '1rem', color: '#94a3b8' }}> / {overview.total_icu_beds}</span>
            </div>
            <div className="kpi-subtext">Occupancy Rate: {overview.icu_occupancy_rate}%</div>
          </div>

          <div className="kpi-card warning">
            <div className="kpi-label">Avg Oxygen Buffer (Days)</div>
            <div className="kpi-value" style={{ color: overview.avg_state_oxygen_days <= 3.0 ? '#e11d48' : '#0d9488' }}>
              {overview.avg_state_oxygen_days} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Days</span>
            </div>
            <div className="kpi-subtext">Threshold Target: &gt; 3.0 Days</div>
          </div>

          <div className="kpi-card predict">
            <div className="kpi-label">Critical Shortage Districts</div>
            <div className="kpi-value" style={{ color: overview.critical_districts_count > 0 ? '#e11d48' : '#059669' }}>
              {overview.critical_districts_count}
            </div>
            <div className="kpi-subtext">
              {overview.critical_districts_count > 0 ? 'Shortage Threshold Exceeded' : 'All Districts Safe'}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Medicine Supply & Logistics Resupply (Problem Statement 26133) */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} style={{ color: '#0d9488' }} />
          Essential Medicines & DHO Resupply Logistics Center
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '20px' }}>
          Monitor real-time drug levels across rural health centres and dispatch emergency warehouse couriers to restore critical stocks.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {medicines.map((med) => {
            const isLow = med.stockLevel <= med.minThreshold;
            return (
              <div key={med.id} style={{
                padding: '16px',
                borderRadius: '12px',
                background: isLow ? '#fff1f2' : '#f8fafc',
                border: `1px solid ${isLow ? '#fecdd3' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {med.name}
                    </h4>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isLow ? '#dc2626' : '#0d9488',
                      background: isLow ? '#fee2e2' : '#ccfbf1',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}>
                      {med.stockLevel}%
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {med.category}
                  </span>
                  <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '6px' }}>
                    Facility: <strong>{med.facility}</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${med.stockLevel}%`,
                    height: '100%',
                    background: isLow ? '#ef4444' : '#0d9488',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Admin restock actions */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  {med.isRestocking ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700 }}>
                      <Truck size={14} className="spin" />
                      <span>Van {med.vehicle} en route ({med.restockEta}s left)</span>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        const vehicle = `TN-19-EM-4${Math.floor(100 + Math.random() * 900)}`;
                        await updateFirestoreDoc('medicines', med.id, {
                          isRestocking: true,
                          restockEta: 45,
                          vehicle: vehicle
                        });
                        try {
                          await api.dispatchMedicineResupply(med.hospital_id || 1, med.med_id || med.id);
                        } catch (err) {
                          console.error("Failed to log resupply dispatch on backend:", err);
                        }
                      }}
                      className={`btn btn-xs ${isLow ? 'btn-primary animate-pulse' : 'btn-secondary'}`}
                      style={{ width: '100%', fontSize: '0.72rem', padding: '4px' }}
                    >
                      Dispatch Emergency Resupply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left = District Heatmap Grid, Right = Alerts & Reallocation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* District Surveillance Heatmap Matrix */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              District Heatmap Surveillance Matrix
            </h2>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
              Auto-Calculated
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
            Dynamically flags <strong>CRITICAL</strong> on zero hospital coverage, ICU capacity ≤ 10%, critical hospital surge, or oxygen depletion.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview?.districts.map((dist) => {
              const isCrit = dist.alert_status === 'CRITICAL';
              const isWarn = dist.alert_status === 'WARNING';
              const isSelected = selectedDistrict?.district_id === dist.district_id;
              
              // Critical reason label
              let reasonLabel = '';
              if (dist.total_hospitals === 0 || dist.total_beds === 0) {
                reasonLabel = 'Coverage Desert (0 Hosp)';
              } else if (dist.critical_hospitals_count > 0) {
                reasonLabel = `${dist.critical_hospitals_count} Hosp Critical`;
              } else if (dist.total_icu > 0 && dist.available_icu === 0) {
                reasonLabel = '0 ICU Left';
              } else if (dist.occupancy_pct >= 90) {
                reasonLabel = 'Bed Saturated (>90%)';
              } else if (dist.avg_oxygen_days > 0 && dist.avg_oxygen_days <= 2.5) {
                reasonLabel = 'Oxygen Deficit';
              }

              return (
                <div
                  key={dist.district_id}
                  onClick={() => setSelectedDistrict(dist)}
                  style={{
                    background: isCrit ? '#fff1f2' : isWarn ? '#fffbeb' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#0d9488' : isCrit ? '#fecdd3' : isWarn ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: '12px', padding: '14px', cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px rgba(13, 148, 136, 0.2)' : undefined,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {dist.district_name} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>({dist.state})</span>
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Population: {(dist.population / 100000).toFixed(1)} Lakhs • {dist.total_hospitals} Hospitals • {dist.total_beds} Total Beds
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px',
                        background: isCrit ? '#e11d48' : isWarn ? '#d97706' : '#059669',
                        color: '#ffffff'
                      }}>
                        {dist.alert_status}
                      </span>
                      {reasonLabel && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isCrit ? '#be123c' : '#b45309', background: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: `1px solid ${isCrit ? '#fecdd3' : '#fde68a'}` }}>
                          {reasonLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* District Resource Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>ICU Available</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.total_icu === 0 ? '#94a3b8' : dist.available_icu > 0 ? '#059669' : '#e11d48' }}>
                        {dist.total_icu === 0 ? 'N/A (0 ICU)' : `${dist.available_icu} / ${dist.total_icu}`}
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Occupancy %</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.total_beds === 0 ? '#e11d48' : dist.occupancy_pct > 85 ? '#e11d48' : '#0f172a' }}>
                        {dist.total_beds === 0 ? '100% (No Beds)' : `${dist.occupancy_pct}%`}
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Avg Oxygen</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.avg_oxygen_days <= 3 ? '#e11d48' : '#0d9488' }}>
                        {dist.avg_oxygen_days > 0 ? `${dist.avg_oxygen_days} Days` : '0 Days'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Automated Alerts & Reallocation Command */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Shortage Alerts */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48' }}>
                <AlertTriangle size={20} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Critical Shortage Alerts
                </h2>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48' }}>
                {alerts.length} Active Incidents
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.map((al) => (
                <div
                  key={al.id}
                  style={{
                    background: al.severity === 'CRITICAL' ? '#fff1f2' : '#fffbeb',
                    border: `1px solid ${al.severity === 'CRITICAL' ? '#fecdd3' : '#fde68a'}`,
                    borderRadius: '12px', padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      {al.district_name}: {al.alert_type}
                    </strong>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      background: al.severity === 'CRITICAL' ? '#e11d48' : '#d97706', color: '#fff'
                    }}>
                      {al.severity}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                    {al.message}
                  </p>

                  {al.recommended_action && (
                    <div style={{
                      marginTop: '8px', fontSize: '0.75rem', color: '#065f46',
                      background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px'
                    }}>
                      <strong>Recommended Protocol:</strong> {al.recommended_action}
                    </div>
                  )}

                  <button
                    onClick={() => setIsReallocating(true)}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '10px', width: '100%' }}
                  >
                    <Share2 size={12} /> Authorize Inter-District Transfer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inter-District Resource Reallocation Modal */}
      {isReallocating && (
        <div className="modal-overlay" onClick={() => setIsReallocating(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Inter-District Emergency Resource Reallocation
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
              Execute state-authorized redistribution of oxygen tanks, mobile ventilators, or medical teams to avert hospital exhaustion.
            </p>

            {reallocationSuccess ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '12px', color: '#059669', fontWeight: 700, textAlign: 'center' }}>
                <CheckCircle size={28} style={{ margin: '0 auto 8px' }} />
                {reallocationSuccess}
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Source District (Surplus)</label>
                    <select
                      value={fromDistrictId}
                      onChange={(e) => setFromDistrictId(parseInt(e.target.value))}
                      className="form-select"
                    >
                      {overview?.districts.map(d => (
                        <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination (Deficit Target)</label>
                    <select
                      value={toDistrictId}
                      onChange={(e) => setToDistrictId(parseInt(e.target.value))}
                      className="form-select"
                    >
                      {overview?.districts.map(d => (
                        <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Resource Allocation Type</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="form-select"
                  >
                    <option value="D-Type Oxygen Cylinders (47L)">D-Type Oxygen Cylinders (47L)</option>
                    <option value="Liquid Oxygen Cryo-Tanker (10 kL)">Liquid Oxygen Cryo-Tanker (10 kL)</option>
                    <option value="Mobile ICU Ventilator Units">Mobile ICU Ventilator Units</option>
                    <option value="Critical Care Nursing Teams">Critical Care Nursing Teams</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity / Units to Transfer</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 10)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={() => setIsReallocating(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button onClick={handleTriggerReallocation} className="btn btn-primary" style={{ flex: 1 }}>
                    Authorize Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
