'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchPipeline } from '../api';
import type { DateRange, Period, PipelineData, PriorityVendors } from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import SortableTable from './SortableTable';
import StatCard from './StatCard';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STAGE_COLORS = ['#e67509', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626', '#6b7280', '#0891b2', '#f97316', '#84cc16'];

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

export default function PipelineTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [data, setData]       = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPipeline(period, dateRange));
    } catch (err) {
      console.error('[PipelineTab] fetch error', err);
      setError('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => { load(); }, [load]);

  // Stage distribution bar chart data
  const stageCounts = data
    ? [
        { name: 'Stage A',                   value: data.stageCounts.stageA },
        { name: 'Stage B',                   value: data.stageCounts.stageB },
        { name: 'Stage C',                   value: data.stageCounts.stageC },
        { name: 'Stage D',                   value: data.stageCounts.stageD },
        { name: 'Stage E',                   value: data.stageCounts.stageE },
        { name: 'Stage F',                   value: data.stageCounts.stageF },
        { name: 'Stage G',                   value: data.stageCounts.stageG },
        { name: 'Returned to Contractor',    value: data.stageCounts.returned },
        { name: 'Parked / Completed L2',     value: data.stageCounts.parked },
        { name: 'L3',                        value: data.stageCounts.l3 },
      ]
    : [];

  // Current-wait dwell (vendors waiting right now)
  const dwellData = (data?.avgDwellPerReviewStage ?? []).map(d => ({
    stage: d.stage,
    days: d.avgDays ?? 0,
    actual: d.avgDays,
    vendors: d.vendorCount,
  }));

  // Historical completion dwell (how long each stage took)
  const completionDwellData = (data?.avgCompletionDwellPerStage ?? []).map(d => ({
    stage: d.stage,
    days: d.avgDays ?? 0,
    actual: d.avgDays,
    samples: d.sampleSize,
  }));

  // Oldest pending per stage — API returns Record<stageName, { companyName, daysWaiting } | null>
  const oldestRows = Object.entries(data?.oldestPendingPerStage ?? {})
    .filter((entry): entry is [string, { companyName: string; daysWaiting: number | null }] => entry[1] != null)
    .map(([stage, v]) => ({ stage, companyName: v.companyName, daysWaiting: v.daysWaiting }))
    as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Period: <strong style={{ color: '#343a40' }}>{period}</strong></span>
        <button onClick={load} style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Current pipeline snapshot (live, not period-filtered) ── */}
      {loading ? <CardsSkeleton count={10} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Current Pipeline Snapshot
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Stage A"                   value={data.stageCounts.stageA}   color="default" />
            <StatCard label="Stage B"                   value={data.stageCounts.stageB}   color="blue" />
            <StatCard label="Stage C"                   value={data.stageCounts.stageC}   color="green" />
            <StatCard label="Stage D"                   value={data.stageCounts.stageD}   color="purple" />
            <StatCard label="Stage E"                   value={data.stageCounts.stageE}   color="amber" />
            <StatCard label="Stage F"                   value={data.stageCounts.stageF}   color="red" />
            <StatCard label="Stage G"                   value={data.stageCounts.stageG}   color="default" />
            <StatCard label="Returned to Contractor"    value={data.stageCounts.returned} color="amber" />
            <StatCard label="Parked / Completed L2"     value={data.stageCounts.parked}   color="red" />
            <StatCard label="L3 / Approved"             value={data.stageCounts.l3}       color="green" />
          </div>
        </div>
      )}

      {/* ── Stage bar chart ── */}
      <Section title="Stage Distribution (current)">
        {loading ? <ChartSkeleton height={220} /> : error ? null : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageCounts} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Contractors" radius={[4, 4, 0, 0]}>
                {stageCounts.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Period throughput ── */}
      {!loading && !error && data && (
        <Section title={`Period Throughput (${data.throughput.period})`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <StatCard label="Stage Progressions" value={data.throughput.periodProgressions} color="blue" />
            <StatCard label="L3 Approvals"       value={data.throughput.periodL3Approvals}  color="green" />
          </div>
        </Section>
      )}

      {/* ── Dwell charts side-by-side: current wait vs historical completion ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Section title="Avg Wait Per Stage (current vendors)">
          {loading ? <ChartSkeleton height={220} /> : error ? null : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dwellData} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 70 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(v: number, _: string, props: { payload?: { actual?: number | null; vendors?: number } }) => [
                    props.payload?.actual == null ? '—' : `${v.toFixed(1)} days`,
                    `Avg Wait (${props.payload?.vendors ?? '?'} contractors)`,
                  ]}
                />
                <Bar dataKey="days" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Avg Completion Time Per Stage (historical)">
          {loading ? <ChartSkeleton height={220} /> : error ? null : completionDwellData.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No historical data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={completionDwellData} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 70 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(v: number, _: string, props: { payload?: { actual?: number | null; samples?: number } }) => [
                    props.payload?.actual == null ? '—' : `${v.toFixed(1)} days`,
                    `Avg Completion (n=${props.payload?.samples ?? '?'})`,
                  ]}
                />
                <Bar dataKey="days" fill="#e67509" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Bottleneck ── */}
      {!loading && !error && data?.bottleneck && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 0.4rem', color: '#dc2626', fontSize: '0.95rem', fontWeight: 600 }}>
            ⚠ Bottleneck: {data.bottleneck.stage}
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            Avg <strong>{fmt(data.bottleneck.avgDays)} days</strong> to clear this stage
          </p>
        </div>
      )}

      {/* ── Park stats ── */}
      {!loading && !error && data && (
        <Section title="Park / Hold Statistics">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Current
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Currently Parked" value={data.parkStats.currentlyParked} color="red" />
            </div>
            <CardDivider />
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Period ({data.throughput.period})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Park Requests"  value={data.parkStats.periodRequests}  color="amber" />
              <StatCard label="Park Approved"  value={data.parkStats.periodApproved}  color="green" />
              <StatCard label="Approval Rate"  value={fmtPct(data.parkStats.approvalRate)} color="blue" />
            </div>
          </div>
        </Section>
      )}

      {/* ── Totals summary (fixed counts — not period-filtered) ── */}
      {!loading && !error && data && (
        <Section title="Account Summary">
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
            All-time totals — not filtered by the selected period.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="All Contractor Accounts" value={data.summary.totalActiveAccounts} color="default" />
              <StatCard label="Registered"              value={data.summary.totalRegistered}     color="blue" />
              <StatCard label="Not Yet Submitted"       value={data.summary.notSubmitted}        color="default" />
            </div>
            <CardDivider />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Within Amni Review"      value={data.summary.totalInPipeline}    color="blue" />
              <StatCard label="Returned to Contractor"  value={data.summary.returned}           color="amber" />
              <StatCard label="Completion Rate"         value={fmtPct(data.summary.completionRate)} color="green" />
              <StatCard label="Avg Cycle Days"          value={fmt(data.summary.avgCycleDays)} sub="days" color="amber" />
            </div>
          </div>
        </Section>
      )}

      {/* ── Priority Fast-Track ── */}
      {!loading && !error && data?.priorityVendors && data.priorityVendors.total > 0 && (
        <PipelinePriorityCard pv={data.priorityVendors} />
      )}

      {/* ── Oldest pending per stage ── */}
      <Section title="Oldest Pending Per Stage">
        {loading ? <TableSkeleton rows={6} /> : error ? null : oldestRows.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No pending contractors</p>
        ) : (
          <SortableTable
            columns={[
              { key: 'stage',       label: 'Stage',        width: '100px' },
              { key: 'companyName', label: 'Contractor' },
              { key: 'daysWaiting', label: 'Days Waiting', width: '130px',
                render: (r) => {
                  const d = r.daysWaiting as number | null;
                  return (
                    <span style={{ color: d != null && d > 30 ? '#dc2626' : d != null && d > 14 ? '#d97706' : undefined, fontWeight: 500 }}>
                      {d != null ? `${d.toFixed(0)}d` : '—'}
                    </span>
                  );
                }},
            ]}
            rows={oldestRows}
            defaultSortKey="daysWaiting"
            defaultSortDir="desc"
            rowStyle={(row) => {
              const d = row.daysWaiting as number | null;
              if (d != null && d > 30) return { background: '#fff5f5' };
              if (d != null && d > 14) return { background: '#fffdf0' };
              return {};
            }}
          />
        )}
      </Section>

      {/* ── Longest-waiting returned / parked ── */}
      {!loading && !error && data && (data.oldestReturned || data.oldestParked) && (
        <Section title="Longest Waiting — Returned & Parked">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <OldestReturnedCard item={data.oldestReturned} />
            <OldestParkedCard   item={data.oldestParked} />
          </div>
        </Section>
      )}
    </div>
  );
}

