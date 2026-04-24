'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import SortableTable from './SortableTable';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import { fetchPipeline } from '../api';
import type { PipelineData, PriorityVendors } from '../types';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STAGE_COLORS = ['#e67509', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626', '#6b7280', '#0891b2'];

export default function PipelineTab() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPipeline());
    } catch {
      setError('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stageCounts = data
    ? [
        { name: 'In Progress', value: data.stageCounts.inProgress },
        { name: 'Stage A', value: data.stageCounts.stageA },
        { name: 'Stage B', value: data.stageCounts.stageB },
        { name: 'Stage C', value: data.stageCounts.stageC },
        { name: 'Stage D', value: data.stageCounts.stageD },
        { name: 'Stage E', value: data.stageCounts.stageE },
        { name: 'Stage F', value: data.stageCounts.stageF },
        { name: 'Returned', value: data.stageCounts.returned },
        { name: 'Parked',   value: data.stageCounts.parked },
        { name: 'L3',       value: data.stageCounts.l3 },
      ]
    : [];

  const dwellData = data
    ? Object.entries(data.avgDwellPerStage).map(([stage, days]) => ({
        stage,
        days: days ?? 0,
        actual: days,
      }))
    : [];

  const oldestRows = (data?.oldestPendingPerStage ?? []) as unknown as Record<string, unknown>[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Stage count cards ── */}
      {loading ? <CardsSkeleton count={10} /> : error ? <ErrorCard message={error} onRetry={load} /> : data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="In Progress" value={data.stageCounts.inProgress} color="default" />
          <StatCard label="Stage A"  value={data.stageCounts.stageA}  color="default" />
          <StatCard label="Stage B"  value={data.stageCounts.stageB}  color="blue" />
          <StatCard label="Stage C"  value={data.stageCounts.stageC}  color="green" />
          <StatCard label="Stage D"  value={data.stageCounts.stageD}  color="purple" />
          <StatCard label="Stage E"  value={data.stageCounts.stageE}  color="amber" />
          <StatCard label="Stage F"  value={data.stageCounts.stageF}  color="red" />
          <StatCard label="Returned" value={data.stageCounts.returned} color="amber" />
          <StatCard label="Parked"   value={data.stageCounts.parked}  color="red" />
          <StatCard label="L3 / Done" value={data.stageCounts.l3}    color="green" />
        </div>
      )}

      {/* ── Stage bar chart ── */}
      <Section title="Stage Distribution">
        {loading ? <ChartSkeleton height={220} /> : error ? null : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageCounts} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Vendors" radius={[4, 4, 0, 0]}>
                {stageCounts.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Dwell chart ── */}
      <Section title="Avg Dwell Per Stage (days)">
        {loading ? <ChartSkeleton height={200} /> : error ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dwellData} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 70 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v: number, _: string, props: { payload?: { actual?: number | null } }) => [
                props.payload?.actual == null ? '—' : `${v.toFixed(1)} days`, 'Avg Dwell'
              ]} />
              <Bar dataKey="days" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Throughput cards ── */}
      {!loading && !error && data && (
        <Section title="Throughput">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <StatCard label="Progressions (7d)"     value={data.throughput.progressionsLast7Days}  color="blue" />
            <StatCard label="Progressions (30d)"    value={data.throughput.progressionsLast30Days} color="blue" />
            <StatCard label="L3 Approvals (7d)"     value={data.throughput.l3ApprovalsLast7Days}   color="green" />
            <StatCard label="L3 Approvals (30d)"    value={data.throughput.l3ApprovalsLast30Days}  color="green" />
          </div>
        </Section>
      )}

      {/* ── Priority Fast-Track ── */}
      {!loading && !error && data?.priorityVendors && data.priorityVendors.total > 0 && (
        <PipelinePriorityCard pv={data.priorityVendors} />
      )}

      {/* ── Oldest pending table ── */}
      <Section title="Oldest Pending Per Stage">
        {loading ? <TableSkeleton rows={6} /> : error ? null : (
          <SortableTable
            columns={[
              { key: 'stage',       label: 'Stage', width: '80px' },
              { key: 'companyName', label: 'Company' },
              { key: 'entryTime',   label: 'Entry Date', width: '130px',
                render: (r) => <span>{fmtDate(r.entryTime as string)}</span> },
              { key: 'daysWaiting', label: 'Days Waiting', width: '120px',
                render: (r) => (
                  <span style={{ color: (r.daysWaiting as number) > 30 ? '#dc2626' : (r.daysWaiting as number) > 14 ? '#d97706' : undefined }}>
                    {fmt(r.daysWaiting as number, 0)} days
                  </span>
                )},
            ]}
            rows={oldestRows}
            defaultSortKey="daysWaiting"
            defaultSortDir="desc"
            rowStyle={(row) => {
              const d = row.daysWaiting as number;
              if (d > 30) return { background: '#fff5f5' };
              if (d > 14) return { background: '#fffdf0' };
              return {};
            }}
          />
        )}
      </Section>
    </div>
  );
}

function PipelinePriorityCard({ pv }: { pv: PriorityVendors }) {
  const urgentCount = pv.urgentList.length;
  const stageEntries = Object.entries(pv.byStage).filter(([, v]) => v > 0);
  return (
    <div style={{
      background: '#fff8f3',
      border: `2px solid ${urgentCount > 0 ? '#dc2626' : '#e67509'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e67509' }}>⚡ Priority Fast-Track Vendors</h3>
        {urgentCount > 0 && (
          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {urgentCount} URGENT
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[
          { label: 'Total',       value: pv.total,       color: '#e67509' },
          { label: 'In Pipeline', value: pv.inPipeline,  color: '#2563eb' },
          { label: 'Approved',    value: pv.approved,    color: '#16a34a' },
          { label: 'Returned',    value: pv.returned,    color: '#d97706' },
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
          {pv.urgentList.map((v, i) => (
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
