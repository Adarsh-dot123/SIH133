import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { api } from '../api/client';
import { 
  Activity, User as UserIcon, Building2, Landmark, ShieldCheck, 
  Lock, Mail, CheckCircle2, AlertCircle, ArrowRight, 
  KeyRound, Sparkles, HeartHandshake, Eye, EyeOff, UserPlus
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
  const [email, setEmail] = useState<string>('ramesh@patient.in');
  const [password, setPassword] = useState<string>('Patient@123');
  const [abhaId, setAbhaId] = useState<string>('14-8921-4456-7890');
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'ABHA'>('PASSWORD');

  // Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>('General Ward');
  const [regAbhaId, setRegAbhaId] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('PATIENT');
  const [regHospitalId, setRegHospitalId] = useState<number>(1);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick preset fills when switching roles
  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (role === 'PATIENT') {
      setEmail('ramesh@patient.in');
      setPassword('Patient@123');
      setAuthMethod('PASSWORD');
    } else if (role === 'HOSPITAL_STAFF') {
      setEmail('dr.arun@apollo.in');
      setPassword('Doctor@123');
      setAuthMethod('PASSWORD');
    } else if (role === 'GOVT_ADMIN') {
      setEmail('admin@medflow.gov.in');
      setPassword('Admin@123');
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
      const loginId = authMethod === 'ABHA' && selectedRole === 'PATIENT' ? abhaId.trim() : email.trim();
      const res = await api.login(loginId, password);
      onLoginSuccess(res.user, res.user.role as UserRole);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };



  // Perform Registration — saves to DB, then auto-logs in
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
      await api.register({
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        phone: regPhone || undefined,
        department: regDepartment || 'General',
        abha_id: regAbhaId || undefined,
        hospital_id: regRole === 'HOSPITAL_STAFF' ? regHospitalId : null,
      });

      setSuccessMsg(`Account created successfully! Signing you in...`);
      const res = await api.login(regEmail.trim().toLowerCase(), regPassword);
      setTimeout(() => onLoginSuccess(res.user, regRole), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '560px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          background: '#ffffff', padding: '8px 18px', borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '14px'
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <Activity size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Med<span style={{ color: '#0d9488' }}>Flow</span>{' '}
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>India Gateway</span>
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          {isRegistering ? 'Create Your MedFlow Account' : 'Unified Healthcare Portal Login'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
          Real-time bed forecasting, emergency smart referrals, and statewide medical resource command
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: '560px', width: '100%',
        background: '#ffffff', borderRadius: '20px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden'
      }}>
        {/* Role Tabs (login only) */}
        {!isRegistering && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px', gap: '4px' }}>
            {(['PATIENT', 'HOSPITAL_STAFF', 'GOVT_ADMIN'] as UserRole[]).map((role) => {
              const label = role === 'PATIENT' ? 'Patient' : role === 'HOSPITAL_STAFF' ? 'Hospital Staff' : 'Govt Admin';
              const icon = role === 'PATIENT' ? <UserIcon size={15} /> : role === 'HOSPITAL_STAFF' ? <Building2 size={15} /> : <Landmark size={15} />;
              const activeColor = role === 'PATIENT' ? '#0d9488' : role === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed';
              return (
                <button key={role} type="button" onClick={() => handleRoleTabChange(role)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: '10px', border: 'none',
                  background: selectedRole === role ? '#ffffff' : 'transparent',
                  color: selectedRole === role ? activeColor : '#64748b',
                  fontWeight: selectedRole === role ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                  boxShadow: selectedRole === role ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}>
                  {icon}<span>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ padding: '28px' }}>
          {/* Feedback Messages */}
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '18px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /><div>{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#16a34a', padding: '12px 16px', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '18px' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} /><div>{successMsg}</div>
            </div>
          )}

          {/* SIGN IN */}
          {!isRegistering ? (
            <div>
              {selectedRole === 'PATIENT' && (
                <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '18px' }}>
                  {(['PASSWORD', 'ABHA'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setAuthMethod(m)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                      background: authMethod === m ? '#ffffff' : 'transparent',
                      color: authMethod === m ? '#0f172a' : '#64748b',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      boxShadow: authMethod === m ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      {m === 'ABHA' && <Sparkles size={13} />}
                      {m === 'PASSWORD' ? 'Email & Password' : 'ABHA ID (ABDM)'}
                    </button>
                  ))}
                </div>
              )}

              {/* Preset Accounts Bar */}
              <div style={{ marginBottom: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  ⚡ Quick Demo Accounts (Click to Fill)
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: '🏛️ Govt Admin', em: 'admin@medflow.gov.in', pw: 'Admin@123', role: 'GOVT_ADMIN' as UserRole },
                    { label: '👨‍⚕️ Dr. Arun (Cardio)', em: 'dr.arun@apollo.in', pw: 'Doctor@123', role: 'HOSPITAL_STAFF' as UserRole },
                    { label: '👩‍⚕️ Dr. Priya (Pedia)', em: 'dr.priya@fortis.in', pw: 'Doctor@123', role: 'HOSPITAL_STAFF' as UserRole },
                    { label: '👨‍⚕️ Dr. Rajan (Neuro)', em: 'dr.rajan@kamaraj.in', pw: 'Doctor@123', role: 'HOSPITAL_STAFF' as UserRole },
                    { label: '👩‍⚕️ Dr. Meena (Pulmo)', em: 'dr.meena@nehru.in', pw: 'Doctor@123', role: 'HOSPITAL_STAFF' as UserRole },
                    { label: '👨‍⚕️ Dr. Vikram (Nephro)', em: 'dr.vikram@gandhi.in', pw: 'Doctor@123', role: 'HOSPITAL_STAFF' as UserRole },
                    { label: '🧑 Ramesh (Patient)', em: 'ramesh@patient.in', pw: 'Patient@123', role: 'PATIENT' as UserRole },
                    { label: '🧑 Kavya (Patient)', em: 'kavya@patient.in', pw: 'Patient@123', role: 'PATIENT' as UserRole },
                    { label: '🧑 Arjun (Patient)', em: 'arjun@patient.in', pw: 'Patient@123', role: 'PATIENT' as UserRole },
                  ].map((acc) => (
                    <button
                      key={acc.em}
                      type="button"
                      onClick={() => {
                        setSelectedRole(acc.role);
                        setEmail(acc.em);
                        setPassword(acc.pw);
                        setAuthMethod('PASSWORD');
                      }}
                      style={{
                        background: email === acc.em ? '#0d9488' : '#ffffff',
                        color: email === acc.em ? '#ffffff' : '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleLogin}>
                {authMethod === 'ABHA' && selectedRole === 'PATIENT' ? (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Ayushman Bharat Health Account (ABHA ID)</label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" value={abhaId} onChange={(e) => setAbhaId(e.target.value)}
                        placeholder="14-8921-4456-7890"
                        style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                      <ShieldCheck size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#0d9488' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>✓ ABDM M3 sandbox gateway integration</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Registered Email</label>
                      <div style={{ position: 'relative' }}>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@medflow.in" required
                          style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                          style={{ width: '100%', padding: '12px 42px 12px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                  background: selectedRole === 'PATIENT' ? 'linear-gradient(135deg,#0d9488,#0f766e)' : selectedRole === 'HOSPITAL_STAFF' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)', transition: 'all 0.2s ease'
                }}>
                  {loading ? <span>Authenticating...</span> : (
                    <><span>Sign In</span><ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <button type="button" onClick={onContinueAsGuest} style={{
                  background: 'none', border: 'none', color: '#0d9488', fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}>
                  <HeartHandshake size={16} /><span>Emergency Guest Fast-Pass (No Login Required)</span>
                </button>
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => { setIsRegistering(true); setErrorMsg(null); setSuccessMsg(null); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>
                  Create an Account
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION — saves to DB silently */
            <div>
              <form onSubmit={handleRegister}>
                {/* Role selector */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Select Account Role</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {([
                      { role: 'PATIENT', label: 'Patient', ac: '#0d9488', bc: '#f0fdfa' },
                      { role: 'HOSPITAL_STAFF', label: 'Hospital Staff', ac: '#2563eb', bc: '#eff6ff' },
                      { role: 'GOVT_ADMIN', label: 'Govt Admin', ac: '#7c3aed', bc: '#f5f3ff' },
                    ] as { role: UserRole; label: string; ac: string; bc: string }[]).map((r) => (
                      <button key={r.role} type="button" onClick={() => setRegRole(r.role)} style={{
                        flex: 1, padding: '8px 4px', borderRadius: '8px',
                        border: regRole === r.role ? `2px solid ${r.ac}` : '1px solid #cbd5e1',
                        background: regRole === r.role ? r.bc : '#fff',
                        color: regRole === r.role ? r.ac : '#64748b',
                        fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                      }}>{r.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Full Name *</label>
                  <input type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="e.g. Dr. Rajesh Kumar" required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="name@hospital.org" required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Password *</label>
                    <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Phone (optional)</label>
                    <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+91 98400 00000"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {regRole === 'HOSPITAL_STAFF' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Department / Ward</label>
                    <input type="text" value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)} placeholder="e.g. Cardiology, ICU, Emergency"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                )}

                {regRole === 'PATIENT' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      ABHA ID <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                    </label>
                    <input type="text" value={regAbhaId} onChange={(e) => setRegAbhaId(e.target.value)} placeholder="14-XXXX-XXXX-XXXX"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Link your Ayushman Bharat Health Account for ABDM-enabled services</div>
                  </div>
                )}

                {regRole === 'HOSPITAL_STAFF' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Hospital Affiliation</label>
                    <select value={regHospitalId} onChange={(e) => setRegHospitalId(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}>
                      <option value={1}>Apollo Hospitals, Greams Road (Chennai)</option>
                      <option value={2}>Fortis Malar Hospital (Adyar)</option>
                      <option value={3}>MIOT International (Manapakkam)</option>
                      <option value={5}>Rajiv Gandhi Govt General Hospital</option>
                      <option value={7}>Christian Medical College (Vellore)</option>
                    </select>
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#0d9488,#2563eb)', color: '#fff',
                  fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <UserPlus size={18} />
                  <span>{loading ? 'Creating account...' : 'Create Account & Sign In'}</span>
                </button>
              </form>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Already registered?{' '}
                <button type="button" onClick={() => { setIsRegistering(false); setErrorMsg(null); setSuccessMsg(null); }}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 700, cursor: 'pointer' }}>
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security badges */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={15} style={{ color: '#0d9488' }} /><span>ABDM M3 Certified</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={15} style={{ color: '#2563eb' }} /><span>Bcrypt Encrypted Passwords</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><KeyRound size={15} style={{ color: '#7c3aed' }} /><span>Role-Based Access Control</span></div>
      </div>
    </div>
  );
};
