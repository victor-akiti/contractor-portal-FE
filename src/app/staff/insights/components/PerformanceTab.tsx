'use client';
import { useCallback, useEffect, useState } from 'react';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import SortableTable from './SortableTable';
import { CardsSkeleton, TableSkeleton } from './LoadingSkeleton';
import { fetchPerformance } from '../api';
import type { PerformanceData, Period } from '../types';

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

export default function PerformanceTab({ period }: { period: Period }) {
  const [data, setData]       = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPerformance(period));
    } catch {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

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
          <StatCard label="Total Approvers"      value={data.summary.totalApproversOnRecord} color="default" />
          <StatCard label="Active in Period"     value={data.summary.activeApproversInPeriod} color="blue" />
          <StatCard label="Avg Response Days"    value={fmt(data.summary.systemAvgResponseDays)} sub="days" color="amber" />
          <StatCard label="Bottleneck Stage"     value={data.summary.bottleneckStage ?? '—'} color="red" />
        </div>
      )}

      {/* ── Bottleneck card ── */}
      {!loading && !error && data?.bottleneck && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#dc2626', fontSize: '0.95rem', fontWeight: 600 }}>
            ⚠ Bottleneck: {data.bottleneck.stage}
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            Avg dwell <strong>{fmt(data.bottleneck.avgDwellDays)} days</strong> · {data.bottleneck.currentVendors} vendors currently here
            {data.bottleneck.responsibleRoles?.length > 0 && ` · Roles: ${data.bottleneck.responsibleRoles.join(', ')}`}
          </p>
        </div>
      )}

      {/* ── Approver table ── */}
      <Section title="Approver Performance">
        {loading ? <TableSkeleton rows={6} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'name',            label: 'Name' },
              { key: 'role',            label: 'Role', width: '120px' },
              { key: 'totalActions',    label: 'Total Actions', width: '110px' },
              { key: 'avgResponseDays', label: 'Avg Response', width: '110px',
                render: (r) => <ResponseDaysBadge days={r.avgResponseDays as number | null} /> },
              { key: 'stageBreakdown',  label: 'Stages (A-F)', width: '160px',
                render: (r) => {
                  const s = r.stageBreakdown as { A: number; B: number; C: number; D: number; E: number; F: number };
                  if (!s) return '—';
                  return (
                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      A:{s.A} B:{s.B} C:{s.C} D:{s.D} E:{s.E} F:{s.F}
                    </span>
                  );
                }},
              { key: 'returnsInitiated', label: 'Returns', width: '80px' },
              { key: 'holdsInitiated',   label: 'Holds',   width: '80px' },
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
              { key: 'stage',            label: 'Stage', width: '90px' },
              { key: 'avgDwellDays',     label: 'Avg Dwell (days)', width: '140px',
                render: (r) => <span>{fmt(r.avgDwellDays as number | null)}</span> },
              { key: 'currentVendors',   label: 'Current Vendors', width: '130px' },
              { key: 'responsibleRoles', label: 'Responsible Roles',
                render: (r) => <span style={{ fontSize: '0.8rem' }}>{(r.responsibleRoles as string[])?.join(', ') || '—'}</span> },
            ]}
            rows={stageRows}
            defaultSortKey="avgDwellDays"
            defaultSortDir="desc"
          />
        )}
      </Section>

      {/* ── Pending by stage accordion ── */}
      {!loading && !error && data && (
        <Section title="Pending Vendors by Stage">
          {Object.entries(data.pendingByStage).map(([stageIdx, companies]) => {
            const stageNames = ['Stage A', 'Stage B', 'Stage C', 'Stage D', 'Stage E', 'Stage F'];
            const label = stageNames[Number(stageIdx)] ?? `Stage ${stageIdx}`;
            const isOpen = openStage === stageIdx;
            return (
              <div key={stageIdx} style={{ marginBottom: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '0.375rem' }}>
                <button
                  onClick={() => setOpenStage(isOpen ? null : stageIdx)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', background: '#f8f9fa', border: 'none', cursor: 'pointer',
                    borderRadius: isOpen ? '0.375rem 0.375rem 0 0' : '0.375rem', fontWeight: 600, fontSize: '0.9rem',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                    {companies.length} vendor{companies.length !== 1 ? 's' : ''} {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0.5rem', borderTop: '1px solid #e0e0e0' }}>
                    {companies.length === 0 ? (
                      <p style={{ padding: '0.5rem', color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No vendors</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Company</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Days Waiting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companies.map((c, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{c.companyName}</td>
                              <td style={{
                                padding: '0.5rem 0.75rem', textAlign: 'right',
                                color: c.daysWaiting > 30 ? '#dc2626' : c.daysWaiting > 14 ? '#d97706' : undefined,
                                fontWeight: 500,
                              }}>
                                {c.daysWaiting.toFixed(0)}d
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
