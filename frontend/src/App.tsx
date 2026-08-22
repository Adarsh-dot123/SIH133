import React, { useState, useEffect } from 'react';
import { UserRole, User } from './types';
import { Navbar } from './components/Navbar';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { UssdSimulatorModal } from './components/UssdSimulatorModal';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AccessDeniedView } from './components/AccessDeniedView';
import { LoginPage } from './pages/LoginPage';
import { PatientPortal } from './pages/PatientPortal';
import { HospitalPortal } from './pages/HospitalPortal';
import { GovtCommandCenter } from './pages/GovtCommandCenter';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { IoTMonitorPage } from './pages/IoTMonitorPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ABDMAdapterPage } from './pages/ABDMAdapterPage';
import { UserRegistryPage } from './pages/UserRegistryPage';
import { SecondOpinion } from './pages/SecondOpinion';
import { MedicineTracker } from './pages/MedicineTracker';
import { api, createWebSocketSubscriber } from './api/client';
import { onPatientAuthStateChanged, logoutUser } from './firebase';
import { AuthModal } from './components/AuthModal';
import { HospitalAdminModal } from './components/HospitalAdminModal';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { VideoCallModal } from './components/VideoCallModal';
import { usePeerCall } from './hooks/usePeerCall';

// Strict Role-Based Access Control mapping
const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
  PATIENT: ['medicine-tracker', 'patient-search', 'second-opinion', 'rural-gateway', 'login'],
  HOSPITAL_STAFF: ['hospital-dashboard', 'doctor-consultations', 'abdm-hub', 'login'],
  GOVT_ADMIN: ['govt-overview', 'digital-twin', 'iot-monitor', 'audit-trail', 'user-registry', 'login'],
};

