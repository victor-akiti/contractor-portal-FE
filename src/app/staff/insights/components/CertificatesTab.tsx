'use client';
import { useCallback, useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchCertificates } from '../api';
import type { CertificatesData, DateRange, Period } from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import SortableTable from './SortableTable';
import StatCard from './StatCard';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

const EXPIRY_COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#9ca3af'];
const STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#6b7280'];
const HEALTH_COLORS = ['#16a34a', '#f59e0b', '#dc2626'];

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

export default function CertificatesTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [data, setData] = useState<CertificatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCertificates(period, dateRange));
    } catch {
      setError('Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => { load(); }, [load]);

  const statusDonut = data
    ? [
      { name: 'Approved (period)', value: data.statusBreakdown.approvedInPeriod },
      { name: 'Pending Review', value: data.statusBreakdown.pending },
      { name: 'Rejected (period)', value: data.statusBreakdown.rejectedInPeriod },
    ]
    : [];

  const expiryDonut = data
    ? [
      { name: 'Expired', value: data.expiryBreakdown.expired },
      { name: 'Expiring Soon', value: data.expiryBreakdown.expiringSoon },
      { name: 'Healthy', value: data.expiryBreakdown.healthy },
      { name: 'No Expiry', value: data.expiryBreakdown.noExpiry },
    ]
    : [];

  const healthDonut = data
    ? [
      { name: 'Healthy', value: data.expiryBreakdown.healthy },
      { name: 'Expiring Soon', value: data.expiryBreakdown.expiringSoon },
      { name: 'Expired', value: data.expiryBreakdown.expired },
    ]
    : [];

  const reviewerRows = (data?.reviewerPerformance ?? []) as unknown as Record<string, unknown>[];
  const pendingRows = (data?.pendingByCompany?.slice(0, 10) ?? []) as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Period: <strong style={{ color: '#343a40' }}>{period}</strong></span>
        <button onClick={load} style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Stat cards — grouped: total → breakdown ── */}
      {loading ? <CardsSkeleton count={8} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* Group 1: review status */}
          {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            <StatCard label="Total Certs Tracked" value={data.statusBreakdown.totalTracked}      color="default" />
            <StatCard label="Approved (period)"   value={data.statusBreakdown.approvedInPeriod}  color="green" />
            <StatCard label="Pending Review"      value={data.statusBreakdown.pending}           color="amber" />
            <StatCard label="Rejected (period)"   value={data.statusBreakdown.rejectedInPeriod}  color="red" />
          </div> */}

          {/* <CardDivider /> */}

          {/* Group 2: health / expiry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            <StatCard label="Total Certs Tracked" value={data.statusBreakdown.totalTracked} color="default" />
            <StatCard label="No Expiry" value={data.expiryBreakdown.noExpiry} color="default" />
            <StatCard label="Healthy" value={data.expiryBreakdown.healthy} color="green" />
            <StatCard label="Expiring Soon" value={data.expiryBreakdown.expiringSoon} color="amber" />
            <StatCard label="Expired" value={data.expiryBreakdown.expired} color="red" />
          </div>

          <CardDivider />

          {/* Group 3: performance metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            <StatCard label="Approval Rate" value={fmtPct(data.approvalRate)} color="green" />
            <StatCard label="Avg Review Days" value={fmt(data.avgReviewDays)} sub="days" color="blue" />
            <StatCard label="Reviewed in Period" value={data.summary.reviewedInPeriod} color="blue" />
            <StatCard label="Contractors with Pending Reviews" value={data.companiesWithPendingCerts} color="amber" />
            {/* <StatCard label="Critical Expiry" value={data.summary.criticalExpiry} color="red" /> */}
          </div>
        </div>
      )}

      {/* ── Certificate Health section ── */}
      {!loading && !error && data && (
        <Section title="Certificate Health">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Health rate progress bar */}
            {data.summary.healthRate != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>Health Rate</span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: data.summary.healthRate >= 70 ? '#16a34a' : data.summary.healthRate >= 50 ? '#d97706' : '#dc2626',
                    }}>
                      {data.summary.healthRate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(data.summary.healthRate, 100)}%`,
                      background: data.summary.healthRate >= 70 ? '#16a34a' : data.summary.healthRate >= 50 ? '#d97706' : '#dc2626',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Healthy', value: data.expiryBreakdown.healthy, color: '#16a34a' },
                    { label: 'Expiring Soon', value: data.expiryBreakdown.expiringSoon, color: '#d97706' },
                    { label: 'Expired', value: data.expiryBreakdown.expired, color: '#dc2626' },
                    { label: 'No Expiry', value: data.expiryBreakdown.noExpiry, color: '#9ca3af' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Health donut */}
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={healthDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {healthDonut.map((_, i) => <Cell key={i} fill={HEALTH_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* ── Review status donut + Expiry donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Section title="Review Status">
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

        <Section title="Expiry Breakdown">
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

      {/* ── Pending by contractor ── */}
      <Section title="Top 10 Contractors by Pending Certificates">
        {loading ? <TableSkeleton rows={10} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'companyName', label: 'Contractor' },
              {
                key: 'pendingCerts', label: 'Pending Certificates', width: '180px',
                render: (r) => (
                  <span style={{ fontWeight: 600, color: '#d97706' }}>
                    {r.pendingCerts as number}
                  </span>
                )
              },
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
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role', width: '120px' },
              { key: 'approved', label: 'Approved', width: '90px' },
              { key: 'rejected', label: 'Rejected', width: '90px' },
              { key: 'total', label: 'Total', width: '80px' },
              {
                key: 'avgReviewDays', label: 'Avg Review Days', width: '130px',
                render: (r) => <span>{fmt(r.avgReviewDays as number | null)} days</span>
              },
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
