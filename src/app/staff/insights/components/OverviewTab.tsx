'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchCertificates, fetchDashboard, fetchNarrative } from '../api';
import type {
  CertificatesData, DashboardData, DateRange,
  NarrativeData, Period, PriorityVendors,
} from '../types';
import ErrorCard from './ErrorCard';
import { CardsSkeleton, ChartSkeleton } from './LoadingSkeleton';
import PeriodSelector from './PeriodSelector';
import StatCard from './StatCard';

const fmt = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);
const fmtChg = (v: number | null | undefined) =>
  v == null ? null : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const FLAG_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
};

const NARRATIVE_CHIP: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#fef2f2', color: '#dc2626' },
  warning: { bg: '#fffbeb', color: '#b45309' },
  info: { bg: '#eff6ff', color: '#1d4ed8' },
  success: { bg: '#f0fdf4', color: '#16a34a' },
};

const TREND_SERIES: { key: string; label: string; color: string }[] = [
  { key: 'progressions', label: 'Progressions', color: '#e67509' },
  { key: 'approvals', label: 'Approvals', color: '#16a34a' },
  { key: 'registrations', label: 'Registrations', color: '#2563eb' },
  { key: 'returns', label: 'Returns', color: '#d97706' },
  { key: 'holds', label: 'Parked', color: '#dc2626' },
];

function CardDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e0e0e0)' }} />
      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d1d5db' }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #e0e0e0)' }} />
    </div>
  );
}

interface OverviewTabProps {
  period: Period;
  dateRange?: DateRange;
  rawDateRange: DateRange;
  onPeriodChange: (p: Period, dr: DateRange) => void;
}

