import React, { useState } from 'react';
import { X, Phone, MessageSquare, Send, RotateCcw } from 'lucide-react';
import { api } from '../api/client';

interface UssdSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UssdSimulatorModal: React.FC<UssdSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'USSD' | 'SMS'>('USSD');
  const [ussdSessionId, setUssdSessionId] = useState<string>(() => 'SESS_' + Math.random().toString(36).substring(7));
  const [ussdScreen, setUssdScreen] = useState<string>('Dial *999# for MedFlow Rural Emergency Health Helpline');
  const [ussdInput, setUssdInput] = useState<string>('*999#');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // SMS State
  const [smsPhone, setSmsPhone] = useState<string>('+91 98401 22334');
  const [smsInput, setSmsInput] = useState<string>('ICU CHENNAI');
  const [smsHistory, setSmsHistory] = useState<Array<{ from: string; text: string; time: string }>>([
    { from: 'SYS', text: 'Type "ICU <City>" or "BEDS <District>" or "OXYGEN <District>" to query real-time beds via SMS.', time: '09:00 AM' }
  ]);

  if (!isOpen) return null;

  const handleUssdSend = async () => {
    if (!ussdInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.queryUSSD(ussdSessionId, ussdInput.trim());
      setUssdScreen(res.message);
      setUssdInput('');
      if (!res.should_continue) {
        // Generate new session on next dial
        setUssdSessionId('SESS_' + Math.random().toString(36).substring(7));
      }
    } catch (err: any) {
      setUssdScreen(`Connection Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmsSend = async () => {
    if (!smsInput.trim()) return;
    const userMsg = smsInput.trim();
    setSmsHistory(prev => [...prev, { from: 'ME', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setSmsInput('');
    setIsLoading(true);
    try {
      const res = await api.querySMS(smsPhone, userMsg);
      setSmsHistory(prev => [...prev, { from: 'MEDFLOW', text: res.sms_text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setSmsHistory(prev => [...prev, { from: 'ERR', text: 'Failed to deliver SMS. Check backend connection.', time: 'Now' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetUssd = () => {
    setUssdSessionId('SESS_' + Math.random().toString(36).substring(7));
    setUssdScreen('Dial *999# for MedFlow Rural Emergency Health Helpline');
    setUssdInput('*999#');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Rural Offline Access Simulator
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              USSD (*999#) & SMS fallback for 2G / non-smartphone areas in India
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <button
            className={`btn btn-sm ${mode === 'USSD' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('USSD')}
            style={{ flex: 1 }}
          >
            <Phone size={14} /> USSD Protocol (*999#)
          </button>
          <button
            className={`btn btn-sm ${mode === 'SMS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('SMS')}
            style={{ flex: 1 }}
          >
            <MessageSquare size={14} /> SMS Gateway
          </button>
        </div>

        {mode === 'USSD' ? (
          <div className="ussd-phone">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>CELL TOWER: BSNL / JIO 2G</span>
              <button onClick={handleResetUssd} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>
            
            <div className="ussd-screen">
              {isLoading ? 'Transmitting USSD packet...' : ussdScreen}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={ussdInput}
                onChange={(e) => setUssdInput(e.target.value)}
                placeholder="Type 1-4 or *999#"
                onKeyDown={(e) => e.key === 'Enter' && handleUssdSend()}
                style={{
                  flex: 1, padding: '8px 12px', background: '#0f172a',
                  border: '1px solid #334155', borderRadius: '8px',
                  color: '#38bdf8', fontFamily: 'monospace'
                }}
              />
              <button onClick={handleUssdSend} className="btn btn-primary btn-sm" disabled={isLoading}>
                <Send size={14} /> Send
              </button>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
              Try entering <strong>*999#</strong>, then reply with <strong>1</strong> (ICU) or <strong>2</strong> (Oxygen)
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {smsHistory.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.from === 'ME' ? 'flex-end' : 'flex-start',
                    background: m.from === 'ME' ? '#0d9488' : '#ffffff',
                    color: m.from === 'ME' ? '#ffffff' : '#0f172a',
                    padding: '8px 12px', borderRadius: '12px',
                    maxWidth: '85%', fontSize: '0.8rem',
                    border: m.from === 'ME' ? 'none' : '1px solid #cbd5e1',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {m.text}
                  <div style={{ fontSize: '0.65rem', color: m.from === 'ME' ? '#ccfbf1' : '#94a3b8', marginTop: '2px', textAlign: 'right' }}>
                    {m.time}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
                placeholder='e.g. "ICU CHENNAI" or "O2 VELLORE"'
                onKeyDown={(e) => e.key === 'Enter' && handleSmsSend()}
                className="form-input"
                style={{ flex: 1 }}
              />
              <button onClick={handleSmsSend} className="btn btn-primary btn-sm" disabled={isLoading}>
                <Send size={14} /> Send SMS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
