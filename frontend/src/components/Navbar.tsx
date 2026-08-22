import React from 'react';
import { UserRole, User as UserType } from '../types';
import { 
  Activity, ShieldCheck, PhoneCall, Building2, User, Landmark, 
  Cpu, Link2, Sparkles, Radio, LogIn, LogOut, Lock, Users, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  currentRole: UserRole;
  currentUser: UserType | null;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isWsConnected: boolean;
  onOpenUssd: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentUser,
  onRoleChange,
  activeTab,
  onTabChange,
  isWsConnected,
  onOpenUssd,
  onOpenLogin,
  onLogout,
  onOpenAdmin
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#" className="brand-logo" onClick={(e) => { 
            e.preventDefault(); 
            onTabChange(currentRole === 'PATIENT' ? 'patient-search' : currentRole === 'HOSPITAL_STAFF' ? 'hospital-dashboard' : 'govt-overview'); 
          }}>
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
            {isWsConnected ? t('live_real_time_sync', 'Live Real-Time Sync') : t('reconnecting', 'Reconnecting...')}
          </div>
        </div>

        {/* Dynamic Navigation Links strictly enforced per active role */}
        <nav className="nav-links">
          {currentRole === 'PATIENT' && (
            <>
              <button
                className={`nav-item ${activeTab === 'patient-search' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-search')}
              >
                <Building2 size={16} /> {t('hospital_finder', 'Hospital Finder')}
              </button>
              <button
                className={`nav-item ${activeTab === 'patient-referral' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-referral')}
              >
                <Sparkles size={16} /> {t('smart_emergency_referral', 'Smart Emergency Referral')}
              </button>
              <button
                className={`nav-item ${activeTab === 'second-opinion' ? 'active' : ''}`}
                onClick={() => onTabChange('second-opinion')}
              >
                <Sparkles size={16} /> {t('second_opinion', 'Second Opinion / Scan Report')}
              </button>
            </>
          )}

          {currentRole === 'HOSPITAL_STAFF' && (
            <>
              <button
                className={`nav-item ${activeTab === 'hospital-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('hospital-dashboard')}
              >
                <Building2 size={16} /> {t('ward_bed_grid', 'Ward & Bed Grid')}
              </button>
              <button
                className={`nav-item ${activeTab === 'clinical-turnover' ? 'active' : ''}`}
                onClick={() => onTabChange('clinical-turnover')}
              >
                <Sparkles size={16} /> {t('ml_turnover_engine', 'ML Turnover Engine')}
              </button>
              <button
                className={`nav-item ${activeTab === 'abdm-hub' ? 'active' : ''}`}
                onClick={() => onTabChange('abdm-hub')}
              >
                <Link2 size={16} /> {t('abdm_fhir_standard', 'ABDM / FHIR Standard')}
              </button>
            </>
          )}

          {currentRole === 'GOVT_ADMIN' && (
            <>
              <button
                className={`nav-item ${activeTab === 'govt-overview' ? 'active' : ''}`}
                onClick={() => onTabChange('govt-overview')}
              >
                <Landmark size={16} /> {t('state_command_center', 'State Command Center')}
              </button>
              <button
                className={`nav-item ${activeTab === 'digital-twin' ? 'active' : ''}`}
                onClick={() => onTabChange('digital-twin')}
              >
                <Cpu size={16} /> {t('digital_twin_simulator', 'Digital Twin Simulator')}
              </button>
              <button
                className={`nav-item ${activeTab === 'iot-monitor' ? 'active' : ''}`}
                onClick={() => onTabChange('iot-monitor')}
              >
                <Radio size={16} /> {t('iot_telemetry', 'IoT Telemetry')}
              </button>
              <button
                className={`nav-item ${activeTab === 'audit-trail' ? 'active' : ''}`}
                onClick={() => onTabChange('audit-trail')}
              >
                <ShieldCheck size={16} /> {t('blockchain_audit_chain', 'Blockchain Audit Chain')}
              </button>
              <button
                className={`nav-item ${activeTab === 'user-registry' ? 'active' : ''}`}
                onClick={() => onTabChange('user-registry')}
              >
                <Users size={16} /> {t('user_registry', 'User Registry')}
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
            <span>{t('rural_ussd_sms', 'Rural USSD/SMS')}</span>
          </button>

          {/* Hospital Admin Live Editor Toggle */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: '6px',
                borderColor: '#e2e8f0',
                color: '#4f46e5',
                fontWeight: 700
              }}
              title="Open Hospital Admin Live Editor (Firestore Sync)"
            >
              <ShieldCheck size={14} style={{ color: '#4f46e5' }} />
              <span>Admin Editor</span>
            </button>
          )}
        </nav>

        {/* Stakeholder Role Badge & Account Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '8px' }}>
            <Globe size={14} style={{ color: '#64748b' }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '4px'
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          {/* Active Role Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: currentRole === 'PATIENT' ? '#f0fdfa' : currentRole === 'HOSPITAL_STAFF' ? '#eff6ff' : '#f5f3ff',
            border: `1px solid ${currentRole === 'PATIENT' ? '#ccfbf1' : currentRole === 'HOSPITAL_STAFF' ? '#dbeafe' : '#ede9fe'}`,
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: currentRole === 'PATIENT' ? '#0d9488' : currentRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed'
          }}>
            <Lock size={12} />
            <span>
              {currentRole === 'PATIENT' ? t('patient_portal', 'Patient Portal') : currentRole === 'HOSPITAL_STAFF' ? t('hospital_staff_portal', 'Hospital Staff Portal') : t('govt_command_portal', 'Govt Command Portal')}
            </span>
          </div>

          {/* User Account / Login State */}
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '4px 10px',
              borderRadius: '9999px'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentRole === 'PATIENT' ? '#0d9488' : currentRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {currentUser.full_name.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                  {currentUser.full_name.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginLeft: '4px'
                }}
                title="Sign Out / Switch Account"
              >
                <LogOut size={13} />
                <span>{t('exit', 'Exit')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <LogIn size={14} />
              <span>{t('sign_in_switch_role', 'Sign In / Switch Role')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
