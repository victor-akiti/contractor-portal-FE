'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
import type { Period, DateRange } from './types';
import { prefetchAll } from './api';

// Lazy-load heavy tab components
const OverviewTab     = dynamic(() => import('./components/OverviewTab'),     { ssr: false });
const PipelineTab     = dynamic(() => import('./components/PipelineTab'),     { ssr: false });
const PerformanceTab  = dynamic(() => import('./components/PerformanceTab'),  { ssr: false });
const TrendsTab       = dynamic(() => import('./components/TrendsTab'),       { ssr: false });
const CertificatesTab = dynamic(() => import('./components/CertificatesTab'), { ssr: false });
const ExportTab       = dynamic(() => import('./components/ExportTab'),       { ssr: false });

// ── Role constants ─────────────────────────────────────────────────────────────
const PERFORMANCE_ROLES = ['Admin', 'HOD', 'VRM', 'C&P Admin', 'Executive Approver'];
const EXPORT_ROLES      = ['Admin', 'HOD', 'VRM', 'C&P Admin'];

type TabKey = 'overview' | 'pipeline' | 'performance' | 'trends' | 'certificates' | 'export';

interface TabDef {
  key: TabKey;
  label: string;
  requiredRoles?: string[];
  usesPeriod?: boolean;
}

const ALL_TABS: TabDef[] = [
  { key: 'overview',     label: 'Overview',      usesPeriod: true },
  { key: 'pipeline',     label: 'Pipeline',      usesPeriod: true },
  { key: 'trends',       label: 'Trends',        usesPeriod: true },
  { key: 'performance',  label: 'Performance',   requiredRoles: PERFORMANCE_ROLES, usesPeriod: true },
  { key: 'certificates', label: 'Certificates',  usesPeriod: true },
  { key: 'export',       label: 'Export',        requiredRoles: EXPORT_ROLES },
];

// ── Suspense wrapper — required for useSearchParams in App Router ─────────────
export default function InsightsPage() {
  return (
    <Suspense>
      <InsightsPageInner />
    </Suspense>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
function InsightsPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const user = useSelector((state: { user: { user: { role?: string } | null } }) => state.user.user);
  const role = user?.role ?? '';

  // Initialise active tab from URL — only read once on mount
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const t = searchParams.get('tab') as TabKey;
    return t && ALL_TABS.some(d => d.key === t) ? t : 'overview';
  });
  const [visited, setVisited] = useState<TabKey[]>(() => {
    const t = searchParams.get('tab') as TabKey;
    const initial = t && ALL_TABS.some(d => d.key === t) ? t : 'overview';
    return [initial];
  });
  const [period, setPeriod]       = useState<Period>('30d');
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });

  const visibleTabs = useMemo(
    () => ALL_TABS.filter(t => !t.requiredRoles || t.requiredRoles.includes(role)),
    [role],
  );

  // Only pass dateRange when both dates are filled in custom mode
  const effectiveDateRange: DateRange | undefined =
    period === 'custom' && dateRange.start && dateRange.end ? dateRange : undefined;

  // Fire all tab fetches in parallel whenever period changes so tabs load instantly
  useEffect(() => {
    prefetchAll(period, effectiveDateRange);
  }, [period, effectiveDateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    setVisited(prev => prev.includes(key) ? prev : [...prev, key]);
    router.replace(`?tab=${key}`, { scroll: false });
  };

  const handlePeriodChange = (p: Period, dr: DateRange) => {
    setPeriod(p);
    setDateRange(dr);
  };

  // Common props for all period-aware tabs
  const tabProps = {
    period,
    dateRange: effectiveDateRange,
    rawDateRange: dateRange,
    onPeriodChange: handlePeriodChange,
  };

  return (
    <div style={{ fontFamily: 'inherit', color: '#212529' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: '0 0 0.2rem', fontSize: '1.5rem', fontWeight: 700, color: '#343a40' }}>
          Approval Insights & Reporting
        </h1>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
          Analytics and reporting for the contractor registration pipeline.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        flexWrap: 'nowrap',
      }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            style={{
              padding: '0.7rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #e67509' : '3px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? '#e67509' : '#6c757d',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: '-2px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content — keep visited tabs mounted so period changes refetch ── */}
      <div>
        {visited.includes('overview') && (
          <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            <OverviewTab {...tabProps} />
          </div>
        )}
        {visited.includes('pipeline') && (
          <div style={{ display: activeTab === 'pipeline' ? 'block' : 'none' }}>
            <PipelineTab {...tabProps} />
          </div>
        )}
        {visited.includes('performance') && visibleTabs.some(t => t.key === 'performance') && (
          <div style={{ display: activeTab === 'performance' ? 'block' : 'none' }}>
            <PerformanceTab {...tabProps} />
          </div>
        )}
        {visited.includes('trends') && (
          <div style={{ display: activeTab === 'trends' ? 'block' : 'none' }}>
            <TrendsTab {...tabProps} />
          </div>
        )}
        {visited.includes('certificates') && (
          <div style={{ display: activeTab === 'certificates' ? 'block' : 'none' }}>
            <CertificatesTab {...tabProps} />
          </div>
        )}
        {visited.includes('export') && visibleTabs.some(t => t.key === 'export') && (
          <div style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
            <ExportTab />
          </div>
        )}
      </div>
    </div>
  );
}
