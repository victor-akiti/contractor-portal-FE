'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchPipeline } from '../api';
import type { DateRange, Period, PipelineData, PriorityVendors } from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import PeriodSelector from './PeriodSelector';
import SortableTable from './SortableTable';
import StatCard from './StatCard';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

const STAGE_COLORS = [
  '#e67509', '#2563eb', '#16a34a', '#7c3aed',
  '#d97706', '#dc2626', '#6b7280', '#0891b2', '#f97316', '#84cc16',
];

// Strip "Stage " prefix so we just show the letter e.g. "B" not "Stage B"
const stageLabel = (s: string) => s.replace(/^Stage\s+/i, '').trim();

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

interface PipelineTabProps {
  period: Period;
  dateRange?: DateRange;
  rawDateRange: DateRange;
  onPeriodChange: (p: Period, dr: DateRange) => void;
}

export default function PipelineTab({ period, dateRange, rawDateRange, onPeriodChange }: PipelineTabProps) {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPipeline(period, dateRange));
    } catch (err) {
      console.error('[PipelineTab] fetch error', err);
      setError('Could not load pipeline data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => { load(); }, [load]);

  const stageCounts = data
    ? [
      { name: 'Stage A', value: data.stageCounts.stageA },
      { name: 'Stage B', value: data.stageCounts.stageB },
      { name: 'Stage C', value: data.stageCounts.stageC },
      { name: 'Stage D', value: data.stageCounts.stageD },
      { name: 'Stage E', value: data.stageCounts.stageE },
      { name: 'Stage F', value: data.stageCounts.stageF },
      { name: 'Stage G', value: data.stageCounts.stageG },
      { name: 'Returned', value: data.stageCounts.returned },
      { name: 'Parked', value: data.stageCounts.parked },
      { name: 'Approved (L3)', value: data.stageCounts.l3 },
    ]
    : [];

  const dwellData = (data?.avgDwellPerReviewStage ?? []).map(d => ({
    stage: d.stage,
    days: d.avgDays ?? 0,
    actual: d.avgDays,
    vendors: d.vendorCount,
  }));

  const completionDwellData = (data?.avgCompletionDwellPerStage ?? []).map(d => ({
    stage: d.stage,
    days: d.avgDays ?? 0,
    actual: d.avgDays,
    samples: d.sampleSize,
  }));

  // Record<stageName, { companyName, daysWaiting } | null>
  const oldestRows = Object.entries(data?.oldestPendingPerStage ?? {})
    .filter((entry): entry is [string, { companyName: string; daysWaiting: number | null }] => entry[1] != null)
    .map(([stage, v]) => ({ stage, companyName: v.companyName, daysWaiting: v.daysWaiting })) as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Live stage counts */}
      {loading ? <CardsSkeleton count={10} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Live snapshot - not filtered by period
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Stage A" value={data.stageCounts.stageA} color="default" />
            <StatCard label="Stage B" value={data.stageCounts.stageB} color="blue" />
            <StatCard label="Stage C" value={data.stageCounts.stageC} color="blue" />
            <StatCard label="Stage D" value={data.stageCounts.stageD} color="purple" />
            <StatCard label="Stage E" value={data.stageCounts.stageE} color="amber" />
            <StatCard label="Stage F" value={data.stageCounts.stageF} color="amber" />
            <StatCard label="Stage G" value={data.stageCounts.stageG} color="default" />
            <StatCard label="Returned" value={data.stageCounts.returned} color="amber" />
            <StatCard label="Parked" value={data.stageCounts.parked} color="red" />
            <StatCard label="Approved (L3)" value={data.stageCounts.l3} color="brand" />
          </div>
        </div>
      )}

      {/* Stage bar chart */}
      <Section title="Stage distribution" subtitle="Live count at each stage right now. Not filtered by period.">
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

      {/* Period selector — live snapshot above, period-filtered data below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Period-filtered data below
        </p>
        <PeriodSelector
          period={period}
          rawDateRange={rawDateRange}
          onChange={onPeriodChange}
          onRefresh={load}
          loading={loading}
        />
      </div>

      {/* Period throughput */}
      {!loading && !error && data && (
        <Section title={`What moved this period (${data.throughput.period})`} subtitle="Progressions and final approvals that happened within the selected period. These are actions taken, not the current state.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <StatCard label="Stage progressions" value={data.throughput.periodProgressions} color="blue" />
            <StatCard label="Approved (L3)" value={data.throughput.periodL3Approvals} color="brand" />
          </div>
        </Section>
      )}

      {/* Dwell charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Section title="Current avg wait per stage" subtitle="How long contractors are currently waiting at each stage right now. This is a live reading — the higher the bar, the more work has built up there.">
          {loading ? <ChartSkeleton height={220} /> : error ? null : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dwellData} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 70 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(v: number, _: string, props: { payload?: { actual?: number | null; vendors?: number } }) => [
                    props.payload?.actual == null ? '—' : `${v.toFixed(1)} days`,
                    `Avg wait (${props.payload?.vendors ?? '?'} contractors)`,
                  ]}
                />
                <Bar dataKey="days" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Historical avg time per stage" subtitle="Based on contractors who've already moved through each stage. Compare this with the current waits on the left — if they're much higher, that stage has gotten slower recently.">
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
                    `Avg completion (n=${props.payload?.samples ?? '?'})`,
                  ]}
                />
                <Bar dataKey="days" fill="#e67509" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Bottleneck */}
      {!loading && !error && data?.bottleneck && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 0.35rem', color: '#dc2626', fontSize: '0.95rem', fontWeight: 600 }}>
            Bottleneck: {data.bottleneck.stage}
          </h4>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#374151' }}>
            Contractors here have been waiting an average of <strong>{fmt(data.bottleneck.avgDays)} days</strong> - the longest of any review stage right now.
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
            This is based on the current live wait, not historical averages. The historical chart above may show a different number.
          </p>
        </div>
      )}

      {/* Park stats */}
      {!loading && !error && data && (
        <Section title="Park requests" subtitle="Contractors put on hold during review.  The period numbers cover requests raised and decided within the selected timeframe.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Right now
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Currently parked" value={data.parkStats.currentlyParked} color="red" />
            </div>
            <CardDivider />
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              This period ({data.throughput.period})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Park requests" value={data.parkStats.periodRequests} color="default" />
              <StatCard label="Approved parks" value={data.parkStats.periodApproved} color="green" />
              <StatCard label="Approval rate" value={fmtPct(data.parkStats.approvalRate)} color="blue" />
            </div>
          </div>
        </Section>
      )}

      {/* Account summary */}
      {!loading && !error && data && (
        <Section title="Account summary">
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#9ca3af' }}>
            All-time totals, not filtered by period.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Total accounts" value={data.summary.totalActiveAccounts} color="default" />
              <StatCard label="Registered" value={data.summary.totalRegistered} color="blue" />
              <StatCard label="Not submitted" value={data.summary.notSubmitted} color="default" />
            </div>
            <CardDivider />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="In review" value={data.summary.totalInPipeline} color="blue" />
              <StatCard label="Returned" value={data.summary.returned} color="amber" />
              <StatCard label="Approval rate" value={fmtPct(data.summary.completionRate)}
                sub="of registered contractors" color="brand" />
              <StatCard label="Avg time to approve" value={fmt(data.summary.avgCycleDays)}
                sub="days" color="default" />
            </div>
          </div>
        </Section>
      )}

      {/* Priority contractors */}
      {!loading && !error && data?.priorityVendors && data.priorityVendors.total > 0 && (
        <PipelinePriorityCard pv={data.priorityVendors} />
      )}

      {/* Oldest pending per stage */}
      <Section title="Longest waiting per stage" subtitle="The one contractor waiting the longest at each stage right now.">
        {loading ? <TableSkeleton rows={6} /> : error ? null : oldestRows.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No pending contractors</p>
        ) : (
          <SortableTable
            columns={[
              {
                key: 'stage', label: 'Stage', width: '80px',
                render: (r) => <span style={{ fontWeight: 600 }}>{stageLabel(r.stage as string)}</span>
              },
              { key: 'companyName', label: 'Contractor' },
              {
                key: 'daysWaiting', label: 'Days waiting', width: '120px',
                render: (r) => {
                  const d = r.daysWaiting as number | null;
                  return (
                    <span style={{ color: d != null && d > 30 ? '#dc2626' : d != null && d > 14 ? '#d97706' : undefined, fontWeight: 500 }}>
                      {d != null ? `${d.toFixed(0)}d` : '—'}
                    </span>
                  );
                }
              },
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
    </div>
  );
}

function PipelinePriorityCard({ pv }: { pv: PriorityVendors }) {
  const urgentCount = (pv.urgentList ?? []).length;
  const stageEntries = Object.entries(pv.byStage).filter(([, v]) => v > 0);
  return (
    <div style={{
      background: '#fff8f3',
      border: `2px solid ${urgentCount > 0 ? '#dc2626' : '#e67509'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e67509' }}>Priority contractors</h3>
        {urgentCount > 0 && (
          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {urgentCount} over 7 days
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[
          { label: 'Total', value: pv.total, color: '#e67509' },
          { label: 'In pipeline', value: pv.inPipeline, color: '#1e40af' },
          { label: 'Approved', value: pv.approved, color: '#e67509' },
          { label: 'Returned', value: pv.returned, color: '#92400e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
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
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
            Needs attention - priority and over 7 days waiting:
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <h3 style={{ margin: subtitle ? '0 0 0.25rem' : '0 0 1rem', fontSize: '0.95rem', fontWeight: 600, color: '#343a40' }}>{title}</h3>
      {subtitle && <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#6c757d', lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );
}
