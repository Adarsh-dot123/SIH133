import React, { useState } from 'react';
import { Link2, Search, FileCode, CheckCircle, ShieldCheck, Download, Copy } from 'lucide-react';
import { api } from '../api/client';

export const ABDMAdapterPage: React.FC = () => {
  const [abhaId, setAbhaId] = useState<string>('91-4589-7788-9900');
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [fhirBundle, setFhirBundle] = useState<any | null>(null);
  const [stayId, setStayId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleFetchAbha = async () => {
    setIsLoading(true);
    try {
      const res = await api.verifyABHA(abhaId);
      setPatientRecord(res);
    } catch (err: any) {
      alert('ABHA lookup failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportFHIR = async () => {
    setIsLoading(true);
    try {
      const res = await api.exportFHIRBundle(stayId);
      setFhirBundle(res.fhir_bundle);
    } catch (err: any) {
      alert('FHIR export failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!fhirBundle) return;
    navigator.clipboard.writeText(JSON.stringify(fhirBundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #022c22 0%, #065f46 50%, #047857 100%)',
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
          <Link2 size={14} style={{ color: '#6ee7b7' }} />
          National Digital Health Mission (NDHM) & Ayushman Bharat Stack
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '8px' }}>
          ABDM Health ID (ABHA) & HL7 FHIR R4 Interoperability Adapter
        </h1>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, maxWidth: '800px' }}>
          MedFlow seamlessly interfaces with India's Ayushman Bharat Digital Mission, transforming patient stays and clinical bed telemetry into standardized HL7 FHIR R4 compliant health bundles.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Left: ABHA Lookup & Stay Exporter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ABHA Citizen Verification */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Ayushman Bharat Health Account (ABHA) Verification
            </h3>

            <div className="form-group">
              <label className="form-label">14-Digit ABHA ID / Address</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="e.g. 91-4589-7788-9900"
                  className="form-input"
                  style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700 }}
                />
                <button onClick={handleFetchAbha} className="btn btn-primary btn-sm" disabled={isLoading}>
                  <Search size={14} /> Verify ABHA
                </button>
              </div>
            </div>

            {patientRecord && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
                padding: '14px', marginTop: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 800, fontSize: '0.9rem' }}>
                  <CheckCircle size={16} />
                  ABHA Verified Active Citizen
                </div>
                <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '6px' }}>
                  <strong>Name:</strong> {patientRecord.full_name} ({patientRecord.gender})<br />
                  <strong>Date of Birth:</strong> {patientRecord.dob}<br />
                  <strong>Insurance Status:</strong> {patientRecord.linked_pmjay_status}<br />
                  <strong>Recent Conditions:</strong> {patientRecord.recent_conditions?.join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* FHIR R4 Bundle Exporter */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              HL7 FHIR R4 Document Bundle Exporter
            </h3>

            <div className="form-group">
              <label className="form-label">Select Inpatient Stay Record</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={stayId}
                  onChange={(e) => setStayId(parseInt(e.target.value))}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="1">Stay #1: Anand Narayanan (Cardiology ACS)</option>
                  <option value="2">Stay #2: Meenakshi Sundaram (COPD Exacerbation)</option>
                  <option value="3">Stay #3: Karthik Subramanian (Dengue)</option>
                </select>
                <button onClick={handleExportFHIR} className="btn btn-primary btn-sm" disabled={isLoading}>
                  <FileCode size={14} /> Generate FHIR Bundle
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: FHIR R4 JSON Schema Inspector */}
        <div className="card" style={{ background: '#0f172a', color: '#f8fafc', borderColor: '#334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} style={{ color: '#2dd4bf' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
                Standard FHIR R4 Document JSON Output
              </span>
            </div>

            {fhirBundle && (
              <button
                onClick={handleCopyJson}
                className="btn btn-secondary btn-sm"
                style={{ background: '#1e293b', color: '#2dd4bf', borderColor: '#334155' }}
              >
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            )}
          </div>

          {fhirBundle ? (
            <pre style={{
              background: '#020617', padding: '14px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8',
              maxHeight: '460px', overflowY: 'auto', border: '1px solid #1e293b'
            }}>
              {JSON.stringify(fhirBundle, null, 2)}
            </pre>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Click <strong>Generate FHIR Bundle</strong> to view the standardized interoperable FHIR R4 document payload.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
