'use client';
import { useCallback, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import SortableTable from './SortableTable';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import { fetchCertificates } from '../api';
import type { CertificatesData } from '../types';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

const EXPIRY_COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#9ca3af'];
const STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#6b7280'];

export default function CertificatesTab() {
  const [data, setData]       = useState<CertificatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCertificates());
    } catch {
      setError('Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusDonut = data
    ? [
        { name: 'Approved', value: data.statusBreakdown.approved },
        { name: 'Pending',  value: data.statusBreakdown.pending },
        { name: 'Rejected', value: data.statusBreakdown.rejected },
      ]
    : [];

  const expiryDonut = data
    ? [
        { name: 'Expired',      value: data.expiryBreakdown.expired },
        { name: 'Expiring Soon', value: data.expiryBreakdown.expiringSoon },
        { name: 'Healthy',      value: data.expiryBreakdown.healthy },
        { name: 'No Expiry',    value: data.expiryBreakdown.noExpiry },
      ]
    : [];

  const reviewerRows = (data?.reviewerPerformance ?? []) as unknown as Record<string, unknown>[];
  const pendingRows  = (data?.pendingByCompany?.slice(0, 10) ?? []) as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Status stat cards ── */}
      {loading ? <CardsSkeleton count={4} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
          <StatCard label="Total Certs"     value={data.statusBreakdown.total}    color="default" />
          <StatCard label="Approved"        value={data.statusBreakdown.approved} color="green" />
          <StatCard label="Pending Review"  value={data.statusBreakdown.pending}  color="amber" />
          <StatCard label="Rejected"        value={data.statusBreakdown.rejected} color="red" />
        </div>
      )}

      {/* ── Key metrics ── */}
      {!loading && !error && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <StatCard label="Approval Rate"          value={fmtPct(data.approvalRate)}     color="green" />
          <StatCard label="Avg Review Days"        value={fmt(data.avgReviewDays)} sub="days" color="blue" />
          <StatCard label="Cos. w/ Pending Certs"  value={data.companiesWithPendingCerts} color="amber" />
          <StatCard label="Critical Expiry"        value={data.summary.criticalExpiry}   color="red" />
          <StatCard label="Expiring Soon"          value={data.summary.expiringSoon}     color="amber" />
        </div>
      )}

      {/* ── Status donut + Expiry donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Section title="Certificate Status">
          {loading ? <ChartSkeleton height={220} /> : error ? null : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {statusDonut.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Expiry Status">
          {loading ? <ChartSkeleton height={220} /> : error ? null : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expiryDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {expiryDonut.map((_, i) => <Cell key={i} fill={EXPIRY_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Pending by company ── */}
      <Section title="Top 10 Companies by Pending Certificates">
        {loading ? <TableSkeleton rows={10} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'companyName', label: 'Company' },
              { key: 'pendingCerts', label: 'Pending Certificates', width: '160px',
                render: (r) => (
                  <span style={{ fontWeight: 600, color: '#d97706' }}>
                    {r.pendingCerts as number}
                  </span>
                )},
            ]}
            rows={pendingRows}
            defaultSortKey="pendingCerts"
            defaultSortDir="desc"
          />
        )}
      </Section>

      {/* ── Reviewer performance ── */}
      <Section title="Reviewer Performance">
        {loading ? <TableSkeleton rows={5} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'name',         label: 'Name' },
              { key: 'role',         label: 'Role', width: '120px' },
              { key: 'approved',     label: 'Approved', width: '90px' },
              { key: 'rejected',     label: 'Rejected', width: '90px' },
              { key: 'total',        label: 'Total', width: '80px' },
              { key: 'avgReviewDays', label: 'Avg Review Days', width: '130px',
                render: (r) => <span>{fmt(r.avgReviewDays as number | null)} days</span> },
            ]}
            rows={reviewerRows}
            defaultSortKey="total"
            defaultSortDir="desc"
          />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#343a40' }}>{title}</h3>
      {children}
    </div>
  );
}