export default function OverviewTab({ period, dateRange, rawDateRange, onPeriodChange }: OverviewTabProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [certData, setCertData] = useState<CertificatesData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [errorMain, setErrorMain] = useState<string | null>(null);
  const [errorNarrative, setErrorNarrative] = useState<string | null>(null);

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
      setErrorMain('Could not load dashboard data');
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
      setErrorNarrative('Could not load summary');
    } finally {
      setLoadingNarrative(false);
    }
  }, []);

  useEffect(() => { loadMain(); }, [loadMain]);
  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  const trendData = dashboard
    ? dashboard.trends.labels.map((label, i) => {
      const s = dashboard.trends.series;
      return {
        label,
        progressions: s.progressions[i] ?? 0,
        approvals: s.approvals[i] ?? 0,
        registrations: s.registrations[i] ?? 0,
        returns: s.returns[i] ?? 0,
        holds: s.holds[i] ?? 0,
      };
    })
    : [];

  // Map API shape { label, value, color } to Recharts-friendly { name, value, color }
  const distribution = (dashboard?.pipeline.distribution ?? []).map(d => ({
    name: d.label,
    value: d.value,
    color: d.color,
  }));

  const chg = dashboard?.periodComparison.changePercent;
  const chgStr = fmtChg(chg);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 1. Overview Summary */}
      {/* <Section title="Overview Summary">
        {loadingNarrative ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} style={{ height: 13, width: `${w}%`, background: '#f0f0f0', borderRadius: 4 }} />
            ))}
          </div>
        ) : errorNarrative ? (
          <ErrorCard message={errorNarrative} onRetry={loadNarrative} />
        ) : narrative ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: '#374151', lineHeight: 1.7, margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
              {narrative.narrative}
            </p>
            {narrative.highlights.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {narrative.highlights.map((h, i) => {
                  const s = NARRATIVE_CHIP[h.type] ?? NARRATIVE_CHIP.info;
                  return (
                    <span key={i} style={{ background: s.bg, color: s.color, borderRadius: '9999px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 500 }}>
                      {h.message}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Section> */}



      {/* 3. KPI cards */}
      {loadingMain ? (
        <CardsSkeleton count={9} />
      ) : errorMain ? (
        <ErrorCard message={errorMain} onRetry={loadMain} />
      ) : dashboard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Who's in the system */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Approved"
              value={dashboard.kpis.totalApproved}
              sub={`out of ${dashboard.kpis.totalRegistered} total registered contractors (${fmtPct((dashboard.kpis.totalApproved * 100) / dashboard.kpis.totalRegistered)})`}
              color="brand" />
            <StatCard label="Within Amni Review" value={dashboard.kpis.totalInPipeline} color="blue"
              sub={`${fmtPct((dashboard.kpis.totalInPipeline * 100) / dashboard.kpis.totalRegistered)} of total registered contractors ${dashboard.kpis.priorityInPipeline > 0 ? `of which ${dashboard.kpis.priorityInPipeline} are priority` : ''} `}
            />
            {/* <StatCard label="Registered" value={dashboard.kpis.totalRegistered} color="blue" /> */}
            <StatCard label="Not Yet Submitted" value={dashboard.kpis.notSubmitted} color="default" />
          </div>
          <CardDivider />
          {/* How we're doing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>

            <StatCard label="Approval rate"
              value={fmtPct(dashboard.kpis.completionRate)}
              sub={`Total registered contractors: ${dashboard.kpis.totalRegistered}`}
              color="brand" />
            <StatCard label="Avg time to approve"
              value={fmt(dashboard.kpis.avgCycleDays)}
              sub="days"
              color="default" />
          </div>
          <CardDivider />
          {/* Where they are */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Returned to Contractor" sub={`Out of ${dashboard.kpis.totalRegistered} total registered contractors (${fmtPct((dashboard.kpis.returned * 100) / dashboard.kpis.totalRegistered)})`} value={dashboard.kpis.returned} color="amber" />
            <StatCard label="Parked" sub={`Out of ${dashboard.kpis.totalRegistered} total registered contractors (${fmtPct((dashboard.kpis.parked * 100) / dashboard.kpis.totalRegistered)})`} value={dashboard.kpis.parked} color="red" />
            {/* {dashboard.kpis.priorityInPipeline > 0 && (
              <StatCard label="Priority in review" value={dashboard.kpis.priorityInPipeline} color="purple" />
            )} */}
          </div>
          <CardDivider />
          {/* Certificates quick look */}
          {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Certs in review" value={certData?.statusBreakdown.pending ?? '—'} color="amber" />
            <StatCard label="Expired certs" value={certData?.expiryBreakdown.expired ?? '—'} color="red" />
            <StatCard label="Expiring soon" value={certData?.expiryBreakdown.expiringSoon ?? '—'} color="amber" />
          </div> */}
        </div>
      )}

      {/* Period selector — sits between the live KPI cards above and the period-filtered charts below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity &amp; trends — filtered by period
        </p>
        <PeriodSelector
          period={period}
          rawDateRange={rawDateRange}
          onChange={onPeriodChange}
          onRefresh={loadMain}
          loading={loadingMain}
        />
      </div>

      {/* 2. Flags */}
      {/* {!loadingMain && !errorMain && dashboard && dashboard.flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {dashboard.flags.map((flag, i) => {
            const s = FLAG_STYLES[flag.severity] ?? FLAG_STYLES.info;
            return (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: '0.375rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}>
                {flag.message}
              </div>
            );
          })}
        </div>
      )} */}


      {/* 5. Activity trend */}
      <Section title="Activity over time" subtitle="How busy the pipeline has been over the selected period — new registrations, progressions through stages, approvals, and returns. A flat line means things have slowed down.">
        {loadingMain ? <ChartSkeleton height={240} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              {TREND_SERIES.map(s => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* 6. Pipeline distribution */}
      <Section title="Where contractors are right now" subtitle="Live snapshot of how contractors are spread across the pipeline. This doesn't change with the period — it shows what's happening at this moment. The bottleneck is the stage where contractors are waiting the longest.">
        {loadingMain ? <ChartSkeleton height={220} /> : errorMain ? null : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            {distribution.length > 0 ? (
              <PieChart width={210} height={210}>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  cx={105}
                  cy={105}
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {distribution.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [`${v} contractors`, name]} />
              </PieChart>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No pipeline data yet</p>
            )}

            {/* Custom legend + bottleneck */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {distribution.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ color: '#374151', flex: 1 }}>{d.name}</span>
                    <span style={{ color: '#6c757d', fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>

              {dashboard!.pipeline.bottleneck && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem 1rem' }}>
                  <p style={{ margin: '0 0 0.15rem', fontSize: '0.72rem', color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>Bottleneck</p>
                  <p style={{ margin: '0 0 0.15rem', fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                    {dashboard!.pipeline.bottleneck.stage}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#374151' }}>
                    avg {fmt(dashboard!.pipeline.bottleneck.avgDays)} days waiting
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* 7. Avg wait per stage */}
      <Section title="How long each stage is taking" subtitle="Average time contractors are currently sitting at each review stage. The longer the bar, the more work has piled up there. This feeds directly into the bottleneck calculation above.">
        {loadingMain ? <ChartSkeleton height={200} /> : errorMain ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={dashboard!.pipeline.avgDwellPerReviewStage.map(d => ({ stage: d.stage, days: d.avgDays ?? 0 }))}
              layout="vertical"
              margin={{ top: 4, right: 50, bottom: 4, left: 70 }}
            >
              <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} days`]} />
              <Bar dataKey="days" fill="#e67509" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* 8. Priority contractors */}
      {!loadingMain && !errorMain && dashboard?.priorityVendors && dashboard.priorityVendors.total > 0 && (
        <PriorityFastTrackCard pv={dashboard.priorityVendors} />
      )}

      {/* 9. Certificates brief */}
      <Section title="Certificates" subtitle={`Cert review queue and expiry health. \"Approved\" and \"Rejected\" counts are for the selected period. Everything else is a live count. Full details are in the Certificates tab.`}>
        {loadingMain ? <ChartSkeleton height={80} /> : errorMain ? null : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Total tracked" value={certData?.statusBreakdown.totalTracked} color="default" />
            <StatCard label="In review" value={certData?.statusBreakdown.pending} color="amber" />
            <StatCard label="Approved (period)" value={certData?.statusBreakdown.approvedInPeriod} color="brand" />
            <StatCard label="Rejected (period)" value={certData?.statusBreakdown.rejectedInPeriod} color="red" />
            <StatCard label="Expired" value={certData?.expiryBreakdown.expired} color="red" />
            <StatCard label="Expiring soon" value={certData?.expiryBreakdown.expiringSoon} color="amber" />
          </div>
        )}
      </Section>
    </div>
  );
}

function PriorityFastTrackCard({ pv }: { pv: PriorityVendors }) {
  const urgentList = pv.urgentList ?? [];
  const urgentCount = urgentList.length;
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
          Priority contractors
        </h3>
        {urgentCount > 0 && (
          <span style={{ background: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {urgentCount} waiting over 7 days
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total', value: pv.total, color: '#e67509' },
          { label: 'In pipeline', value: pv.inPipeline, color: '#1e40af' },
          { label: 'Approved', value: pv.approved, color: '#e67509' },
          { label: 'Returned', value: pv.returned, color: '#92400e' },
          { label: 'Parked', value: pv.parked, color: '#b91c1c' },
          {
            label: 'Approval rate',
            value: pv.approvalRate != null ? `${pv.approvalRate.toFixed(1)}%` : '—',
            color: '#e67509',
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {stageEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: urgentCount > 0 ? '1rem' : 0 }}>
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
            These need attention - priority and waiting over 7 days:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #fecaca' }}>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', color: '#7f1d1d', fontWeight: 600 }}>Contractor</th>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', color: '#7f1d1d', fontWeight: 600, width: 90 }}>Stage</th>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#7f1d1d', fontWeight: 600, width: 110 }}>Days waiting</th>
              </tr>
            </thead>
            <tbody>
              {urgentList.map((v, i) => (
                <tr key={i} style={{ borderTop: i > 0 ? '1px solid #fee2e2' : undefined }}>
                  <td style={{ padding: '0.3rem 0.5rem', fontWeight: 500 }}>{v.companyName}</td>
                  <td style={{ padding: '0.3rem 0.5rem', color: '#6c757d' }}>{v.stage}</td>
                  <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                    {v.daysWaiting.toFixed(0)}d
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

function Section({ title, subtitle, children, tooltip }: { title: string; subtitle?: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: subtitle ? '0.2rem' : '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#343a40' }}>{title}</h3>
        {tooltip && <span title={tooltip} style={{ cursor: 'help', fontSize: '0.7rem', color: '#9ca3af' }}>ⓘ</span>}
      </div>
      {subtitle && <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#6c757d', lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );
}