function OldestReturnedCard({ item }: { item: { companyName: string; daysWaiting: number; returnedAt: string | null } | null }) {
  if (!item) return <OldestEmpty label="Oldest Returned" />;
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #d97706a0', borderLeft: '3px solid #d97706', borderRadius: '0.375rem', padding: '1rem' }}>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Oldest Returned</p>
      <p style={{ margin: '0 0 0.15rem', fontSize: '0.95rem', fontWeight: 600, color: '#343a40' }}>{item.companyName}</p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6c757d' }}>
        {item.returnedAt ? <>Returned {fmtDate(item.returnedAt)} · </> : null}
        <span style={{ color: '#d97706', fontWeight: 700 }}>{item.daysWaiting.toFixed(0)} days waiting</span>
      </p>
    </div>
  );
}

function OldestParkedCard({ item }: { item: { companyName: string; daysWaiting: number } | null }) {
  if (!item) return <OldestEmpty label="Oldest Parked" />;
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #dc2626a0', borderLeft: '3px solid #dc2626', borderRadius: '0.375rem', padding: '1rem' }}>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>Oldest Parked</p>
      <p style={{ margin: '0 0 0.15rem', fontSize: '0.95rem', fontWeight: 600, color: '#343a40' }}>{item.companyName}</p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6c757d' }}>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>{item.daysWaiting.toFixed(0)} days waiting</span>
      </p>
    </div>
  );
}

