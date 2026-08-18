import React, { useState, useEffect } from 'react';
import {
  Landmark, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw,
  TrendingDown, CheckCircle, Activity, MapPin, Building, Share2
} from 'lucide-react';
import { GovtCommandOverview, DistrictAlert, DistrictOverviewItem } from '../types';
import { api } from '../api/client';

export const GovtCommandCenter: React.FC = () => {
  const [overview, setOverview] = useState<GovtCommandOverview | null>(null);
  const [alerts, setAlerts] = useState<DistrictAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOverviewItem | null>(null);

  // Reallocation modal state
  const [isReallocating, setIsReallocating] = useState<boolean>(false);
  const [fromDistrictId, setFromDistrictId] = useState<number>(1); // Chennai
  const [toDistrictId, setToDistrictId] = useState<number>(7); // Kanchipuram
  const [resourceType, setResourceType] = useState<string>('D-Type Oxygen Cylinders (47L)');
  const [quantity, setQuantity] = useState<number>(50);
  const [reallocationSuccess, setReallocationSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadGovtData();
  }, []);

  const loadGovtData = async () => {
    setIsLoading(true);
    try {
      const [ov, al] = await Promise.all([
        api.getAdminOverview(),
        api.getDistrictAlerts()
      ]);
      setOverview(ov);
      setAlerts(al);
      if (ov.districts.length > 0 && !selectedDistrict) {
        setSelectedDistrict(ov.districts[0]);
      }
    } catch (err) {
      console.error('Failed to load Govt overview', err);
    } finally {
      setIsLoading(false);
    }
  };

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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadGovtData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Feeds
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

      {/* Main Grid: Left = District Heatmap Grid, Right = Alerts & Reallocation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* District Surveillance Heatmap Matrix */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            District Heatmap Surveillance Matrix
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
            Flagged automatically when district ICU capacity drops below <strong>10%</strong> or oxygen falls below 3 days buffer.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview?.districts.map((dist) => {
              const isCrit = dist.alert_status === 'CRITICAL';
              const isWarn = dist.alert_status === 'WARNING';
              const isSelected = selectedDistrict?.district_id === dist.district_id;

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                        {dist.district_name} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>({dist.state})</span>
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Population: {(dist.population / 100000).toFixed(1)} Lakhs • {dist.total_hospitals} Hospitals
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px',
                      background: isCrit ? '#e11d48' : isWarn ? '#d97706' : '#059669',
                      color: '#ffffff'
                    }}>
                      {dist.alert_status}
                    </span>
                  </div>

                  {/* District Resource Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>ICU Available</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.available_icu > 0 ? '#059669' : '#e11d48' }}>
                        {dist.available_icu} / {dist.total_icu}
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Occupancy %</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.occupancy_pct > 85 ? '#e11d48' : '#0f172a' }}>
                        {dist.occupancy_pct}%
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Avg Oxygen</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: dist.avg_oxygen_days <= 3 ? '#e11d48' : '#0d9488' }}>
                        {dist.avg_oxygen_days} Days
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
