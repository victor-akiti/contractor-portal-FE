'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import SortableTable from './SortableTable';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import { fetchExecSummary, fetchNarrative } from '../api';
import type { ExecSummaryData, NarrativeData } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, decimals = 1) =>
  v == null ? '—' : v.toFixed(decimals);

const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${v.toFixed(1)}%`;

const STAGE_COLORS = ['#e67509', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626'];
const CERT_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#6b7280'];
const FLAG_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  warning:  { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  info:     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
};

const NARRATIVE_CHIP_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#fef2f2', color: '#dc2626' },
  warning:  { bg: '#fffbeb', color: '#b45309' },
  info:     { bg: '#eff6ff', color: '#1d4ed8' },
  success:  { bg: '#f0fdf4', color: '#16a34a' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function OverviewTab() {
  const [summary, setSummary] = useState<ExecSummaryData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorNarrative, setErrorNarrative] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setErrorSummary(null);
    try {
      setSummary(await fetchExecSummary());
    } catch {
      setErrorSummary('Failed to load executive summary');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadNarrative = useCallback(async () => {
    setLoadingNarrative(true);
    setErrorNarrative(null);
    try {
      setNarrative(await fetchNarrative('all'));
    } catch {
      setErrorNarrative('Failed to load AI narrative');
    } finally {
      setLoadingNarrative(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadNarrative();
  }, [loadSummary, loadNarrative]);

  // ── pipeline bar chart data ───────────────────────────────────────────────
  const stageBarData = summary
    ? [
        { name: 'Stage A', value: summary.pipeline.stageCounts.stageA },
        { name: 'Stage B', value: summary.pipeline.stageCounts.stageB },
        { name: 'Stage C', value: summary.pipeline.stageCounts.stageC },
        { name: 'Stage D', value: summary.pipeline.stageCounts.stageD },
        { name: 'Stage E', value: summary.pipeline.stageCounts.stageE },
        { name: 'Stage F', value: summary.pipeline.stageCounts.stageF },
        { name: 'Returned', value: summary.pipeline.stageCounts.returned },
        { name: 'Parked', value: summary.pipeline.stageCounts.parked },
      ]
    : [];

  const dwellBarData = summary
    ? summary.pipeline.avgDwellPerStage.map(d => ({
        name: d.stage,
        days: d.avgDays ?? 0,
        actual: d.avgDays,
      }))
    : [];

  const certDonut = summary
    ? [
        { name: 'Approved', value: summary.certificates.approved },
        { name: 'Pending',  value: summary.certificates.pending },
        { name: 'Rejected', value: summary.certificates.rejected },
        { name: 'Expired',  value: summary.certificates.expired },
      ]
    : [];

  const staleVendors = summary?.pipeline.staleVendors.slice(0, 10) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Stat cards ── */}
      {loadingSummary ? (
        <CardsSkeleton count={5} />
      ) : errorSummary ? (
        <ErrorCard message={errorSummary} onRetry={loadSummary} />
      ) : summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <StatCard label="Total Companies"   value={summary.overview.totalCompanies} color="default" />
          <StatCard label="In Pipeline"       value={summary.overview.totalInPipeline} color="blue" />
          <StatCard label="L3 Approved"       value={summary.overview.totalApproved} color="green" />
          <StatCard label="Completion Rate"   value={fmtPct(summary.overview.completionRate)} color="purple" />
          <StatCard label="Avg Cycle Days"    value={fmt(summary.overview.avgCycleDays)} sub="days" color="amber" />
        </div>
      )}

      {/* ── Flag strip ── */}
      {!loadingSummary && !errorSummary && summary && summary.flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {summary.flags.map((flag, i) => {
            const s = FLAG_STYLES[flag.severity] ?? FLAG_STYLES.info;
            return (
              <div key={i} style={{
                background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                borderRadius: '0.375rem', padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 500,
              }}>
                {flag.severity === 'critical' ? '🔴' : flag.severity === 'warning' ? '🟡' : 'ℹ️'} {flag.message}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pipeline stage chart ── */}
      <Section title="Pipeline Stage Counts">
        {loadingSummary ? <ChartSkeleton height={220} /> : errorSummary ? null : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageBarData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              {stageBarData.map((_, i) => null)}
              <Bar dataKey="value" name="Vendors" radius={[4, 4, 0, 0]}>
                {stageBarData.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Avg dwell chart ── */}
      <Section title="Avg Dwell Per Stage (days)">
        {loadingSummary ? <ChartSkeleton height={200} /> : errorSummary ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dwellBarData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 60 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
              <Tooltip formatter={(v: number, _: string, props: { payload?: { actual?: number | null } }) => [
                props.payload?.actual == null ? '—' : `${v.toFixed(1)} days`, 'Avg Dwell'
              ]} />
              <Bar dataKey="days" fill="#e67509" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Due Diligence cards ── */}
      {!loadingSummary && !errorSummary && summary && (
        <Section title="Due Diligence (Stage D & E)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <StatCard label="At Stage D"        value={summary.dueDiligence.atStageD} color="blue" />
            <StatCard label="At Stage E"        value={summary.dueDiligence.atStageE} color="purple" />
            <StatCard label="Avg Days @ Stage D" value={fmt(summary.dueDiligence.avgDaysAtStageD)} sub="days" color="amber" />
            <StatCard label="Avg Days @ Stage E" value={fmt(summary.dueDiligence.avgDaysAtStageE)} sub="days" color="amber" />
          </div>
        </Section>
      )}

      {/* ── Activity cards ── */}
      {!loadingSummary && !errorSummary && summary && (
        <Section title="Activity (Last 30 Days)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            <StatCard label="Progressions"  value={summary.activity.last30Days.progressions} color="green" />
            <StatCard label="Approvals"     value={summary.activity.last30Days.approvals} color="blue" />
            <StatCard label="Returns"       value={summary.activity.last30Days.returns} color="amber" />
            <StatCard label="Holds"         value={summary.activity.last30Days.holds} color="red" />
            <StatCard label="Submissions"   value={summary.activity.last30Days.submissions} color="default" />
          </div>
        </Section>
      )}

      {/* ── Certificate health donut ── */}
      <Section title="Certificate Health">
        {loadingSummary ? <ChartSkeleton height={220} /> : errorSummary ? null : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie data={certDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {certDonut.map((_, i) => <Cell key={i} fill={CERT_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1, minWidth: 200 }}>
              <StatCard label="Approved"      value={summary!.certificates.approved} color="green" />
              <StatCard label="Pending"       value={summary!.certificates.pending} color="amber" />
              <StatCard label="Rejected"      value={summary!.certificates.rejected} color="red" />
              <StatCard label="Expiring Soon" value={summary!.certificates.expiringSoon} color="red" />
            </div>
          </div>
        )}
      </Section>

      {/* ── Stale vendors table ── */}
      <Section title="Stale Vendors (top 10 by wait time)">
        {loadingSummary ? <TableSkeleton rows={5} /> : errorSummary ? null : (
          <SortableTable
            columns={[
              { key: 'companyName', label: 'Company' },
              { key: 'stage',       label: 'Stage', width: '80px' },
              { key: 'daysWaiting', label: 'Days Waiting', width: '120px',
                render: (r) => <span>{fmt(r.daysWaiting as number, 0)} days</span> },
            ]}
            rows={staleVendors as Record<string, unknown>[]}
            defaultSortKey="daysWaiting"
            defaultSortDir="desc"
            rowStyle={(row) => {
              const d = row.daysWaiting as number;
              if (d > 30) return { background: '#fef2f2' };
              if (d > 14) return { background: '#fffbeb' };
              return {};
            }}
          />
        )}
      </Section>

      {/* ── AI Narrative card ── */}
      <Section title="AI Narrative">
        {loadingNarrative ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} style={{ height: 16, width: `${w}%`, background: '#f0f0f0', borderRadius: 4 }} />
            ))}
          </div>
        ) : errorNarrative ? (
          <ErrorCard message={errorNarrative} onRetry={loadNarrative} />
        ) : narrative && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: '#343a40', lineHeight: 1.7, margin: 0, fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>
              {narrative.narrative}
            </p>
            {narrative.highlights.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {narrative.highlights.map((h, i) => {
                  const s = NARRATIVE_CHIP_STYLES[h.type] ?? NARRATIVE_CHIP_STYLES.info;
                  return (
                    <span key={i} style={{
                      background: s.bg, color: s.color, borderRadius: '9999px',
                      padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 500,
                    }}>
                      {h.message}
                    </span>
                  );
                })}
              </div>
            )}
            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
              Generated by {narrative.provider} · {new Date(narrative.generatedAt).toLocaleString()}
            </p>
          </div>
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
