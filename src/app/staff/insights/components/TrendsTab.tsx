'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, Cell,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton } from './LoadingSkeleton';
import { fetchTrends } from '../api';
import type { TrendsData, Period } from '../types';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

const LINE_COLORS = { progressions: '#e67509', approvals: '#16a34a', returns: '#d97706', holds: '#dc2626' };
const STAGE_COLORS = ['#e67509', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626'];

export default function TrendsTab({ period }: { period: Period }) {
  const [data, setData]       = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTrends(period));
    } catch {
      setError('Failed to load trends data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const returnsByStageData = data
    ? Object.entries(data.returnsByStage)
        .filter(([k]) => k !== 'unknown')
        .map(([stage, count], i) => ({ stage: `Stage ${stage}`, count, fill: STAGE_COLORS[i] }))
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Progressions"    value={data.summary.totalProgressions}   color="blue" />
          <StatCard label="L3 Approvals"    value={data.summary.totalL3Approvals}    color="green" />
          <StatCard label="Returns"         value={data.summary.totalReturns}         color="amber" />
          <StatCard label="Holds"           value={data.summary.totalHolds}           color="red" />
          <StatCard label="Submissions"     value={data.summary.totalSubmissions}     color="default" />
        </div>
      )}

      {/* ── Period comparison badge ── */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.875rem', color: '#374151' }}>
            <strong>vs Previous Period:</strong>{' '}
            <span style={{ color: changeColor, fontWeight: 700 }}>{fmtPct(changePercent)}</span>
            {' '}progressions ({data.periodComparison.currentPeriodProgressions} vs {data.periodComparison.prevPeriodProgressions})
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
      <Section title="Weekly Activity Trend">
        {loading ? <ChartSkeleton height={260} /> : error ? null : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.timeSeries ?? []} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {(Object.entries(LINE_COLORS) as [string, string][]).map(([key, color]) => (
                <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Returns by stage bar chart ── */}
      <Section title="Returns by Stage">
        {loading ? <ChartSkeleton height={200} /> : error ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={returnsByStageData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 70 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" name="Returns" radius={[0, 4, 4, 0]}>
                {returnsByStageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Hold stats cards ── */}
      {!loading && !error && data && (
        <Section title="Hold Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <StatCard label="Holds Requested" value={data.holdStats.totalRequested} color="amber" />
            <StatCard label="Holds Approved"  value={data.holdStats.totalApproved}  color="green" />
            <StatCard label="Hold Approval Rate"
              value={data.holdStats.approvalRate == null ? '—' : `${data.holdStats.approvalRate.toFixed(1)}%`}
              color="blue" />
          </div>
        </Section>
      )}

      {/* ── Top initiators ── */}
      {!loading && !error && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Section title="Top Return Initiators">
            <RankedList items={data.topReturnInitiators} color="#d97706" />
          </Section>
          <Section title="Top Hold Initiators">
            <RankedList items={data.topHoldInitiators} color="#dc2626" />
          </Section>
        </div>
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
