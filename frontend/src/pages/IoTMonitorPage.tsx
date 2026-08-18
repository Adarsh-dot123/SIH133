import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Activity, Cpu, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { IoTTelemetryItem } from '../types';
import { api } from '../api/client';

export const IoTMonitorPage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<IoTTelemetryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  useEffect(() => {
    fetchTelemetry();
    const timer = setInterval(() => {
      if (autoRefresh) fetchTelemetry();
    }, 4000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const fetchTelemetry = async () => {
    try {
      const data = await api.getIoTTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error('Failed to fetch IoT telemetry', err);
    } finally {
      setIsLoading(false);
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
            <Radio size={26} style={{ color: '#0d9488' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Real-Time IoT Sensor Telemetry Stream
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Live sensor data streaming directly from smart cryogenic oxygen bulk tanks, flow manifolds, and smart bed load cells.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#0d9488' }}
            />
            Auto-Stream (4s)
          </label>
          <button onClick={fetchTelemetry} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Poll Telemetry
          </button>
        </div>
      </div>

      {/* Sensor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {telemetry.map((sensor) => {
          const isCrit = sensor.status === 'CRITICAL';
          const isWarn = sensor.status === 'WARNING';

          return (
            <div
              key={sensor.sensor_id}
              className="card"
              style={{
                background: isCrit ? '#fff1f2' : isWarn ? '#fffbeb' : '#ffffff',
                borderColor: isCrit ? '#fecdd3' : isWarn ? '#fde68a' : '#e2e8f0',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {sensor.sensor_id}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {sensor.device_name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {sensor.hospital_name}
                  </div>
                </div>

                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '9999px',
                  background: isCrit ? '#e11d48' : isWarn ? '#d97706' : '#059669',
                  color: '#ffffff'
                }}>
                  {sensor.status}
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'baseline', gap: '6px',
                margin: '14px 0', padding: '10px', background: '#f8fafc',
                borderRadius: '8px', border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
                  {sensor.current_value}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>
                  {sensor.unit}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>Type: {sensor.sensor_type.replace(/_/g, ' ')}</span>
                <span>{new Date(sensor.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
