'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchPerformance } from '../api';
import type { DateRange, PerformanceData, Period } from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, TableSkeleton } from './LoadingSkeleton';
import SortableTable from './SortableTable';
import StatCard from './StatCard';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));

function ResponseDaysBadge({ days }: { days: number | null | undefined }) {
  if (days == null) return <span style={{ color: '#9ca3af' }}>—</span>;
  const color = days < 3 ? '#16a34a' : days <= 7 ? '#d97706' : '#dc2626';
  const bg    = days < 3 ? '#f0fdf4' : days <= 7 ? '#fffbeb' : '#fef2f2';
  return (
    <span style={{ background: bg, color, borderRadius: '9999px', padding: '0.2rem 0.6rem', fontWeight: 600, fontSize: '0.8rem' }}>
      {days.toFixed(1)}d
    </span>
  );
}

function DwellBadge({ days, label }: { days: number | null | undefined; label: string }) {
  if (days == null) return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
  const color = days < 7 ? '#16a34a' : days <= 21 ? '#d97706' : '#dc2626';
  return (
    <span style={{ fontSize: '0.8rem' }}>
      <span style={{ color, fontWeight: 600 }}>{days.toFixed(1)}d</span>
      <span style={{ color: '#9ca3af', fontSize: '0.72rem', marginLeft: '0.2rem' }}>{label}</span>
    </span>
  );
}

export default function PerformanceTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [data, setData]         = useState<PerformanceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPerformance(period, dateRange));
    } catch {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => { load(); }, [load]);

  const bottleneckEntry = data?.bottleneck
    ? (data.byStage.find(s => s.stage === data.bottleneck!.stage) ?? data.bottleneck)
    : null;

  const approverRows = (data?.byApprover ?? []) as unknown as Record<string, unknown>[];
  const stageRows    = (data?.byStage ?? [])    as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Period: <strong style={{ color: '#343a40' }}>{period}</strong></span>
        <button onClick={load} style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary strip ── */}
      {loading ? <CardsSkeleton count={4} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <StatCard label="Total Approvers"   value={data.summary.totalApproversInPeriod}   color="default" />
          <StatCard label="Active in Period"  value={data.summary.activeApproversInPeriod}  color="blue" />
          <StatCard label="Avg Response Days" value={fmt(data.summary.systemAvgResponseDays)} sub="days" color="amber" />
          <StatCard label="Bottleneck Stage"  value={data.summary.bottleneckStage ?? '—'}   color="red" />
        </div>
      )}

      {/* ── Bottleneck card ── */}
      {!loading && !error && bottleneckEntry && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#dc2626', fontSize: '0.95rem', fontWeight: 600 }}>
            ⚠ Bottleneck: {bottleneckEntry.stage}
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            Current dwell <strong>{fmt(bottleneckEntry.avgCurrentDwellDays)} days</strong>
            {bottleneckEntry.avgCompletionDwellDays != null && (
              <> · Hist. completion avg <strong>{fmt(bottleneckEntry.avgCompletionDwellDays)} days</strong></>
            )}
            {' '}· {bottleneckEntry.currentVendors} contractors here now
            {bottleneckEntry.responsibleRoles?.length > 0 && ` · Roles: ${bottleneckEntry.responsibleRoles.join(', ')}`}
          </p>
        </div>
      )}

      {/* ── Approver table ── */}
      <Section title={`Approver Performance (${period})`}>
        {loading ? <TableSkeleton rows={6} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'name',            label: 'Name' },
              { key: 'role',            label: 'Role', width: '120px' },
              { key: 'totalActions',    label: 'Total Actions', width: '110px' },
              { key: 'avgResponseDays', label: 'Avg Response', width: '110px',
                render: (r) => <ResponseDaysBadge days={r.avgResponseDays as number | null} /> },
              { key: 'stageBreakdown',  label: 'Stages (B–G)', width: '180px',
                render: (r) => {
                  const s = r.stageBreakdown as { B: number; C: number; D: number; E: number; F: number; G: number };
                  if (!s) return '—';
                  return (
                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      B:{s.B} C:{s.C} D:{s.D} E:{s.E} F:{s.F} G:{s.G}
                    </span>
                  );
                }},
              { key: 'returnsInitiated', label: 'Returns to Contractor', width: '150px' },
              { key: 'holdsInitiated',   label: 'Parked',                width: '90px' },
            ]}
            rows={approverRows}
            defaultSortKey="totalActions"
            defaultSortDir="desc"
          />
        )}
      </Section>

      {/* ── Stage load table ── */}
      <Section title="Stage Load">
        {loading ? <TableSkeleton rows={6} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'stage',                label: 'Stage',              width: '90px' },
              { key: 'avgCurrentDwellDays',  label: 'Current Dwell',      width: '130px',
                render: (r) => <DwellBadge days={r.avgCurrentDwellDays as number | null} label="now" /> },
              { key: 'avgCompletionDwellDays', label: 'Historical Avg',   width: '130px',
                render: (r) => <DwellBadge days={r.avgCompletionDwellDays as number | null} label="hist." /> },
              { key: 'currentVendors',       label: 'Contractors Here',   width: '130px' },
              { key: 'responsibleRoles',     label: 'Responsible Roles',
                render: (r) => <span style={{ fontSize: '0.8rem' }}>{(r.responsibleRoles as string[])?.join(', ') || '—'}</span> },
            ]}
            rows={stageRows}
            defaultSortKey="avgCurrentDwellDays"
            defaultSortDir="desc"
          />
        )}
      </Section>

      {/* ── Pending by stage accordion — keys are now "Stage B", "Stage C", etc. ── */}
      {!loading && !error && data && (
        <Section title="Pending Contractors by Stage">
          {Object.entries(data.pendingByStage).map(([stageLabel, companies]) => {
            const isOpen = openStage === stageLabel;
            return (
              <div key={stageLabel} style={{ marginBottom: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '0.375rem' }}>
                <button
                  onClick={() => setOpenStage(isOpen ? null : stageLabel)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', background: '#f8f9fa', border: 'none', cursor: 'pointer',
                    borderRadius: isOpen ? '0.375rem 0.375rem 0 0' : '0.375rem', fontWeight: 600, fontSize: '0.9rem',
                  }}
                >
                  <span>{stageLabel}</span>
                  <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                    {companies.length} contractor{companies.length !== 1 ? 's' : ''} {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0.5rem', borderTop: '1px solid #e0e0e0' }}>
                    {companies.length === 0 ? (
                      <p style={{ padding: '0.5rem', color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No contractors</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Contractor</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Days Waiting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companies.map((c, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{c.companyName}</td>
                              <td style={{
                                padding: '0.5rem 0.75rem', textAlign: 'right',
                                color: c.daysWaiting != null && c.daysWaiting > 30 ? '#dc2626' : c.daysWaiting != null && c.daysWaiting > 14 ? '#d97706' : undefined,
                                fontWeight: 500,
                              }}>
                                {c.daysWaiting != null ? `${c.daysWaiting.toFixed(0)}d` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}
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
