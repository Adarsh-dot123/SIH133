import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, AlertTriangle, CheckCircle, 
  MapPin, Activity, Phone, Navigation, User, Sparkles, BookOpen 
} from 'lucide-react';
import { api } from '../api/client';

export const SecondOpinion: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default coordinate location for scoring
  const userLat = 13.0827;
  const userLng = 80.2707;

  // Preset mock text files for instant demo presentation testing
  const presets = [
    { name: 'cardiac_report.txt', text: 'ECG displays ST elevation, chest pain and cardiac arrest flags. Critical cardiology triage required.' },
    { name: 'biopsy_report.txt', text: 'Lymph node tissue biopsy displays abnormal cell division and potential malignant oncology flags.' },
    { name: 'lung_scan_report.txt', text: 'Patient shows shortness of breath, asthma, coughing, and oxygen saturation drops.' },
    { name: 'kidney_panel.txt', text: 'Renal panel: serum creatinine 4.8 mg/dL, showing signs of nephrology stress.' }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handlePresetSelect = (preset: typeof presets[0]) => {
    const blob = new Blob([preset.text], { type: 'text/plain' });
    const mockFile = new File([blob], preset.name, { type: 'text/plain' });
    processSelectedFile(mockFile);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    // Progress bar animation simulation
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    try {
      // API call to POST /reports/second-opinion
      const response = await api.scanSecondOpinion(file, userLat, userLng);
      setResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to scan report.');
    } finally {
      clearInterval(interval);
      setScanProgress(100);
      setTimeout(() => {
        setIsScanning(false);
      }, 300);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency':
        return { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' };
      case 'urgent':
        return { bg: '#ffedd5', text: '#f97316', border: '#fed7aa' };
      default:
        return { bg: '#d1fae5', text: '#10b981', border: '#a7f3d0' };
    }
  };

  const colors = getUrgencyColor(result?.urgency_level);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* Header Spotlight */}
      <div style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '28px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px' }}>
          <Sparkles size={14} /> Second Opinion AI Scanner Active
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0' }}>AI-Powered Medical Report Triage & Second Opinion Recommendation</h1>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>
          Upload blood reports, lab scans, or prescriptions. Our multi-variable ranking engine evaluates specialist experience, live bed availability, and distance weights to find the best second consultation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '28px', alignItems: 'start' }}>
        
        {/* Left Side: Upload zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0' }}>Scan Prescription or Medical Report</h3>
            
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '32px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                transition: 'border-color 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0d9488'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              <UploadCloud size={40} style={{ color: '#0d9488' }} />
              <div>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Click to upload</span> or drag and drop
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                PDF, PNG, or JPG (max. 10MB)
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                style={{ display: 'none' }}
              />
            </div>

            {file && (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                <FileText size={20} style={{ color: '#0d9488' }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleUploadSubmit}
              disabled={!file || isScanning}
              className={`btn btn-primary`}
              style={{ width: '100%', marginTop: '16px', height: '42px', fontWeight: 700 }}
            >
              {isScanning ? 'Scanning report content...' : 'Upload & Get Recommendations'}
            </button>
          </div>

          {/* Quick Demo Presets */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 12px 0', color: '#475569' }}>Quick Demo Test Templates</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                >
                  📄 {preset.name}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Results & Animation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Scanning Animation */}
          {isScanning && (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '4px solid #ccfbf1', borderTopColor: '#0d9488',
                  animation: 'spin 1s linear infinite'
                }} />
                {/* CSS Spin Keyframe injection */}
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488', marginBottom: '8px' }}>Scanning Report using AI OCR</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '20px' }}>
                Extracting clinical key indicators and evaluating second-opinion weights...
              </p>
              
              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ background: '#0d9488', height: '100%', width: `${scanProgress}%`, transition: 'width 0.15s ease-out' }} />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="card" style={{ padding: '16px', borderColor: '#fee2e2', background: '#fff5f5', color: '#b91c1c', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <AlertTriangle size={20} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>
            </div>
          )}

          {/* Empty state: Waiting for Upload */}
          {!isScanning && !result && !error && (
            <div className="card" style={{ padding: '60px 24px', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
              <BookOpen size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>No Active Scan Result</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>
                Please upload a prescription or medical report to scan for second-opinion recommendations.
              </p>
            </div>
          )}

          {/* Results Panel */}
          {!isScanning && result && (
            <>
              {/* Triage Summary */}
              <div className="card" style={{ padding: '24px', borderLeft: `5px solid ${colors.text}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>AI OCR Triage Result</h3>
                  <span style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    padding: '3px 12px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {result.urgency_level}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#475569' }}>Recommended Specialty: </span>
                    <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                      {result.recommended_specialty}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#475569' }}>Key Findings: </span>
                    <span style={{ fontStyle: 'italic', color: '#1e293b' }}>
                      {result.key_findings}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations Hospital List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                  Ranked Second Opinion Hospital Recommendations
                </span>

                {result.ranked_hospitals?.map((hosp: any, idx: number) => (
                  <div
                    key={hosp.hospital_id}
                    className="card"
                    style={{
                      padding: '20px',
                      borderColor: idx === 0 ? '#0d9488' : '#e2e8f0',
                      background: idx === 0 ? '#f0fdfa' : '#ffffff',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header: Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hosp.hospital_name}
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#eab308' }}>★ {hosp.rating}</span>
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={12} /> {hosp.distance_km} km away • {hosp.address}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0d9488' }}>
                          {Math.round(hosp.score * 100)}%
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
                          Match Score
                        </div>
                      </div>
                    </div>

                    {/* Specialist */}
                    <div style={{
                      margin: '12px 0',
                      background: '#ffffff',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488'
                      }}>
                        <User size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                          {hosp.doctor_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Consultant Specialist ({hosp.doctor_experience} years experience)
                        </div>
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                        <Activity size={14} />
                        {hosp.available_beds} Live Beds Available
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={`tel:${hosp.phone}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '4px 10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Calling ${hosp.hospital_name} booking office at ${hosp.phone}`);
                          }}
                        >
                          <Phone size={12} /> Book Consultation
                        </a>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '4px 10px' }}
                          onClick={() => alert(`Routing details from current location to: ${hosp.hospital_name} (Coordinates: ${userLat}, ${userLng})`)}
                        >
                          <Navigation size={12} /> Get Directions
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
};
