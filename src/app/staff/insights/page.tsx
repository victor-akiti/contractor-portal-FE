'use client';
import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
import type { Period } from './types';

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
  { key: 'overview',     label: 'Overview',     usesPeriod: true },
  { key: 'pipeline',     label: 'Pipeline' },
  { key: 'performance',  label: 'Performance',  requiredRoles: PERFORMANCE_ROLES, usesPeriod: true },
  { key: 'trends',       label: 'Trends',       usesPeriod: true },
  { key: 'certificates', label: 'Certificates' },
  { key: 'export',       label: 'Export',       requiredRoles: EXPORT_ROLES },
];

const ALL_PERIODS: Period[] = ['7d', '14d', '30d', '60d', '90d', '180d', '1y', '3y', '5y', '10y'];

// ── Component ──────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const user = useSelector((state: { user: { user: { role?: string } | null } }) => state.user.user);
  const role = user?.role ?? '';

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [visited,   setVisited]   = useState<TabKey[]>(['overview']);
  // Global period — shared across all period-aware tabs
  const [period, setPeriod]       = useState<Period>('30d');

  const visibleTabs = useMemo(
    () => ALL_TABS.filter(t => !t.requiredRoles || t.requiredRoles.includes(role)),
    [role],
  );

  const activePeriod = visibleTabs.find(t => t.key === activeTab)?.usesPeriod;

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    setVisited(prev => prev.includes(key) ? prev : [...prev, key]);
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

      {/* ── Global period selector (topmost control) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.75rem 1rem',
        background: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '0.5rem',
        marginBottom: '1.25rem',
      }}>
        <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, whiteSpace: 'nowrap' }}>
          PERIOD:
        </span>
        {ALL_PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '0.25rem 0.75rem',
              border: `1px solid ${period === p ? '#e67509' : '#d1d5db'}`,
              borderRadius: '9999px',
              background: period === p ? '#e67509' : '#fff',
              color: period === p ? '#fff' : '#374151',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: period === p ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        ))}
        {!activePeriod && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
            (period filter applies to Overview, Performance & Trends tabs)
          </span>
        )}
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
            <OverviewTab period={period} />
          </div>
        )}
        {visited.includes('pipeline') && (
          <div style={{ display: activeTab === 'pipeline' ? 'block' : 'none' }}>
            <PipelineTab />
          </div>
        )}
        {visited.includes('performance') && visibleTabs.some(t => t.key === 'performance') && (
          <div style={{ display: activeTab === 'performance' ? 'block' : 'none' }}>
            <PerformanceTab period={period} />
          </div>
        )}
        {visited.includes('trends') && (
          <div style={{ display: activeTab === 'trends' ? 'block' : 'none' }}>
            <TrendsTab period={period} />
          </div>
        )}
        {visited.includes('certificates') && (
          <div style={{ display: activeTab === 'certificates' ? 'block' : 'none' }}>
            <CertificatesTab />
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
