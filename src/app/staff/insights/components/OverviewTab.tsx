'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchCertificates, fetchDashboard, fetchNarrative } from '../api';
import type {
  CertificatesData, DashboardData, DateRange,
  NarrativeData, Period, PriorityVendors, StaleVendorItem,
} from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import SortableTable from './SortableTable';
import StatCard from './StatCard';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt    = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined)        => (v == null ? '—' : `${v.toFixed(1)}%`);
const fmtChg = (v: number | null | undefined)        =>
  v == null ? null : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const FLAG_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: '🔴' },
  warning:  { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '🟡' },
  info:     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ️' },
};

const NARRATIVE_CHIP: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#fef2f2', color: '#dc2626' },
  warning:  { bg: '#fffbeb', color: '#b45309' },
  info:     { bg: '#eff6ff', color: '#1d4ed8' },
  success:  { bg: '#f0fdf4', color: '#16a34a' },
};

const TREND_SERIES: { key: string; label: string; color: string; dashed?: boolean }[] = [
  { key: 'progressions',        label: 'Progressions',         color: '#e67509' },
  { key: 'approvals',           label: 'Approvals',            color: '#16a34a' },
  { key: 'registrations',       label: 'Registrations',        color: '#2563eb' },
  { key: 'submissions',         label: 'Submissions',          color: '#7c3aed' },
  { key: 'returns',             label: 'Returns',              color: '#d97706' },
  { key: 'holds',               label: 'Holds',                color: '#dc2626' },
  { key: 'cumulativeApprovals', label: 'Cumulative Approvals', color: '#059669', dashed: true },
];

const CERT_STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626'];
const CERT_EXPIRY_COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#9ca3af'];

