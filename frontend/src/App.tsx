import React, { useState, useEffect } from 'react';
import { UserRole, User } from './types';
import { Navbar } from './components/Navbar';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { UssdSimulatorModal } from './components/UssdSimulatorModal';
import { LoginPage } from './pages/LoginPage';
import { PatientPortal } from './pages/PatientPortal';
import { HospitalPortal } from './pages/HospitalPortal';
import { GovtCommandCenter } from './pages/GovtCommandCenter';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { IoTMonitorPage } from './pages/IoTMonitorPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ABDMAdapterPage } from './pages/ABDMAdapterPage';
import { api, createWebSocketSubscriber } from './api/client';

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('PATIENT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('patient-search');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isUssdOpen, setIsUssdOpen] = useState<boolean>(false);

  // Check existing auth token on boot
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        if (user && user.email) {
          setCurrentUser(user);
          setCurrentRole(user.role as UserRole);
        }
      } catch (e) {
        // Unauthenticated - default to guest / demo view
      }
    };
    checkAuth();
  }, []);

  // WebSocket Live Updates
  useEffect(() => {
    const unsubscribe = createWebSocketSubscriber((event, data) => {
      setIsWsConnected(true);
      
      // Spawn toast notifications on live events
      let toastTitle = 'MedFlow Live Update';
      let toastMessage = 'System status updated';
      let toastType: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INFO' = 'INFO';

      if (event === 'BED_STATUS_CHANGED') {
        toastTitle = 'Ward Bed Status Modified';
        toastMessage = `Bed #${data.bed_number || 'N/A'} changed to ${data.new_status}`;
        toastType = 'SUCCESS';
      } else if (event === 'OXYGEN_LEVEL_UPDATED') {
        toastTitle = 'Oxygen Inventory Sync';
        toastMessage = `Hospital #${data.hospital_id} updated bulk tank reserves to ${data.bulk_tank_current_kl} kL`;
        toastType = 'INFO';
      } else if (event === 'PREDICTION_RECALCULATED') {
        toastTitle = 'ML Bed Turnover Forecast Updated';
        toastMessage = `Discharge probability recalculated: ${Math.round(data.discharge_prob_12h * 100)}% within 12h`;
        toastType = 'SUCCESS';
      } else if (event === 'REFERRAL_DISPATCHED') {
        toastTitle = '🚨 Emergency Smart Referral';
        toastMessage = `Patient ${data.patient_name} routed to ${data.destination_hospital_name}`;
        toastType = 'WARNING';
      } else if (event === 'DISTRICT_ALERT_TRIGGERED') {
        toastTitle = '⚠️ Inter-District Reallocation';
        toastMessage = `${data.quantity} units of ${data.resource} transferred from ${data.from_district} to ${data.to_district}`;
        toastType = 'CRITICAL';
      }

      const newToast: ToastMessage = {
        id: 'toast_' + Date.now() + Math.random().toString(),
        type: toastType,
        title: toastTitle,
        message: toastMessage
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    });

    return () => unsubscribe();
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (user: User, role: UserRole) => {
    setCurrentUser(user);
    setCurrentRole(role);
    
    // Redirect directly to the appropriate stakeholder home view
    if (role === 'PATIENT') {
      setActiveTab('patient-search');
    } else if (role === 'HOSPITAL_STAFF') {
      setActiveTab('hospital-dashboard');
    } else if (role === 'GOVT_ADMIN') {
      setActiveTab('govt-overview');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('login');
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'PATIENT') setActiveTab('patient-search');
    else if (role === 'HOSPITAL_STAFF') setActiveTab('hospital-dashboard');
    else if (role === 'GOVT_ADMIN') setActiveTab('govt-overview');
  };

  return (
    <div className="app-container">
      {/* Dynamic Global Navbar */}
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isWsConnected={isWsConnected}
        onOpenUssd={() => setIsUssdOpen(true)}
        onOpenLogin={() => setActiveTab('login')}
        onLogout={handleLogout}
      />

      {/* Main Dynamic View Area */}
      <main className="main-content">
        {/* Dedicated Login / Portal Access View */}
        {activeTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onContinueAsGuest={() => {
              setCurrentRole('PATIENT');
              setActiveTab('patient-search');
            }}
          />
        )}

        {/* Patient Portal Views */}
        {activeTab === 'patient-search' && <PatientPortal initialTab="search" />}
        {activeTab === 'patient-referral' && <PatientPortal initialTab="referral" />}

        {/* Hospital Staff Views */}
        {activeTab === 'hospital-dashboard' && <HospitalPortal />}
        {activeTab === 'clinical-turnover' && <HospitalPortal />}
        {activeTab === 'abdm-hub' && <ABDMAdapterPage />}

        {/* Government Command Center Views */}
        {activeTab === 'govt-overview' && <GovtCommandCenter />}
        {activeTab === 'digital-twin' && <DigitalTwinPage />}
        {activeTab === 'iot-monitor' && <IoTMonitorPage />}
        {activeTab === 'audit-trail' && <AuditTrailPage />}
      </main>

      {/* Real-time WebSocket Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Interactive Rural USSD / SMS Simulator Modal */}
      <UssdSimulatorModal isOpen={isUssdOpen} onClose={() => setIsUssdOpen(false)} />

      {/* Footer */}
      <footer style={{
        background: '#ffffff', borderTop: '1px solid #e2e8f0',
        padding: '16px 24px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>MedFlow India</strong> — Real-Time Predictive Hospital Resource Management & Bed Turnover Platform
          </div>
          <div>
            ABDM / FHIR R4 Interoperable • Cryptographic Audit Chain • Low-Connectivity USSD Fallback
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
