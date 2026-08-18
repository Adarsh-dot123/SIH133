import React from 'react';
import { UserRole } from '../types';
import { Activity, ShieldCheck, PhoneCall, Building2, User, Landmark, Cpu, Link2, Sparkles, Radio } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isWsConnected: boolean;
  onOpenUssd: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  isWsConnected,
  onOpenUssd
}) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); onTabChange(currentRole === 'PATIENT' ? 'patient-search' : currentRole === 'HOSPITAL_STAFF' ? 'hospital-dashboard' : 'govt-overview'); }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <Activity size={22} />
            </div>
            <span>Med<span style={{ color: '#0d9488' }}>Flow</span></span>
            <span className="brand-badge">India</span>
          </a>

          {/* Live WS Pulse */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', fontWeight: 600,
            background: isWsConnected ? '#ecfdf5' : '#fff1f2',
            color: isWsConnected ? '#059669' : '#e11d48',
            padding: '3px 8px', borderRadius: '9999px',
            border: `1px solid ${isWsConnected ? '#d1fae5' : '#ffe4e6'}`
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: isWsConnected ? '#10b981' : '#f43f5e'
            }} />
            {isWsConnected ? 'Live Real-Time Sync' : 'Reconnecting...'}
          </div>
        </div>

        {/* Dynamic Navigation Links based on role */}
        <nav className="nav-links">
          {currentRole === 'PATIENT' && (
            <>
              <button
                className={`nav-item ${activeTab === 'patient-search' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-search')}
              >
                <Building2 size={16} /> Hospital Finder
              </button>
              <button
                className={`nav-item ${activeTab === 'patient-referral' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-referral')}
              >
                <Sparkles size={16} /> Smart Emergency Referral
              </button>
            </>
          )}

          {currentRole === 'HOSPITAL_STAFF' && (
            <>
              <button
                className={`nav-item ${activeTab === 'hospital-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('hospital-dashboard')}
              >
                <Building2 size={16} /> Ward & Bed Grid
              </button>
              <button
                className={`nav-item ${activeTab === 'clinical-turnover' ? 'active' : ''}`}
                onClick={() => onTabChange('clinical-turnover')}
              >
                <Sparkles size={16} /> ML Turnover Engine
              </button>
              <button
                className={`nav-item ${activeTab === 'abdm-hub' ? 'active' : ''}`}
                onClick={() => onTabChange('abdm-hub')}
              >
                <Link2 size={16} /> ABDM / FHIR Standard
              </button>
            </>
          )}

          {currentRole === 'GOVT_ADMIN' && (
            <>
              <button
                className={`nav-item ${activeTab === 'govt-overview' ? 'active' : ''}`}
                onClick={() => onTabChange('govt-overview')}
              >
                <Landmark size={16} /> State Command Center
              </button>
              <button
                className={`nav-item ${activeTab === 'digital-twin' ? 'active' : ''}`}
                onClick={() => onTabChange('digital-twin')}
              >
                <Cpu size={16} /> Digital Twin Simulator
              </button>
              <button
                className={`nav-item ${activeTab === 'iot-monitor' ? 'active' : ''}`}
                onClick={() => onTabChange('iot-monitor')}
              >
                <Radio size={16} /> IoT Telemetry
              </button>
              <button
                className={`nav-item ${activeTab === 'audit-trail' ? 'active' : ''}`}
                onClick={() => onTabChange('audit-trail')}
              >
                <ShieldCheck size={16} /> Blockchain Audit Chain
              </button>
            </>
          )}

          {/* Rural USSD / SMS Simulator Launcher */}
          <button
            onClick={onOpenUssd}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}
            title="Test Rural Offline USSD (*999#) & SMS Gateway"
          >
            <PhoneCall size={14} style={{ color: '#0d9488' }} />
            <span>Rural USSD/SMS</span>
          </button>
        </nav>

        {/* Stakeholder Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Stakeholder Role:
          </span>
          <div className="role-switcher">
            <button
              className={`role-btn ${currentRole === 'PATIENT' ? 'active' : ''}`}
              onClick={() => {
                onRoleChange('PATIENT');
                onTabChange('patient-search');
              }}
            >
              <User size={14} /> Patient
            </button>
            <button
              className={`role-btn ${currentRole === 'HOSPITAL_STAFF' ? 'active' : ''}`}
              onClick={() => {
                onRoleChange('HOSPITAL_STAFF');
                onTabChange('hospital-dashboard');
              }}
            >
              <Building2 size={14} /> Hospital Staff
            </button>
            <button
              className={`role-btn ${currentRole === 'GOVT_ADMIN' ? 'active' : ''}`}
              onClick={() => {
                onRoleChange('GOVT_ADMIN');
                onTabChange('govt-overview');
              }}
            >
              <Landmark size={14} /> Govt Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
