import React from 'react';
import { UserRole, User } from '../types';
import { ShieldAlert, Lock, ArrowRight, LogIn, Sparkles, Building2, Landmark, User as UserIcon } from 'lucide-react';

interface AccessDeniedViewProps {
  currentRole: UserRole;
  currentUser: User | null;
  attemptedTab: string;
  onGoToAllowedPortal: () => void;
  onOpenLogin: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentRole,
  currentUser,
  attemptedTab,
  onGoToAllowedPortal,
  onOpenLogin
}) => {
  const getRequiredRoleName = (tab: string): { name: string; role: UserRole; color: string; icon: React.ReactNode } => {
    if (tab.startsWith('patient-')) {
      return { name: 'Patient & Family Portal', role: 'PATIENT', color: '#0d9488', icon: <UserIcon size={24} /> };
    } else if (tab === 'hospital-dashboard' || tab === 'clinical-turnover' || tab === 'abdm-hub') {
      return { name: 'Hospital Staff & Doctor Management', role: 'HOSPITAL_STAFF', color: '#2563eb', icon: <Building2 size={24} /> };
    } else {
      return { name: 'State Government & District Command', role: 'GOVT_ADMIN', color: '#7c3aed', icon: <Landmark size={24} /> };
    }
  };

  const requiredInfo = getRequiredRoleName(attemptedTab);

  return (
    <div style={{
      maxWidth: '680px',
      margin: '60px auto',
      padding: '40px 32px',
      background: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
      border: '1px solid #fee2e2',
      textAlign: 'center'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: '#fef2f2',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px auto',
        border: '1px solid #fecaca'
      }}>
        <ShieldAlert size={36} />
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: '#fef2f2',
        color: '#b91c1c',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        marginBottom: '12px'
      }}>
        <Lock size={12} />
        <span>ROLE-BASED ACCESS CONTROL (RBAC) ENFORCED</span>
      </div>

      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
        Access Restricted to {requiredInfo.name}
      </h2>

      <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 auto 28px auto', maxWidth: '520px' }}>
        You are currently authenticated as <strong>{currentUser ? currentUser.full_name : 'Guest'}</strong> (Role: <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentRole}</span>). 
        To ensure patient privacy, clinical safety, and governmental security, each stakeholder may only access their designated portal.
      </p>

      {/* Access Comparison Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '14px',
        marginBottom: '28px',
        textAlign: 'left'
      }}>
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Your Active Persona</span>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '2px' }}>{currentRole}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {currentRole === 'PATIENT' ? 'Permitted: Hospital Finder & Smart Referrals' : currentRole === 'HOSPITAL_STAFF' ? 'Permitted: Ward Grid & ML Turnover' : 'Permitted: State Command & Heatmaps'}
          </div>
        </div>

        <div style={{ paddingLeft: '12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Required Clearance</span>
          <div style={{ fontWeight: 700, color: requiredInfo.color, fontSize: '0.9rem', marginTop: '2px' }}>{requiredInfo.role}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Requires valid credentials from {requiredInfo.name}
          </div>
        </div>
      </div>

      {/* Navigation & Action Buttons */}
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onGoToAllowedPortal}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            borderRadius: '12px',
            fontWeight: 700,
            background: currentRole === 'PATIENT' ? '#0d9488' : currentRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed'
          }}
        >
          <span>Return to Your {currentRole === 'PATIENT' ? 'Patient' : currentRole === 'HOSPITAL_STAFF' ? 'Hospital' : 'Govt Admin'} Portal</span>
          <ArrowRight size={16} />
        </button>

        <button
          onClick={onOpenLogin}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700
          }}
        >
          <LogIn size={16} />
          <span>Switch Account / Sign In as {requiredInfo.role}</span>
        </button>
      </div>
    </div>
  );
};