// ── Card group divider ────────────────────────────────────────────────────────
function CardDivider() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      margin: '0.25rem 0',
    }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OverviewTab({ period, dateRange }: { period: Period; dateRange?: DateRange }) {
  const [dashboard, setDashboard]             = useState<DashboardData | null>(null);
  const [certData,  setCertData]              = useState<CertificatesData | null>(null);
  const [narrative, setNarrative]             = useState<NarrativeData | null>(null);
  const [loadingMain, setLoadingMain]         = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [errorMain, setErrorMain]             = useState<string | null>(null);
  const [errorNarrative, setErrorNarrative]   = useState<string | null>(null);

  const loadMain = useCallback(async () => {
    setLoadingMain(true);
    setErrorMain(null);
    try {
      const [dash, certs] = await Promise.all([
        fetchDashboard(period, dateRange),
        fetchCertificates(period, dateRange),
      ]);
      setDashboard(dash);
      setCertData(certs);
    } catch {
      setErrorMain('Failed to load dashboard data');
    } finally {
      setLoadingMain(false);
    }
  }, [period, dateRange]);

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

  useEffect(() => { loadMain(); },      [loadMain]);
  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  // ── derived chart data ─────────────────────────────────────────────────────
  const trendChartData = dashboard
    ? dashboard.trends.labels.map((label, i) => {
        const s = dashboard.trends.series;
        return {
          label,
          registrations:       s.registrations[i]       ?? 0,
          submissions:         s.submissions[i]         ?? 0,
          progressions:        s.progressions[i]        ?? 0,
          approvals:           s.approvals[i]           ?? 0,
          returns:             s.returns[i]             ?? 0,
          holds:               s.holds[i]               ?? 0,
          cumulativeApprovals: s.cumulativeApprovals[i] ?? 0,
        };
      })
    : [];

  const returnsByStageData = dashboard
    ? Object.entries(dashboard.trends.returnsByStage)
        .filter(([k]) => k !== 'Unknown')
        .map(([stage, count]) => ({ stage: `Stage ${stage}`, count }))
    : [];

  const certStatusDonut = certData
    ? [
        { name: 'Approved (period)', value: certData.statusBreakdown.approvedInPeriod },
        { name: 'Within Amni Review', value: certData.statusBreakdown.pending },
        { name: 'Rejected (period)',  value: certData.statusBreakdown.rejectedInPeriod },
      ]
    : [];

  const certExpiryDonut = certData
    ? [
        { name: 'Expired',       value: certData.expiryBreakdown.expired },
        { name: 'Expiring Soon', value: certData.expiryBreakdown.expiringSoon },
        { name: 'Healthy',       value: certData.expiryBreakdown.healthy },
        { name: 'No Expiry',     value: certData.expiryBreakdown.noExpiry },
      ]
    : [];

  const staleVendors = (dashboard?.pipeline.staleVendors ?? []) as StaleVendorItem[];
  const tips = dashboard?.tooltips ?? {};

  const chg      = dashboard?.periodComparison.changePercent;
  const chgStr   = fmtChg(chg);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={loadMain}
          style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#374151' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── KPI stat cards — grouped with dividers ── */}
      {loadingMain ? (
        <CardsSkeleton count={13} />
      ) : errorMain ? (
        <ErrorCard message={errorMain} onRetry={loadMain} />
      ) : dashboard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* Group 1: All Accounts → Registered → Not Yet Submitted */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="All Contractor Accounts" value={dashboard.kpis.totalVendorAccounts} color="default" tooltip={tips.totalVendorAccounts} />
            <StatCard label="Registered"              value={dashboard.kpis.totalRegistered}      color="blue"    tooltip={tips.totalRegistered} />
            <StatCard label="Not Yet Submitted"       value={dashboard.kpis.notSubmitted}         color="default" tooltip={tips.notSubmitted} />
          </div>

          <CardDivider />

          {/* Group 2: Pipeline → Returned → Parked → Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="In Pipeline"          value={dashboard.kpis.totalInPipeline}    color="blue"   tooltip={tips.totalInPipeline} />
            <StatCard label="Returned"             value={dashboard.kpis.returned}           color="amber"  tooltip={tips.returned} />
            <StatCard label="Parked"               value={dashboard.kpis.parked}             color="red"    tooltip={tips.parked} />
            <StatCard label="Priority Contractors" value={dashboard.kpis.priorityInPipeline} color="purple" tooltip={tips.priorityInPipeline} />
          </div>

          <CardDivider />

          {/* Group 3: Completion metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="L3 Approved"
              value={dashboard.kpis.totalApproved}
              color="green"
              tooltip={tips.totalApproved} />
            <StatCard label="Completion Rate"
              value={fmtPct(dashboard.kpis.completionRate)}
              sub={chgStr ? `${chgStr} vs prev period` : undefined}
              color="purple"
              tooltip={tips.completionRate} />
            <StatCard label="Avg Cycle Days"
              value={fmt(dashboard.kpis.avgCycleDays)}
              sub="days"
              color="amber"
              tooltip={tips.avgCycleDays} />
          </div>

          <CardDivider />

          {/* Group 4: Certificates — use /certificates endpoint counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Total Certs Tracked"
              value={certData?.statusBreakdown.totalTracked ?? '—'}
              color="default" />
            <StatCard label="Certs Pending Review"
              value={certData?.statusBreakdown.pending ?? '—'}
              color="amber"
              tooltip={tips.certsPending} />
            <StatCard label="Certs Expired"
              value={certData?.expiryBreakdown.expired ?? '—'}
              color="red"
              tooltip={tips.certsExpired} />
            <StatCard label="Certs Expiring Soon"
              value={certData?.expiryBreakdown.expiringSoon ?? '—'}
              color="amber"
              tooltip={tips.certsExpiringSoon} />
          </div>
        </div>
      )}

      {/* ── Flags ── */}
      {!loadingMain && !errorMain && dashboard && dashboard.flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {dashboard.flags.map((flag, i) => {
            const s = FLAG_STYLES[flag.severity] ?? FLAG_STYLES.info;
            return (
              <div key={i} style={{
                background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                borderRadius: '0.375rem', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 500,
              }}>
                {s.icon} {flag.message}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Priority Fast-Track ── */}
      {!loadingMain && !errorMain && dashboard?.priorityVendors && dashboard.priorityVendors.total > 0 && (
        <PriorityFastTrackCard pv={dashboard.priorityVendors} />
      )}

      {/* ── Trends line chart ── */}
      <Section title={`Activity Trends (${dashboard?.bucketSize ?? '…'} buckets)`}>
        {loadingMain ? <ChartSkeleton height={260} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              {TREND_SERIES.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1.5 : 2}
                  strokeDasharray={s.dashed ? '5 3' : undefined}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Pipeline distribution doughnut ── */}
      <Section title="Pipeline Distribution">
        {loadingMain ? <ChartSkeleton height={220} /> : errorMain ? null : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={dashboard!.pipeline.distribution}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {dashboard!.pipeline.distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>

            {dashboard!.pipeline.bottleneck && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem',
                padding: '1rem 1.25rem', flex: 1, minWidth: 180,
              }}>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>Bottleneck</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>
                  {dashboard!.pipeline.bottleneck.stage}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                  Avg {fmt(dashboard!.pipeline.bottleneck.avgDays)} days/contractor
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Avg dwell per review stage ── */}
      <Section title="Avg Dwell Per Review Stage (days)" tooltip={tips.avgDwellPerReviewStage}>
        {loadingMain ? <ChartSkeleton height={200} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={(dashboard!.pipeline.avgDwellPerReviewStage ?? []).map(d => ({ ...d, days: d.avgDays ?? 0 }))}
              layout="vertical"
              margin={{ top: 4, right: 50, bottom: 4, left: 70 }}
            >
              <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} days`, 'Avg Dwell']} />
              <Bar dataKey="days" fill="#e67509" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Returns by stage ── */}
      <Section title="Returns by Stage (period)">
        {loadingMain ? <ChartSkeleton height={180} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={returnsByStageData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 70 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" name="Returns" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Activity cards ── */}
      {!loadingMain && !errorMain && dashboard && (
        <Section title={`Activity (${dashboard.activity.period})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <StatCard label={`Progressions (${dashboard.activity.period})`} value={dashboard.activity.totals.progressions} color="blue" />
              <StatCard label={`Approvals (${dashboard.activity.period})`}    value={dashboard.activity.totals.approvals}    color="green" />
              <StatCard label={`Returns (${dashboard.activity.period})`}      value={dashboard.activity.totals.returns}      color="amber" />
              <StatCard label={`Holds (${dashboard.activity.period})`}        value={dashboard.activity.totals.holds}        color="red" />
              <StatCard label={`Submissions (${dashboard.activity.period})`}  value={dashboard.activity.totals.submissions}  color="default" />
            </div>
            <CardDivider />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <StatCard label="Progressions (7d)" value={dashboard.activity.last7Days.progressions} color="blue" />
              <StatCard label="Approvals (7d)"    value={dashboard.activity.last7Days.approvals}    color="green" />
              <StatCard label="Returns (7d)"      value={dashboard.activity.last7Days.returns}      color="amber" />
              <StatCard label="Holds (7d)"        value={dashboard.activity.last7Days.holds}        color="red" />
              <StatCard label="Total Period Holds" value={dashboard.holdStats.periodHolds}           color="red" />
            </div>
          </div>
        </Section>
      )}

      {/* ── Due Diligence (Stage E = VMO, Stage F = C&P HOD) ── */}
      {!loadingMain && !errorMain && dashboard && (
        <Section title="Due Diligence (Stage E & F)" tooltip={tips.dueDiligence}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="At Stage E (VMO)"      value={dashboard.dueDiligence.atStageE}              color="blue" />
            <StatCard label="At Stage F (C&P HOD)"  value={dashboard.dueDiligence.atStageF}              color="purple" />
            <StatCard label="Avg Days @ Stage E"     value={fmt(dashboard.dueDiligence.avgDaysAtStageE)}  sub="days" color="amber" />
            <StatCard label="Avg Days @ Stage F"     value={fmt(dashboard.dueDiligence.avgDaysAtStageF)}  sub="days" color="amber" />
          </div>
        </Section>
      )}

      {/* ── Certificate health ── */}
      <Section title="Certificate Health (cert-review queue)">
        {loadingMain ? <ChartSkeleton height={240} /> : errorMain ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Group 1: status — total first, then breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <StatCard label="Total Certs Tracked"  value={certData?.statusBreakdown.totalTracked}      color="default" />
                <StatCard label="Approved (period)"    value={certData?.statusBreakdown.approvedInPeriod} color="green" />
                <StatCard label="Pending Review"       value={certData?.statusBreakdown.pending}          color="amber" />
                <StatCard label="Rejected (period)"    value={certData?.statusBreakdown.rejectedInPeriod} color="red" />
              </div>
              <CardDivider />
              {/* Group 2: expiry */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <StatCard label="Healthy"        value={certData?.expiryBreakdown.healthy}      color="green" />
                <StatCard label="Expiring Soon"  value={certData?.expiryBreakdown.expiringSoon} color="amber" />
                <StatCard label="Expired"        value={certData?.expiryBreakdown.expired}      color="red" />
                <StatCard label="Approval Rate"
                  value={certData?.approvalRate != null ? `${certData.approvalRate.toFixed(1)}%` : '—'}
                  color="green" />
              </div>
            </div>

            {/* Dual donuts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
                  Review Status
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={certStatusDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {certStatusDonut.map((_, i) => <Cell key={i} fill={CERT_STATUS_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
                  Expiry Status
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={certExpiryDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {certExpiryDonut.map((_, i) => <Cell key={i} fill={CERT_EXPIRY_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ── Stale contractors table ── */}
      <Section title="Stale Contractors (waiting >14 days)" tooltip={tips.staleVendors}>
        {loadingMain ? <TableSkeleton rows={5} /> : errorMain ? null : (
          staleVendors.length === 0
            ? <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No stale contractors — pipeline is moving well.</p>
            : (
              <SortableTable<StaleVendorItem>
                columns={[
                  { key: 'companyName', label: 'Contractor',
                    render: (r) => (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {r.isPriority && (
                          <span style={{ background: '#e67509', color: '#fff', borderRadius: '9999px', padding: '0.1rem 0.45rem', fontSize: '0.68rem', fontWeight: 700 }}>
                            PRIORITY
                          </span>
                        )}
                        {r.status === 'returned' && (
                          <span style={{ background: '#d97706', color: '#fff', borderRadius: '9999px', padding: '0.1rem 0.45rem', fontSize: '0.68rem', fontWeight: 700 }}>
                            RETURNED
                          </span>
                        )}
                        {r.status === 'parked' && (
                          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.1rem 0.45rem', fontSize: '0.68rem', fontWeight: 700 }}>
                            PARKED
                          </span>
                        )}
                        {r.companyName}
                      </span>
                    )},
                  { key: 'stage',       label: 'Stage',        width: '100px' },
                  { key: 'daysWaiting', label: 'Days Waiting', width: '120px',
                    render: (r) => (
                      <span style={{ color: r.daysWaiting > 30 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        {fmt(r.daysWaiting, 0)} days
                      </span>
                    )},
                ]}
                rows={staleVendors}
                defaultSortKey="daysWaiting"
                defaultSortDir="desc"
                rowStyle={(row) => {
                  if (row.status === 'parked')   return { background: '#fef2f2', borderLeft: '3px solid #dc2626' };
                  if (row.status === 'returned') return { background: '#fffbeb', borderLeft: '3px solid #d97706' };
                  if (row.daysWaiting > 30)      return { background: '#fff5f5', borderLeft: row.isPriority ? '3px solid #e67509' : undefined };
                  return { background: '#fffdf0', borderLeft: row.isPriority ? '3px solid #e67509' : undefined };
                }}
              />
            )
        )}
      </Section>

      {/* ── AI Narrative ── */}
      <Section title="AI Narrative">
        {loadingNarrative ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} style={{ height: 14, width: `${w}%`, background: '#f0f0f0', borderRadius: 4 }} />
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
                  const s = NARRATIVE_CHIP[h.type] ?? NARRATIVE_CHIP.info;
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

// ── Priority Fast-Track card ──────────────────────────────────────────────────
function PriorityFastTrackCard({ pv }: { pv: PriorityVendors }) {
  const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
  const urgentCount  = pv.urgentList.length;
  const stageEntries = Object.entries(pv.byStage).filter(([, v]) => v > 0);

  return (
    <div style={{
      background: '#fff8f3',
      border: `2px solid ${urgentCount > 0 ? '#dc2626' : '#e67509'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e67509' }}>
          ⚡ Priority Fast-Track Contractors
        </h3>
        {urgentCount > 0 && (
          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {urgentCount} URGENT — waiting &gt;7 days
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Priority', value: pv.total,      color: '#e67509' },
          { label: 'In Pipeline',    value: pv.inPipeline, color: '#2563eb' },
          { label: 'L3 Approved',    value: pv.approved,   color: '#16a34a' },
          { label: 'Returned',       value: pv.returned,   color: '#d97706' },
          { label: 'Parked',         value: pv.parked,     color: '#dc2626' },
          { label: 'Approval Rate',
            value: pv.approvalRate != null ? `${pv.approvalRate.toFixed(1)}%` : '—',
            color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '0.375rem', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {stageEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: urgentCount > 0 ? '1rem' : 0 }}>
          {stageEntries.map(([stage, count]) => (
            <span key={stage} style={{ background: '#e67509', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 600 }}>
              {stage}: {count}
            </span>
          ))}
        </div>
      )}

      {urgentCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
            Contractors needing immediate attention (priority + waiting &gt;7 days):
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #fecaca' }}>
                <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: '#7f1d1d', fontWeight: 600 }}>Contractor</th>
                <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: '#7f1d1d', fontWeight: 600, width: 90 }}>Stage</th>
                <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: '#7f1d1d', fontWeight: 600, width: 110 }}>Days Waiting</th>
              </tr>
            </thead>
            <tbody>
              {pv.urgentList.map((v, i) => (
                <tr key={i} style={{ borderTop: i > 0 ? '1px solid #fee2e2' : undefined }}>
                  <td style={{ padding: '0.35rem 0.5rem', fontWeight: 500 }}>{v.companyName}</td>
                  <td style={{ padding: '0.35rem 0.5rem', color: '#6c757d' }}>{v.stage}</td>
                  <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                    {fmt(v.daysWaiting, 0)}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, tooltip }: { title: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#343a40' }}>{title}</h3>
        {tooltip && (
          <span title={tooltip} style={{ cursor: 'help', fontSize: '0.7rem', color: '#9ca3af' }}>ⓘ</span>
        )}
      </div>
      {children}
    </div>
  );
}