function OldestEmpty({ label }: { label: string }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: '0.375rem', padding: '1rem', color: '#9ca3af', fontSize: '0.875rem' }}>
      <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6c757d' }}>{label}</strong>
      None currently
    </div>
  );
}

function PipelinePriorityCard({ pv }: { pv: PriorityVendors }) {
  const urgentCount  = (pv.urgentList ?? []).length;
  const stageEntries = Object.entries(pv.byStage).filter(([, v]) => v > 0);
  return (
    <div style={{
      background: '#fff8f3',
      border: `2px solid ${urgentCount > 0 ? '#dc2626' : '#e67509'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e67509' }}>⚡ Priority Fast-Track Contractors</h3>
        {urgentCount > 0 && (
          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {urgentCount} URGENT
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[
          { label: 'Total',       value: pv.total,      color: '#e67509' },
          { label: 'In Pipeline', value: pv.inPipeline, color: '#2563eb' },
          { label: 'Approved',    value: pv.approved,   color: '#16a34a' },
          { label: 'Returned',    value: pv.returned,   color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {stageEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: urgentCount > 0 ? '0.75rem' : 0 }}>
          {stageEntries.map(([stage, count]) => (
            <span key={stage} style={{ background: '#e67509', color: '#fff', borderRadius: '9999px', padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}>
              {stage}: {count}
            </span>
          ))}
        </div>
      )}

      {urgentCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
            Needs immediate action (priority + &gt;7 days waiting):
          </p>
          {(pv.urgentList ?? []).map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderTop: i > 0 ? '1px solid #fee2e2' : undefined, fontSize: '0.825rem' }}>
              <span style={{ fontWeight: 500 }}>{v.companyName}</span>
              <span style={{ color: '#6c757d' }}>{v.stage}</span>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>{v.daysWaiting.toFixed(0)}d</span>
            </div>
          ))}
        </div>
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
