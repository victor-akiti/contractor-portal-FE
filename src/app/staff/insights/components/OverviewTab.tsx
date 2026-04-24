'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import StatCard from './StatCard';
import ErrorCard from './ErrorCard';
import SortableTable from './SortableTable';
import { CardsSkeleton, ChartSkeleton, TableSkeleton } from './LoadingSkeleton';
import { fetchDashboard, fetchCertificates, fetchNarrative } from '../api';
import type { DashboardData, CertificatesData, NarrativeData, PriorityVendors, Period } from '../types';

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

// Cert status colours: approved, pending, rejected, expiringSoon, expired
const CERT_STATUS_COLORS  = ['#16a34a', '#f59e0b', '#dc2626'];
// Cert expiry colours: expired, expiringSoon, healthy, noExpiry
const CERT_EXPIRY_COLORS  = ['#dc2626', '#f59e0b', '#16a34a', '#9ca3af'];

// ── Component ─────────────────────────────────────────────────────────────────
// period is controlled by the parent page (global selector above the tab bar)
export default function OverviewTab({ period }: { period: Period }) {
  const [dashboard,        setDashboard]        = useState<DashboardData | null>(null);
  // Cert data is fetched from /insights/certificates — the authoritative source
  // for cert pending/expired/expiringSoon counts (dashboard kpis.certsPending
  // reflects a broader query; the certificates endpoint counts only vendor-submitted
  // certs that are actually pending review in the cert-review queue).
  const [certData,         setCertData]         = useState<CertificatesData | null>(null);
  const [narrative,        setNarrative]        = useState<NarrativeData | null>(null);

  const [loadingMain,      setLoadingMain]      = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [errorMain,        setErrorMain]        = useState<string | null>(null);
  const [errorNarrative,   setErrorNarrative]   = useState<string | null>(null);

  // Fetch dashboard + certificates in parallel — single loading state covers both
  const loadMain = useCallback(async () => {
    setLoadingMain(true);
    setErrorMain(null);
    try {
      const [dash, certs] = await Promise.all([
        fetchDashboard(period),
        fetchCertificates(),
      ]);
      setDashboard(dash);
      setCertData(certs);
    } catch {
      setErrorMain('Failed to load dashboard data');
    } finally {
      setLoadingMain(false);
    }
  }, [period]);

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

  // Use authoritative cert counts from /insights/certificates
  const certStatusDonut = certData
    ? [
        { name: 'Approved', value: certData.statusBreakdown.approved },
        { name: 'Pending',  value: certData.statusBreakdown.pending },
        { name: 'Rejected', value: certData.statusBreakdown.rejected },
      ]
    : [];

  const certExpiryDonut = certData
    ? [
        { name: 'Expired',      value: certData.expiryBreakdown.expired },
        { name: 'Expiring Soon', value: certData.expiryBreakdown.expiringSoon },
        { name: 'Healthy',      value: certData.expiryBreakdown.healthy },
        { name: 'No Expiry',    value: certData.expiryBreakdown.noExpiry },
      ]
    : [];

  const staleVendors = (dashboard?.pipeline.staleVendors ?? []) as unknown as Record<string, unknown>[];

  const chg      = dashboard?.periodComparison.changePercent;
  const chgStr   = fmtChg(chg);
  const chgColor = chg == null ? '#9ca3af' : chg >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Refresh button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={loadMain}
          style={{ padding: '0.3rem 0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#374151' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── KPI stat cards ── */}
      {/*
        Vendor counts from dashboard:
          • totalRegistered  = vendors where isSubmitted=true
          • totalInPipeline  = isSubmitted=true, NOT parked/suspended, level 0-6 where isApproved=false
          • totalApproved    = level 5 & isApproved=true  OR  level 6+
          • returned / parked = respective status flags

        Cert counts below use /insights/certificates (the cert-review endpoint),
        NOT dashboard.kpis.certsPending which reflects a broader query.
      */}
      {loadingMain ? (
        <CardsSkeleton count={8} />
      ) : errorMain ? (
        <ErrorCard message={errorMain} onRetry={loadMain} />
      ) : dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Total Registered" value={dashboard.kpis.totalRegistered} color="default" />
          <StatCard label="In Pipeline"       value={dashboard.kpis.totalInPipeline} color="blue" />
          <StatCard label="L3 Approved"       value={dashboard.kpis.totalApproved}   color="green" />
          <StatCard
            label="Completion Rate"
            value={fmtPct(dashboard.kpis.completionRate)}
            sub={chgStr ? `${chgStr} vs prev` : undefined}
            color="purple"
          />
          <StatCard label="Avg Cycle Days"    value={fmt(dashboard.kpis.avgCycleDays)} sub="days" color="amber" />
          <StatCard label="Returned"          value={dashboard.kpis.returned}          color="amber" />
          <StatCard label="Parked"            value={dashboard.kpis.parked}            color="red" />
          {/* Cert counts sourced from /insights/certificates — the cert-review queue */}
          <StatCard
            label="Certs Pending Review"
            value={certData?.statusBreakdown.pending ?? '—'}
            color="amber"
          />
          <StatCard
            label="Certs Expired"
            value={certData?.expiryBreakdown.expired ?? '—'}
            color="red"
          />
          <StatCard
            label="Certs Expiring Soon"
            value={certData?.expiryBreakdown.expiringSoon ?? '—'}
            color="red"
          />
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
                  Avg {fmt(dashboard!.pipeline.bottleneck.avgDays)} days/vendor
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Avg dwell per stage ── */}
      <Section title="Avg Dwell Per Stage (days)">
        {loadingMain ? <ChartSkeleton height={200} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={dashboard!.pipeline.avgDwellPerStage.map(d => ({ ...d, days: d.avgDays ?? 0 }))}
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
        <Section title="Activity">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Progressions (30d)" value={dashboard.activity.last30Days.progressions} color="blue" />
            <StatCard label="Approvals (30d)"    value={dashboard.activity.last30Days.approvals}    color="green" />
            <StatCard label="Returns (30d)"      value={dashboard.activity.last30Days.returns}      color="amber" />
            <StatCard label="Holds (30d)"        value={dashboard.activity.last30Days.holds}        color="red" />
            <StatCard label="Submissions (30d)"  value={dashboard.activity.last30Days.submissions}  color="default" />
            <StatCard label="Progressions (7d)"  value={dashboard.activity.last7Days.progressions}  color="blue" />
            <StatCard label="Approvals (7d)"     value={dashboard.activity.last7Days.approvals}     color="green" />
            <StatCard label="Period Holds"       value={dashboard.holdStats.periodHolds}            color="red" />
          </div>
        </Section>
      )}

      {/* ── Due Diligence ── */}
      {!loadingMain && !errorMain && dashboard && (
        <Section title="Due Diligence (Stage D & E)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="At Stage D"         value={dashboard.dueDiligence.atStageD}          color="blue" />
            <StatCard label="At Stage E"         value={dashboard.dueDiligence.atStageE}          color="purple" />
            <StatCard label="Avg Days @ Stage D" value={fmt(dashboard.dueDiligence.avgDaysAtStageD)} sub="days" color="amber" />
            <StatCard label="Avg Days @ Stage E" value={fmt(dashboard.dueDiligence.avgDaysAtStageE)} sub="days" color="amber" />
          </div>
        </Section>
      )}

      {/* ── Certificate health — sourced from /insights/certificates ── */}
      <Section title="Certificate Health (from cert-review queue)">
        {loadingMain ? <ChartSkeleton height={240} /> : errorMain ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Summary stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <StatCard label="Total Certs"    value={certData?.statusBreakdown.total}             color="default" />
              <StatCard label="Approved"       value={certData?.statusBreakdown.approved}          color="green" />
              <StatCard label="Pending Review" value={certData?.statusBreakdown.pending}           color="amber" />
              <StatCard label="Rejected"       value={certData?.statusBreakdown.rejected}          color="red" />
              <StatCard label="Expired"        value={certData?.expiryBreakdown.expired}           color="red" />
              <StatCard label="Expiring Soon"  value={certData?.expiryBreakdown.expiringSoon}      color="red" />
              <StatCard label="Healthy"        value={certData?.expiryBreakdown.healthy}           color="green" />
              <StatCard label="Approval Rate"
                value={certData?.approvalRate != null ? `${certData.approvalRate.toFixed(1)}%` : '—'}
                color="green" />
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

      {/* ── Stale vendors table ── */}
      <Section title="Stale Vendors (waiting >14 days)">
        {loadingMain ? <TableSkeleton rows={5} /> : errorMain ? null : (
          staleVendors.length === 0
            ? <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No stale vendors — pipeline is moving well.</p>
            : (
              <SortableTable
                columns={[
                  { key: 'companyName', label: 'Company' },
                  { key: 'stage',       label: 'Stage',        width: '90px' },
                  { key: 'daysWaiting', label: 'Days Waiting', width: '120px',
                    render: (r) => (
                      <span style={{ color: (r.daysWaiting as number) > 30 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        {fmt(r.daysWaiting as number, 0)} days
                      </span>
                    )},
                ]}
                rows={staleVendors}
                defaultSortKey="daysWaiting"
                defaultSortDir="desc"
                rowStyle={(row) => ({
                  background: (row.daysWaiting as number) > 30 ? '#fff5f5' : '#fffdf0',
                })}
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
  const urgentCount = pv.urgentList.length;
  const stageEntries = Object.entries(pv.byStage).filter(([, v]) => v > 0);

  return (
    <div style={{
      background: '#fff8f3',
      border: `2px solid ${urgentCount > 0 ? '#dc2626' : '#e67509'}`,
      borderRadius: '0.5rem',
      padding: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e67509', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚡ Priority Fast-Track Vendors
        </h3>
        {urgentCount > 0 && (
          <span style={{
            background: '#dc2626', color: '#fff', borderRadius: '9999px',
            padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700,
          }}>
            {urgentCount} URGENT — waiting &gt;7 days
          </span>
        )}
      </div>

      {/* Summary stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Priority',   value: pv.total,      color: '#e67509' },
          { label: 'In Pipeline',      value: pv.inPipeline, color: '#2563eb' },
          { label: 'L3 Approved',      value: pv.approved,   color: '#16a34a' },
          { label: 'Returned',         value: pv.returned,   color: '#d97706' },
          { label: 'Parked',           value: pv.parked,     color: '#dc2626' },
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

      {/* Stage breakdown pills */}
      {stageEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: urgentCount > 0 ? '1rem' : 0 }}>
          {stageEntries.map(([stage, count]) => (
            <span key={stage} style={{
              background: '#e67509', color: '#fff', borderRadius: '9999px',
              padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 600,
            }}>
              {stage}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Urgent list */}
      {urgentCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
            Vendors needing immediate attention (priority + waiting &gt;7 days):
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #fecaca' }}>
                <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: '#7f1d1d', fontWeight: 600 }}>Company</th>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#343a40' }}>{title}</h3>
      {children}
    </div>
  );
}
