import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%'
    }}>
      {toasts.map((toast) => {
        const isCritical = toast.type === 'CRITICAL';
        const isSuccess = toast.type === 'SUCCESS';
        const isWarning = toast.type === 'WARNING';

        const bg = isCritical ? '#fff1f2' : isSuccess ? '#ecfdf5' : isWarning ? '#fffbeb' : '#ffffff';
        const border = isCritical ? '#fecdd3' : isSuccess ? '#a7f3d0' : isWarning ? '#fde68a' : '#e2e8f0';
        const iconColor = isCritical ? '#e11d48' : isSuccess ? '#059669' : isWarning ? '#d97706' : '#4f46e5';

        return (
          <div
            key={toast.id}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            <div style={{ color: iconColor, marginTop: '2px' }}>
              {isCritical ? <AlertCircle size={18} /> : isSuccess ? <CheckCircle size={18} /> : <Info size={18} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
