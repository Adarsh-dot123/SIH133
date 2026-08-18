import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import {
  Users, RefreshCw, Search, ShieldCheck, Building2, Landmark,
  User as UserIcon, Wifi, WifiOff, Clock, CheckCircle2
} from 'lucide-react';

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PATIENT:       { label: 'Patient',        color: '#0d9488', bg: '#ccfbf1', icon: <UserIcon size={13} /> },
  HOSPITAL_STAFF:{ label: 'Hospital Staff', color: '#2563eb', bg: '#dbeafe', icon: <Building2 size={13} /> },
  GOVT_ADMIN:    { label: 'Govt Admin',     color: '#7c3aed', bg: '#ede9fe', icon: <Landmark size={13} /> },
};

export const UserRegistryPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [live, setLive] = useState(true);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const prevCountRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getUsers();
      if (Array.isArray(data)) {
        // Highlight newly appeared accounts
        const prevCount = prevCountRef.current;
        if (prevCount > 0 && data.length > prevCount) {
          const added = new Set(data.slice(0, data.length - prevCount).map((u: any) => u.id));
          setNewIds(added);
          setTimeout(() => setNewIds(new Set()), 6000); // clear highlight after 6s
        }
        prevCountRef.current = data.length;
        setUsers(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('User registry fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  // Start / stop live polling
  useEffect(() => {
    fetchUsers();
    if (live) {
      intervalRef.current = setInterval(() => fetchUsers(true), 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.abha_id && u.abha_id.includes(q));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const counts = {
    total: users.length,
    PATIENT: users.filter(u => u.role === 'PATIENT').length,
    HOSPITAL_STAFF: users.filter(u => u.role === 'HOSPITAL_STAFF').length,
    GOVT_ADMIN: users.filter(u => u.role === 'GOVT_ADMIN').length,
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              User Registry
            </h1>
            {/* Live indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: live ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${live ? '#bbf7d0' : '#e2e8f0'}`,
              color: live ? '#16a34a' : '#64748b',
              padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700
            }}>
              {live ? <Wifi size={12} /> : <WifiOff size={12} />}
              {live ? 'LIVE · polls every 5s' : 'PAUSED'}
            </div>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            All accounts registered in <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>medflow.db → users</code> table. New entries appear automatically.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => setLive(l => !l)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: live ? '#fef2f2' : '#f0fdf4',
              color: live ? '#dc2626' : '#16a34a',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {live ? 'Pause Live' : 'Resume Live'}
          </button>
          <button
            onClick={() => fetchUsers()}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: '#fff', color: '#334155',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Accounts', count: counts.total, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
          { label: 'Patients', count: counts.PATIENT, color: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1' },
          { label: 'Hospital Staff', count: counts.HOSPITAL_STAFF, color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
          { label: 'Govt Admins', count: counts.GOVT_ADMIN, color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe' },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '14px 18px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.count}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by name, email, department, ABHA ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              borderRadius: '10px', border: '1px solid #cbd5e1',
              fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none'
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'PATIENT', 'HOSPITAL_STAFF', 'GOVT_ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: roleFilter === r
                  ? (r === 'PATIENT' ? '#0d9488' : r === 'HOSPITAL_STAFF' ? '#2563eb' : r === 'GOVT_ADMIN' ? '#7c3aed' : '#0f172a')
                  : '#f1f5f9',
                color: roleFilter === r ? '#fff' : '#64748b',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {r === 'ALL' ? 'All Roles' : r === 'HOSPITAL_STAFF' ? 'Hospital Staff' : r === 'GOVT_ADMIN' ? 'Govt Admin' : 'Patients'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 1fr 1fr 140px 1fr 90px',
          gap: '12px',
          padding: '10px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          <div>ID</div>
          <div>Name / Email</div>
          <div>Department</div>
          <div>Role</div>
          <div>ABHA ID</div>
          <div>Status</div>
        </div>

        {/* Rows */}
        {loading && users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <div>Loading user registry...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>
            No accounts match your filter.
          </div>
        ) : (
          filtered.map((u, i) => {
            const meta = ROLE_META[u.role] || ROLE_META['PATIENT'];
            const isNew = newIds.has(u.id);
            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 1fr 140px 1fr 90px',
                  gap: '12px',
                  padding: '12px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: isNew ? '#f0fdf4' : 'transparent',
                  transition: 'background 0.3s ease',
                  alignItems: 'center'
                }}
              >
                {/* ID */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>#{u.id}</div>

                {/* Name / Email */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.8rem'
                    }}>
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {u.full_name}
                        {isNew && <span style={{ fontSize: '0.6rem', background: '#22c55e', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>NEW</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{u.email}</div>
                    </div>
                  </div>
                </div>

                {/* Department */}
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>{u.department || '—'}</div>

                {/* Role Badge */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: meta.bg, color: meta.color,
                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                  }}>
                    {meta.icon}{meta.label}
                  </span>
                </div>

                {/* ABHA ID */}
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {u.abha_id || <span style={{ color: '#cbd5e1' }}>—</span>}
                </div>

                {/* Active status */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: u.is_active ? '#f0fdf4' : '#fef2f2',
                    color: u.is_active ? '#16a34a' : '#dc2626',
                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                  }}>
                    <CheckCircle2 size={11} />
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
        <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
        Passwords are stored as Bcrypt-salted hashes — never in plain text · Accessible to GOVT_ADMIN only
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
