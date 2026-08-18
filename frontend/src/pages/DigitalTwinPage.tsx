import React, { useState } from 'react';
import { Cpu, Play, AlertOctagon, TrendingUp, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { SimulationResult } from '../types';
import { api } from '../api/client';

export const DigitalTwinPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState<string>('SURGE_PERCENT');
  const [surgePct, setSurgePct] = useState<number>(50); // +50% surge
  const [icuMultiplier, setIcuMultiplier] = useState<number>(1.4);
  const [o2Multiplier, setO2Multiplier] = useState<number>(1.5);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await api.runSimulation({
        scenario_type: scenarioType,
        patient_influx_surge_pct: surgePct,
        icu_demand_multiplier: icuMultiplier,
        oxygen_consumption_multiplier: o2Multiplier,
        duration_days: durationDays
      });
      setSimulationResult(res);
    } catch (err: any) {
      alert('Simulation failed: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyPreset = (type: string, surge: number, icu: number, o2: number) => {
    setScenarioType(type);
    setSurgePct(surge);
    setIcuMultiplier(icu);
    setO2Multiplier(o2);
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)',
          padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem',
          fontWeight: 700, marginBottom: '10px'
        }}>
          <Cpu size={14} style={{ color: '#a5b4fc' }} />
          Hospital Digital Twin & Epidemic Surge Engine
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '8px' }}>
          Simulate "What-If" Stress Scenarios & Forecast Resource Stockouts
        </h1>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, maxWidth: '800px' }}>
          Run real-time predictive stress tests on hospital capacity across Tamil Nadu and Karnataka. Model epidemic waves, monsoon dengue outbreaks, and mass casualty crises before they overwhelm the clinical infrastructure.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Left: Scenario Configurator */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Surge Parameter Controls
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
            Select a crisis preset or calibrate custom patient influx multipliers:
          </p>

          {/* Crisis Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '18px' }}>
            <button
              onClick={() => handleApplyPreset('EPIDEMIC_WAVE', 25, 1.2, 1.3)}
              className={`btn btn-sm ${surgePct === 25 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              +25% Monsoon Spike
            </button>
            <button
              onClick={() => handleApplyPreset('EPIDEMIC_WAVE', 50, 1.4, 1.5)}
              className={`btn btn-sm ${surgePct === 50 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              +50% Epidemic Wave
            </button>
            <button
              onClick={() => handleApplyPreset('MASS_CASUALTY', 80, 2.0, 1.8)}
              className={`btn btn-sm ${surgePct === 80 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              Mass Casualty Crash
            </button>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>Patient Influx Surge:</span>
              <strong style={{ color: '#4f46e5' }}>+{surgePct}%</strong>
            </div>
            <input
              type="range" min="10" max="150" value={surgePct}
              onChange={(e) => setSurgePct(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>ICU Demand Multiplier:</span>
              <strong style={{ color: '#e11d48' }}>{icuMultiplier}x</strong>
            </div>
            <input
              type="range" min="1.0" max="3.0" step="0.1" value={icuMultiplier}
              onChange={(e) => setIcuMultiplier(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>Oxygen Consumption Multiplier:</span>
              <strong style={{ color: '#0d9488' }}>{o2Multiplier}x</strong>
            </div>
            <input
              type="range" min="1.0" max="3.0" step="0.1" value={o2Multiplier}
              onChange={(e) => setO2Multiplier(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Simulation Forecast Horizon (Days)</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value))}
              className="form-select"
            >
              <option value="5">5-Day Emergency Window</option>
              <option value="7">7-Day Planning Horizon</option>
              <option value="14">14-Day Strategic Scenario</option>
            </select>
          </div>

          <button
            onClick={handleRunSimulation}
            className="btn btn-predict"
            disabled={isSimulating}
            style={{ width: '100%', marginTop: '8px' }}
          >
            <Play size={16} /> {isSimulating ? 'Running Digital Twin Model...' : 'Execute Digital Twin Simulation'}
          </button>
        </div>

        {/* Right: Simulation Outcomes & Actionable Mitigations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {simulationResult ? (
            <>
              {/* Outcome KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: 700 }}>ICU Deficit Trigger</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e11d48' }}>
                    {simulationResult.projected_icu_deficit_hours}h
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#be123c' }}>Hours to 100% ICU Full</div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700 }}>Oxygen Stockout</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706' }}>
                    {simulationResult.projected_oxygen_stockout_days}d
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#b45309' }}>Days until Cryo Tanks empty</div>
                </div>

                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#5b21b6', fontWeight: 700 }}>Total Surge Influx</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#6d28d9' }}>
                    {simulationResult.projected_total_admissions}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6d28d9' }}>Patients in {durationDays} Days</div>
                </div>
              </div>

              {/* Day-by-Day Timeline Table */}
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  Day-by-Day Resource Depletion Forecast
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px' }}>Timeline</th>
                        <th style={{ padding: '8px' }}>Admissions</th>
                        <th style={{ padding: '8px' }}>Remaining ICU</th>
                        <th style={{ padding: '8px' }}>Oxygen Left</th>
                        <th style={{ padding: '8px' }}>ICU Load %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.timeline_forecast.map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{t.day}</td>
                          <td style={{ padding: '8px' }}>{t.projected_admissions}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: t.remaining_icu_beds === 0 ? '#e11d48' : '#059669' }}>
                            {t.remaining_icu_beds} beds
                          </td>
                          <td style={{ padding: '8px' }}>{t.remaining_oxygen_kl} kL</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              fontWeight: 700,
                              color: t.icu_utilization_pct >= 95 ? '#e11d48' : t.icu_utilization_pct >= 75 ? '#d97706' : '#059669'
                            }}>
                              {t.icu_utilization_pct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '10px' }}>
                  <CheckCircle2 size={18} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                    Automated Disaster Mitigation Directives
                  </h3>
                </div>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px', fontSize: '0.82rem', color: '#065f46' }}>
                  {simulationResult.mitigation_recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Click <strong>Execute Digital Twin Simulation</strong> to model projected hospital resource exhaustion curves.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
