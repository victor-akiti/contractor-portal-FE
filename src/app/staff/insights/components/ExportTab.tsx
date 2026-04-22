'use client';
import { useState } from 'react';
import { downloadExport } from '../api';

type VendorStatus = 'all' | 'approved' | 'in-progress';

export default function ExportTab() {
  const [vendorStatus, setVendorStatus] = useState<VendorStatus>('all');
  const [downloadingVendor, setDownloadingVendor]   = useState(false);
  const [downloadingApproval, setDownloadingApproval] = useState(false);
  const [vendorError, setVendorError]           = useState<string | null>(null);
  const [approvalError, setApprovalError]       = useState<string | null>(null);

  const handleVendorDownload = async () => {
    setDownloadingVendor(true);
    setVendorError(null);
    try {
      await downloadExport(
        `insights/export/vendor-timeline?status=${vendorStatus}`,
        `vendor-timeline-${vendorStatus}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setVendorError('Download failed. Please try again.');
    } finally {
      setDownloadingVendor(false);
    }
  };

  const handleApprovalDownload = async () => {
    setDownloadingApproval(true);
    setApprovalError(null);
    try {
      await downloadExport(
        'insights/export/approval-timeline',
        `approval-timeline-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setApprovalError('Download failed. Please try again.');
    } finally {
      setDownloadingApproval(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 700 }}>
      <p style={{ color: '#6c757d', fontSize: '0.9rem', margin: 0 }}>
        Export detailed reports as Excel files. Downloads are authenticated using your current session.
      </p>

      {/* ── Vendor Timeline ── */}
      <ExportCard
        title="Vendor Timeline Report"
        description="Complete timeline of all vendor registration events — submissions, progressions, returns, approvals, and stage transitions — with timestamps and durations."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>Status filter:</label>
          <select
            value={vendorStatus}
            onChange={e => setVendorStatus(e.target.value as VendorStatus)}
            style={{
              padding: '0.35rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem',
              fontSize: '0.875rem', background: '#fff', cursor: 'pointer',
            }}
          >
            <option value="all">All Vendors</option>
            <option value="approved">Approved Only</option>
            <option value="in-progress">In Progress Only</option>
          </select>
        </div>

        {vendorError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.625rem 1rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            {vendorError}
          </div>
        )}

        <DownloadButton
          onClick={handleVendorDownload}
          loading={downloadingVendor}
          label="Download Vendor Timeline"
        />
      </ExportCard>

      {/* ── Approval Timeline ── */}
      <ExportCard
        title="Approval Timeline Report"
        description="Full log of approver actions across all stages — who approved what, when, response times, and stage-by-stage breakdowns for all vendors in the system."
      >
        {approvalError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.625rem 1rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            {approvalError}
          </div>
        )}

        <DownloadButton
          onClick={handleApprovalDownload}
          loading={downloadingApproval}
          label="Download Approval Timeline"
        />
      </ExportCard>
    </div>
  );
}

function ExportCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div>
        <h3 style={{ margin: '0 0 0.375rem', fontSize: '1.05rem', fontWeight: 600, color: '#343a40' }}>
          📊 {title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6c757d', lineHeight: 1.6 }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function DownloadButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.25rem',
        background: loading ? '#9ca3af' : '#e67509',
        color: '#fff',
        border: 'none',
        borderRadius: '0.375rem',
        fontSize: '0.9rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        alignSelf: 'flex-start',
      }}
    >
      {loading ? (
        <>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Downloading…
        </>
      ) : (
        <>⬇ {label}</>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
