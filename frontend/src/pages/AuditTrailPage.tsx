import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, RefreshCw, Key, Link } from 'lucide-react';
import { AuditLogItem } from '../types';
import { api } from '../api/client';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    is_valid: boolean;
    total_blocks_verified: number;
    last_block_hash: string;
    chain_integrity_status: string;
  } | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(40);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditTrail();
      setVerificationResult(res);
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} style={{ color: '#0d9488' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Blockchain-Style Cryptographic Resource Audit Chain
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Tamper-evident SHA-256 hash chaining preventing bed hoarding, black-marketing, and unauthorized capacity modifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadAuditLogs} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Ledger
          </button>
          <button onClick={handleVerifyChain} className="btn btn-primary btn-sm" disabled={isVerifying}>
            <Lock size={14} /> {isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Chain'}
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div style={{
          background: verificationResult.is_valid ? '#ecfdf5' : '#fff1f2',
          border: `1px solid ${verificationResult.is_valid ? '#a7f3d0' : '#fecdd3'}`,
          borderRadius: '14px', padding: '16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {verificationResult.is_valid ? (
              <CheckCircle2 size={24} style={{ color: '#059669' }} />
            ) : (
              <AlertTriangle size={24} style={{ color: '#e11d48' }} />
            )}
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: verificationResult.is_valid ? '#065f46' : '#9f1239' }}>
                {verificationResult.chain_integrity_status}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Verified {verificationResult.total_blocks_verified} consecutive cryptographic blocks from Genesis.
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569', background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            Latest Hash: {verificationResult.last_block_hash.substring(0, 16)}...
          </div>
        </div>
      )}

      {/* Audit Blocks Table / Explorer */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px' }}>Block #</th>
                <th style={{ padding: '10px' }}>Action & Resource</th>
                <th style={{ padding: '10px' }}>Actor</th>
                <th style={{ padding: '10px' }}>Value Delta</th>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>SHA-256 Hash Chain</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: 800, color: '#0d9488' }}>
                    #{log.id}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.action}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Resource: {log.resource_type}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 600 }}>{log.actor_email}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Role: {log.actor_role}</div>
                  </td>
                  <td style={{ padding: '10px', maxWidth: '240px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                      <strong>New:</strong> {log.new_value || 'N/A'}
                    </div>
                    {log.previous_value && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Prev: {log.previous_value}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px', color: '#64748b' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    <div style={{ color: '#4f46e5' }}>
                      curr: {log.curr_hash.substring(0, 14)}...
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      prev: {log.prev_hash.substring(0, 14)}...
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
