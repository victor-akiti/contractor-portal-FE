'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton } from './LoadingSkeleton';
import { fetchTrends, fetchPerformance } from '../api';
import type { TrendsData, PerformanceData, DateRange, Period } from '../types';

const fmt    = (v: number | null | undefined, d = 1) => (v == null ? '-' : v.toFixed(d));
const fmtPct = (v: number | null | undefined)        => (v == null ? '-' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

const LINE_SERIES = [
  { key: 'progressions', name: 'Progressions',          color: '#e67509' },
  { key: 'approvals',    name: 'Approved (L3)',          color: '#16a34a' },
  { key: 'returns',      name: 'Returned to contractor', color: '#d97706' },
  { key: 'holds',        name: 'Parked',                 color: '#dc2626' },
];

const STAGE_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

export default function TrendsTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [data, setData]         = useState<TrendsData | null>(null);
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trends, perf] = await Promise.all([
        fetchTrends(period, dateRange),
        fetchPerformance(period, dateRange),
      ]);
      setData(trends);
      setPerfData(perf);
    } catch {
      setError('Could not load trends data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => { load(); }, [load]);

  const timeSeriesData = data
    ? data.trends.labels.map((label, i) => ({
        label,
        progressions: data.trends.series.progressions[i] ?? 0,
        approvals:    data.trends.series.approvals[i]    ?? 0,
        returns:      data.trends.series.returns[i]      ?? 0,
        holds:        data.trends.series.holds[i]        ?? 0,
      }))
    : [];

  // Sum each stage's actions across all approvers = progressions per stage for the period
  const stageProgressions = perfData
    ? (['B', 'C', 'D', 'E', 'F', 'G'] as const)
        .map((s, i) => ({
          stage: `Stage ${s}`,
          count: perfData.byApprover.reduce((sum, a) => sum + (a.stageBreakdown[s] ?? 0), 0),
          color: STAGE_COLORS[i],
        }))
        .filter(s => s.count > 0)
    : [];

  const changePercent = data?.periodComparison.changePercent;
  const changeColor   = changePercent == null ? '#9ca3af' : changePercent >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Period: <strong style={{ color: '#343a40' }}>{period}</strong></span>
        <button onClick={load} style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {loading ? <CardsSkeleton count={5} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Progressions"  value={data.summary.totalProgressions} color="blue" />
            <StatCard label="Approved (L3)" value={data.summary.totalL3Approvals}  color="brand" />
          </div>
          <CardDivider />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Returned"    value={data.summary.totalReturns}     color="amber" />
            <StatCard label="Parked"      value={data.summary.totalHolds}       color="red" />
            <StatCard label="Submissions" value={data.summary.totalSubmissions} color="default" />
          </div>
        </div>
      )}

      {/* Period comparison */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ color: '#374151' }}>
            vs last period: <span style={{ color: changeColor, fontWeight: 700 }}>{fmtPct(changePercent)}</span>
            {' '}progressions ({data.periodComparison.currentPeriodProgressions} now vs {data.periodComparison.prevPeriodProgressions} before)
          </div>
          {data.avgReturnToResubmitDays != null && (
            <div style={{ color: '#374151' }}>
              avg time to resubmit after a return: <span style={{ color: '#e67509', fontWeight: 700 }}>{fmt(data.avgReturnToResubmitDays)} days</span>
            </div>
          )}
        </div>
      )}

      {/* Activity trend line chart */}
      <Section title={`Activity over time (${data?.bucketSize ?? '...'} buckets)`} subtitle="Progressions, approvals, returns and parks over the period. Gives you a feel for whether things are speeding up or slowing down.">
        {loading ? <ChartSkeleton height={260} /> : error ? null : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeriesData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              {LINE_SERIES.map(({ key, name, color }) => (
                <Line key={key} type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Progressions by stage */}
      <Section title="Progressions by stage" subtitle="How many times contractors moved forward at each stage this period. Tallied from all approver actions. Stages with zero actions are hidden.">
        {loading ? <ChartSkeleton height={200} /> : error ? null : stageProgressions.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No stage activity recorded for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageProgressions} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'Progressions']} />
              <Bar dataKey="count" name="Progressions" radius={[4, 4, 0, 0]}>
                {stageProgressions.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Park statistics */}
      {!loading && !error && data && (
        <Section title="Park statistics" subtitle="Parks put a contractor on hold during review. These numbers cover the selected period.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Park requests"      value={data.holdStats.totalRequested} color="default" />
              <StatCard label="Approved parks"     value={data.holdStats.totalApproved}  color="green" />
            </div>
            <CardDivider />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Park approval rate"
                value={data.holdStats.approvalRate == null ? '-' : `${data.holdStats.approvalRate.toFixed(1)}%`}
                color="blue" />
            </div>
          </div>
        </Section>
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
