'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton } from './LoadingSkeleton';
import { fetchTrends } from '../api';
import type { TrendsData, DateRange, Period } from '../types';

const fmt    = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined)        => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

const LINE_SERIES = [
  { key: 'progressions', name: 'Stage Progressions',      color: '#e67509' },
  { key: 'approvals',    name: 'L3 Approvals',            color: '#16a34a' },
  { key: 'returns',      name: 'Returned to Contractor',  color: '#d97706' },
  { key: 'holds',        name: 'Parked',                   color: '#dc2626' },
];

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

export default function TrendsTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [data, setData]       = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTrends(period, dateRange));
    } catch {
      setError('Failed to load trends data');
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

  const changePercent = data?.periodComparison.changePercent;
  const changeColor   = changePercent == null ? '#9ca3af' : changePercent >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Period: <strong style={{ color: '#343a40' }}>{period}</strong></span>
        <button onClick={load} style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary cards ── */}
      {loading ? <CardsSkeleton count={5} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Progressions" value={data.summary.totalProgressions} color="blue" />
            <StatCard label="L3 Approvals" value={data.summary.totalL3Approvals}  color="green" />
          </div>
          <CardDivider />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Returned to Contractor" value={data.summary.totalReturns}     color="amber" />
            <StatCard label="Parked"                 value={data.summary.totalHolds}       color="red" />
            <StatCard label="Submissions"            value={data.summary.totalSubmissions} color="default" />
          </div>
        </div>
      )}

      {/* ── Period comparison ── */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.875rem', color: '#374151' }}>
            <strong>vs Previous Period:</strong>{' '}
            <span style={{ color: changeColor, fontWeight: 700 }}>{fmtPct(changePercent)}</span>
            {' '}stage progressions ({data.periodComparison.currentPeriodProgressions} vs {data.periodComparison.prevPeriodProgressions})
          </div>
          {data.avgReturnToResubmitDays != null && (
            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
              <strong>Avg Return→Resubmit:</strong>{' '}
              <span style={{ color: '#e67509', fontWeight: 700 }}>{fmt(data.avgReturnToResubmitDays)} days</span>
            </div>
          )}
        </div>
      )}

      {/* ── Line chart: time series ── */}
      <Section title={`Activity Trend (${data?.bucketSize ?? '…'} buckets)`}>
        {loading ? <ChartSkeleton height={260} /> : error ? null : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeriesData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {LINE_SERIES.map(({ key, name, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Park request stats ── */}
      {!loading && !error && data && (
        <Section title="Parked Statistics">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Parked"          value={data.holdStats.totalRequested} color="amber" />
              <StatCard label="Parked Approved" value={data.holdStats.totalApproved}  color="green" />
            </div>
            <CardDivider />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <StatCard label="Park Rate"
                value={data.holdStats.approvalRate == null ? '—' : `${data.holdStats.approvalRate.toFixed(1)}%`}
                color="blue" />
            </div>
          </div>
        </Section>
      )}

    </div>
  );
}

function RankedList({ items, color }: { items: { name: string; count: number }[]; color: string }) {
  if (!items || items.length === 0)
    return <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No data</p>;
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            <span style={{ color: '#9ca3af', marginRight: '0.5rem', fontWeight: 500 }}>#{i + 1}</span>
            {item.name}
          </span>
          <span style={{ background: `${color}20`, color, fontWeight: 700, borderRadius: '9999px', padding: '0.15rem 0.6rem', fontSize: '0.8rem' }}>
            {item.count}
          </span>
        </li>
      ))}
    </ol>
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