const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  PATIENT: 'medicine-tracker',
  HOSPITAL_STAFF: 'hospital-dashboard',
  GOVT_ADMIN: 'govt-overview',
};

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('PATIENT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isUssdOpen, setIsUssdOpen] = useState<boolean>(false);

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  const [callerName, setCallerName] = useState<string>('Doctor / Patient');

  const {
    myPeerId, isCallActive, isIncoming, incomingCallInfo, localStream, remoteStream,
    initPeer, callPeer, answerCall, endCall
  } = usePeerCall((info) => {
    setCallerName(info.doctorName || 'Doctor');
  });

  // Init PeerJS when user logs in
  useEffect(() => {
    if (currentUser?.email) {
      initPeer(currentUser.email);
    }
  }, [currentUser, initPeer]);

  // Check existing auth token and Firebase Auth on boot
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setActiveTab('login');
        return;
      }
      try {
        const user = await api.getMe();
        if (user && user.email) {
          setCurrentUser(user);
          const role = user.role as UserRole;
          setCurrentRole(role);
          setActiveTab(ROLE_DEFAULT_TAB[role] || 'login');
        } else {
          setActiveTab('login');
        }
      } catch (e) {
        setActiveTab('login');
      }
    };
    checkAuth();

    // Persist and listen to Firebase auth state changes
    const unsubscribeFirebase = onPatientAuthStateChanged((fireUser) => {
      if (fireUser) {
        const patientUser: User = {
          id: fireUser.uid,
          email: fireUser.email,
          full_name: fireUser.displayName || 'Patient User',
          role: 'PATIENT'
        };
        setCurrentUser(patientUser);
        setCurrentRole('PATIENT');
      } else {
        // Only log out if currently in PATIENT portal to prevent kicking out staff/govt logins
        if (currentRole === 'PATIENT') {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      unsubscribeFirebase();
    };
  }, [currentRole]);

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
    setActiveTab(ROLE_DEFAULT_TAB[role]);
  };

  const handleLogout = () => {
    api.logout();
    logoutUser();
    setCurrentUser(null);
    setActiveTab('login');
  };

  const handleRoleChange = (role: UserRole) => {
    // When changing role, route to allowed tab for that role or login
    setCurrentRole(role);
    setActiveTab(ROLE_DEFAULT_TAB[role]);
  };

  // Check if current tab is permitted for current role
  const isTabPermitted = activeTab === 'login' || (ROLE_ALLOWED_TABS[currentRole] && ROLE_ALLOWED_TABS[currentRole].includes(activeTab));

  return (
    <div className="app-container">
      {/* Dynamic Global Navbar with strict RBAC */}
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isWsConnected={isWsConnected}
        onOpenUssd={() => setIsUssdOpen(true)}
        onOpenLogin={() => {
          if (currentRole === 'PATIENT') {
            setIsAuthOpen(true);
          } else {
            setActiveTab('login');
          }
        }}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main View Area with RBAC Enforcement */}
      <main className="main-content">
        {/* Dedicated Login / Portal Access View */}
        {activeTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onContinueAsGuest={() => {
              setCurrentRole('PATIENT');
              setActiveTab('medicine-tracker');
            }}
          />
        )}

        {/* RBAC Violation Guard: If tab is not permitted for this role, show AccessDeniedView */}
        {!isTabPermitted && activeTab !== 'login' && (
          <AccessDeniedView
            currentRole={currentRole}
            currentUser={currentUser}
            attemptedTab={activeTab}
            onGoToAllowedPortal={() => setActiveTab(ROLE_DEFAULT_TAB[currentRole])}
            onOpenLogin={() => setActiveTab('login')}
          />
        )}

        {/* Patient Portal Views (PATIENT ONLY) */}
        {isTabPermitted && activeTab === 'medicine-tracker' && <MedicineTracker />}
        {isTabPermitted && activeTab === 'patient-search' && <PatientPortal initialTab="search" userToken={localStorage.getItem('token') || undefined} myPeerId={myPeerId} />}
        {isTabPermitted && activeTab === 'second-opinion' && <SecondOpinion />}
        {isTabPermitted && activeTab === 'rural-gateway' && (
          <div className="card" style={{ maxWidth: '800px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              📞 Rural USSD & SMS Gateway Simulator
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
              Query real-time public health resource levels, bed counts, and oxygen status using offline-compatible telecommunication channels (such as <strong>*999#</strong> or direct SMS queries).
            </p>
            <button onClick={() => setIsUssdOpen(true)} className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Launch Live USSD Mobile Simulator</span>
            </button>
          </div>
        )}

        {/* Hospital Staff Views (HOSPITAL_STAFF ONLY) */}
        {isTabPermitted && activeTab === 'hospital-dashboard' && <HospitalPortal />}
        {isTabPermitted && activeTab === 'doctor-consultations' && (
          <DoctorDashboard
            doctorName={currentUser?.full_name || 'Dr. Doctor'}
            specialization={currentUser?.department || 'Cardiology'}
            token={localStorage.getItem('token') || undefined}
            myPeerId={myPeerId}
            onCallPatient={(complaint) => {
              setCallerName(complaint.patient_name);
              const targetPeerId = complaint.patient_peer_id || `medflow-${complaint.patient_id}`;
              callPeer(targetPeerId, complaint.id);
            }}
          />
        )}
        {isTabPermitted && activeTab === 'abdm-hub' && <ABDMAdapterPage />}

        {/* Government Command Center Views (GOVT_ADMIN ONLY) */}
        {isTabPermitted && activeTab === 'govt-overview' && <GovtCommandCenter />}
        {isTabPermitted && activeTab === 'digital-twin' && <DigitalTwinPage />}
        {isTabPermitted && activeTab === 'iot-monitor' && <IoTMonitorPage />}
        {isTabPermitted && activeTab === 'audit-trail' && <AuditTrailPage />}
        {isTabPermitted && activeTab === 'user-registry' && <UserRegistryPage />}
      </main>

      {/* ICR WebRTC Video Call Overlay */}
      <VideoCallModal
        isActive={isCallActive}
        isIncoming={isIncoming}
        localStream={localStream}
        remoteStream={remoteStream}
        callerName={callerName}
        onAnswer={answerCall}
        onEnd={endCall}
      />

      {/* Real-time WebSocket Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Auth Modal for Patient Logins/Registrations */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          const isAdmin = user.email === 'admin@medflow.gov.in';
          const role: UserRole = isAdmin ? 'GOVT_ADMIN' : 'PATIENT';
          setCurrentUser({
            id: user.uid,
            email: user.email,
            full_name: user.displayName || (isAdmin ? 'Government Admin' : 'Patient User'),
            role: role
          });
          setCurrentRole(role);
          setActiveTab(ROLE_DEFAULT_TAB[role]);
        }}
        onSwitchToStaffLogin={() => setActiveTab('login')}
      />

      {/* Hospital Admin Live Editor (Firestore Sync) */}
      <HospitalAdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Interactive Rural USSD / SMS Simulator Modal */}
      <UssdSimulatorModal isOpen={isUssdOpen} onClose={() => setIsUssdOpen(false)} />

      {/* Bhashini Voice Assistant */}
      <VoiceAssistant />

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
