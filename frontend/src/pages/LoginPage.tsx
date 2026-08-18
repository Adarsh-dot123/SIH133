import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { api } from '../api/client';
import { 
  Activity, User as UserIcon, Building2, Landmark, ShieldCheck, 
  Lock, Mail, Phone, CheckCircle2, AlertCircle, ArrowRight, 
  KeyRound, Sparkles, HeartHandshake, Eye, EyeOff, UserPlus,
  Database, RefreshCw, Search
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, role: UserRole) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onContinueAsGuest }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('PATIENT');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Login form state
  const [email, setEmail] = useState<string>('patient@medflow.in');
  const [password, setPassword] = useState<string>('patient123');
  const [abhaId, setAbhaId] = useState<string>('14-8921-4456-7890');
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'ABHA'>('PASSWORD');
  
  // Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>('General Ward');
  const [regDesignation, setRegDesignation] = useState<string>('Staff');
  const [regAbhaId, setRegAbhaId] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('PATIENT');
  const [regHospitalId, setRegHospitalId] = useState<number>(1);

  // Database Users Directory state
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [justRegisteredEmail, setJustRegisteredEmail] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDatabaseUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await api.getUsers();
      if (Array.isArray(users)) {
        setDbUsers(users);
      }
    } catch (e) {
      console.warn('Could not fetch DB users directory', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchDatabaseUsers();
  }, []);

  // Quick preset fills when switching roles
  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (role === 'PATIENT') {
      setEmail('patient@medflow.in');
      setPassword('patient123');
      setAuthMethod('PASSWORD');
    } else if (role === 'HOSPITAL_STAFF') {
      setEmail('staff@medflow.in');
      setPassword('staff123');
      setAuthMethod('PASSWORD');
    } else if (role === 'GOVT_ADMIN') {
      setEmail('admin@medflow.in');
      setPassword('admin123');
      setAuthMethod('PASSWORD');
    }
  };

  // Perform Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authMethod === 'ABHA' && selectedRole === 'PATIENT') {
        const res = await api.login(abhaId.trim(), password);
        setSuccessMsg(`ABHA ID ${abhaId} verified! Authenticated via ABDM gateway.`);
        setTimeout(() => {
          onLoginSuccess(res.user, 'PATIENT');
        }, 600);
        return;
      }

      const res = await api.login(email.trim(), password);
      setSuccessMsg(`Welcome back, ${res.user.full_name}!`);
      setTimeout(() => {
        onLoginSuccess(res.user, res.user.role as UserRole);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Demo Login for Judges/Users
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string, demoRole: UserRole) => {
    setSelectedRole(demoRole);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.login(demoEmail, demoPass);
      setSuccessMsg(`Instant Login as ${res.user.full_name} (${demoRole})`);
      setTimeout(() => {
        onLoginSuccess(res.user, demoRole);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  // Perform Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const newUser = await api.register({
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        phone: regPhone || undefined,
        department: regDepartment || (regRole === 'PATIENT' ? 'General Patient' : 'Ward Staff'),
        designation: regDesignation || (regRole === 'PATIENT' ? 'Beneficiary' : 'Doctor / Staff'),
        abha_id: regAbhaId || undefined,
        hospital_id: regRole === 'HOSPITAL_STAFF' ? regHospitalId : null,
      });

      setJustRegisteredEmail(newUser.email);
      setSuccessMsg(`Account created and stored in medflow.db! Logging you in as ${newUser.full_name}...`);
      
      // Refresh database directory
      await fetchDatabaseUsers();

      // Automatically log in with new credentials
      const res = await api.login(regEmail.trim().toLowerCase(), regPassword);
      setTimeout(() => {
        onLoginSuccess(res.user, regRole);
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Email or ABHA ID might already exist.');
    } finally {
      setLoading(false);
    }
  };

  // Select user from DB directory to auto-populate form
  const handleSelectFromDirectory = (user: any) => {
    setSelectedRole(user.role as UserRole);
    setEmail(user.email);
    setPassword('patient123'); // Default preset password for seeded, or user enters their password
    setIsRegistering(false);
    setErrorMsg(null);
    setSuccessMsg(`Selected account: ${user.full_name} (${user.role}). Password field ready.`);
  };

  const filteredDbUsers = dbUsers.filter((u) => {
    if (!searchUser) return true;
    const q = searchUser.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.abha_id && u.abha_id.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '600px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          background: '#ffffff',
          padding: '8px 18px',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: '14px'
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <Activity size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Med<span style={{ color: '#0d9488' }}>Flow</span> <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>India Gateway</span>
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          {isRegistering ? 'Create Your MedFlow Account' : 'Unified Healthcare Portal Login'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
          Real-time bed forecasting, emergency smart referrals, and statewide medical resource command
        </p>
      </div>

      {/* 1-Click Fast Demo Cards for Quick Evaluation */}
      {!isRegistering && (
        <div style={{
          maxWidth: '860px',
          width: '100%',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Patient */}
          <div 
            onClick={() => handleQuickDemoLogin('patient@medflow.in', 'patient123', 'PATIENT')}
            style={{
              background: '#ffffff',
              border: selectedRole === 'PATIENT' ? '2px solid #0d9488' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#ccfbf1', color: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <UserIcon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Patient / Family</span>
                <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>1-CLICK</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Rohan Sharma • Live Search
              </div>
            </div>
          </div>

          {/* Card 2: Hospital Staff */}
          <div 
            onClick={() => handleQuickDemoLogin('staff@medflow.in', 'staff123', 'HOSPITAL_STAFF')}
            style={{
              background: '#ffffff',
              border: selectedRole === 'HOSPITAL_STAFF' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#dbeafe', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Building2 size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Hospital Staff</span>
                <span style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>1-CLICK</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Dr. Priya Selvam • Apollo Greams
              </div>
            </div>
          </div>

          {/* Card 3: Govt Admin */}
          <div 
            onClick={() => handleQuickDemoLogin('admin@medflow.in', 'admin123', 'GOVT_ADMIN')}
            style={{
              background: '#ffffff',
              border: selectedRole === 'GOVT_ADMIN' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#ede9fe', color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Landmark size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Govt / District</span>
                <span style={{ fontSize: '0.65rem', background: '#f5f3ff', color: '#7c3aed', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>1-CLICK</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Dr. Radhakrishnan • State Command
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Login & Registration Card */}
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '28px'
      }}>
        {/* Role Selector Tabs */}
        {!isRegistering && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '6px'
          }}>
            <button
              type="button"
              onClick={() => handleRoleTabChange('PATIENT')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 10px',
                borderRadius: '12px',
                border: 'none',
                background: selectedRole === 'PATIENT' ? '#ffffff' : 'transparent',
                color: selectedRole === 'PATIENT' ? '#0d9488' : '#64748b',
                fontWeight: selectedRole === 'PATIENT' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: selectedRole === 'PATIENT' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <UserIcon size={16} />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('HOSPITAL_STAFF')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 10px',
                borderRadius: '12px',
                border: 'none',
                background: selectedRole === 'HOSPITAL_STAFF' ? '#ffffff' : 'transparent',
                color: selectedRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#64748b',
                fontWeight: selectedRole === 'HOSPITAL_STAFF' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: selectedRole === 'HOSPITAL_STAFF' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={16} />
              <span>Hospital Staff</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('GOVT_ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 10px',
                borderRadius: '12px',
                border: 'none',
                background: selectedRole === 'GOVT_ADMIN' ? '#ffffff' : 'transparent',
                color: selectedRole === 'GOVT_ADMIN' ? '#7c3aed' : '#64748b',
                fontWeight: selectedRole === 'GOVT_ADMIN' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: selectedRole === 'GOVT_ADMIN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Landmark size={16} />
              <span>Govt Admin</span>
            </button>
          </div>
        )}

        <div style={{ padding: '28px' }}>
          {/* Status Feedback Messages */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              marginBottom: '18px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f0fdf4',
              border: '1px solid #dcfce7',
              color: '#16a34a',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {!isRegistering ? (
            <div>
              {/* Patient ABHA vs Email toggle */}
              {selectedRole === 'PATIENT' && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '10px',
                  marginBottom: '18px'
                }}>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('PASSWORD')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: authMethod === 'PASSWORD' ? '#ffffff' : 'transparent',
                      color: authMethod === 'PASSWORD' ? '#0f172a' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: authMethod === 'PASSWORD' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Email & Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('ABHA')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: authMethod === 'ABHA' ? '#ffffff' : 'transparent',
                      color: authMethod === 'ABHA' ? '#0d9488' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: authMethod === 'ABHA' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <Sparkles size={14} /> ABHA ID (ABDM)
                  </button>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin}>
                {authMethod === 'ABHA' && selectedRole === 'PATIENT' ? (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Ayushman Bharat Health Account (ABHA ID)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={abhaId}
                        onChange={(e) => setAbhaId(e.target.value)}
                        placeholder="e.g. 14-8921-4456-7890"
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.95rem',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                      <ShieldCheck size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#0d9488' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                      ✓ Verified ABDM M3 sandbox gateway integration
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Registered Email
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@medflow.in"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.95rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                          Password
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>
                          Demo default: {selectedRole === 'PATIENT' ? 'patient123' : selectedRole === 'HOSPITAL_STAFF' ? 'staff123' : 'admin123'}
                        </span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 42px 12px 42px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.95rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute', right: '14px', top: '14px',
                            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8'
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    border: 'none',
                    background: selectedRole === 'PATIENT' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : selectedRole === 'HOSPITAL_STAFF' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to {selectedRole === 'PATIENT' ? 'Patient Portal' : selectedRole === 'HOSPITAL_STAFF' ? 'Hospital Dashboard' : 'State Command'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Fast Emergency Bypass / Guest Access */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0d9488',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <HeartHandshake size={16} />
                  <span>Emergency Guest Fast-Pass (No Login Required)</span>
                </button>
              </div>

              {/* Toggle to Register */}
              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setErrorMsg(null); setSuccessMsg(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Create an Account
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION VIEW */
            <div>
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Select Account Role
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegRole('PATIENT')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: regRole === 'PATIENT' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                        background: regRole === 'PATIENT' ? '#f0fdfa' : '#ffffff', color: regRole === 'PATIENT' ? '#0d9488' : '#64748b',
                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('HOSPITAL_STAFF')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: regRole === 'HOSPITAL_STAFF' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: regRole === 'HOSPITAL_STAFF' ? '#eff6ff' : '#ffffff', color: regRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#64748b',
                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Hospital Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('GOVT_ADMIN')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: regRole === 'GOVT_ADMIN' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                        background: regRole === 'GOVT_ADMIN' ? '#f5f3ff' : '#ffffff', color: regRole === 'GOVT_ADMIN' ? '#7c3aed' : '#64748b',
                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Govt Admin
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar / Ananya Rao"
                    required
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@hospital.org"
                    required
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98400 00000"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Department / Ward
                    </label>
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="e.g. Cardiology / General"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      ABHA 14-digit ID
                    </label>
                    <input
                      type="text"
                      value={regAbhaId}
                      onChange={(e) => setRegAbhaId(e.target.value)}
                      placeholder="14-XXXX-XXXX-XXXX"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {regRole === 'HOSPITAL_STAFF' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Hospital Affiliation
                    </label>
                    <select
                      value={regHospitalId}
                      onChange={(e) => setRegHospitalId(Number(e.target.value))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box'
                      }}
                    >
                      <option value={1}>Apollo Hospitals, Greams Road (Chennai)</option>
                      <option value={2}>Fortis Malar Hospital (Adyar)</option>
                      <option value={3}>MIOT International (Manapakkam)</option>
                      <option value={5}>Rajiv Gandhi Govt General Hospital (RGGGH)</option>
                      <option value={7}>Christian Medical College & Hospital (Vellore)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #0d9488, #2563eb)', color: '#fff',
                    fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <UserPlus size={18} />
                  <span>{loading ? 'Registering...' : 'Save to Database & Sign In'}</span>
                </button>
              </form>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setErrorMsg(null); setSuccessMsg(null); }}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 700, cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE REGISTERED ACCOUNTS DIRECTORY IN DATABASE */}
      <div style={{
        maxWidth: '860px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: '#ecfdf5', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                Live Database User Directory ({dbUsers.length} Accounts Stored in medflow.db)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                All registered accounts are permanently persisted in SQLite with Bcrypt hashes
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search registered accounts..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
            </div>

            <button
              onClick={fetchDatabaseUsers}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
              title="Refresh database records"
            >
              <RefreshCw size={13} className={loadingUsers ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* User Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredDbUsers.map((u) => {
            const isJustRegistered = justRegisteredEmail === u.email;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectFromDirectory(u)}
                style={{
                  background: isJustRegistered ? '#f0fdf4' : '#f8fafc',
                  border: isJustRegistered ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                title="Click to select this account for login"
              >
                {isJustRegistered && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '8px',
                    fontSize: '0.6rem', background: '#22c55e', color: '#fff',
                    padding: '1px 5px', borderRadius: '4px', fontWeight: 800
                  }}>
                    NEW
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: u.role === 'PATIENT' ? '#ccfbf1' : u.role === 'HOSPITAL_STAFF' ? '#dbeafe' : '#ede9fe',
                    color: u.role === 'PATIENT' ? '#0d9488' : u.role === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed'
                  }}>
                    {u.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.full_name}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace', marginBottom: '2px' }}>
                  {u.email}
                </div>

                <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{u.department || 'General'}</span>
                  {u.abha_id && <span>ABHA: {u.abha_id.slice(-8)}</span>}
                </div>
              </div>
            );
          })}

          {filteredDbUsers.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
              No user accounts found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Security & Compliance Footer Badges */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'wrap',
        color: '#64748b',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} style={{ color: '#0d9488' }} />
          <span>ABDM M3 Certified Gateway</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={16} style={{ color: '#2563eb' }} />
          <span>256-Bit Cryptographic JWT Sessions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <KeyRound size={16} style={{ color: '#7c3aed' }} />
          <span>Role-Based Granular Access Control</span>
        </div>
      </div>
    </div>
  );
};
