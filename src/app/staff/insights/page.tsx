'use client';
import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';

// Lazy-load heavy tab components so they don't bloat the initial bundle
const OverviewTab     = dynamic(() => import('./components/OverviewTab'),     { ssr: false });
const PipelineTab     = dynamic(() => import('./components/PipelineTab'),     { ssr: false });
const PerformanceTab  = dynamic(() => import('./components/PerformanceTab'),  { ssr: false });
const TrendsTab       = dynamic(() => import('./components/TrendsTab'),       { ssr: false });
const CertificatesTab = dynamic(() => import('./components/CertificatesTab'), { ssr: false });
const ExportTab       = dynamic(() => import('./components/ExportTab'),       { ssr: false });

// ── Role constants ────────────────────────────────────────────────────────────
const PERFORMANCE_ROLES = ['Admin', 'HOD', 'VRM', 'C&P Admin', 'Executive Approver'];
const EXPORT_ROLES      = ['Admin', 'HOD', 'VRM', 'C&P Admin'];

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'overview' | 'pipeline' | 'performance' | 'trends' | 'certificates' | 'export';

interface TabDef {
  key: TabKey;
  label: string;
  requiredRoles?: string[];
}

const ALL_TABS: TabDef[] = [
  { key: 'overview',      label: 'Overview' },
  { key: 'pipeline',      label: 'Pipeline' },
  { key: 'performance',   label: 'Performance', requiredRoles: PERFORMANCE_ROLES },
  { key: 'trends',        label: 'Trends' },
  { key: 'certificates',  label: 'Certificates' },
  { key: 'export',        label: 'Export',       requiredRoles: EXPORT_ROLES },
];

// ── Tab content map ───────────────────────────────────────────────────────────
const TAB_COMPONENTS: Record<TabKey, React.ComponentType> = {
  overview:     OverviewTab,
  pipeline:     PipelineTab,
  performance:  PerformanceTab,
  trends:       TrendsTab,
  certificates: CertificatesTab,
  export:       ExportTab,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const user = useSelector((state: { user: { user: { role?: string } | null } }) => state.user.user);
  const role = user?.role ?? '';

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  // Keep previously visited tabs mounted to avoid refetch on revisit
  const [visited, setVisited] = useState<TabKey[]>(['overview']);

  const visibleTabs = useMemo(
    () => ALL_TABS.filter(t => !t.requiredRoles || t.requiredRoles.includes(role)),
    [role],
  );

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    setVisited(prev => prev.includes(key) ? prev : [...prev, key]);
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div style={{ fontFamily: 'inherit', color: '#212529' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700, color: '#343a40' }}>
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

      {/* ── Tab content — keep visited tabs in DOM but hidden ── */}
      <div>
        {visibleTabs.map(tab => {
          const Comp = TAB_COMPONENTS[tab.key];
          if (!visited.includes(tab.key)) return null;
          return (
            <div key={tab.key} style={{ display: activeTab === tab.key ? 'block' : 'none' }}>
              <Comp />
            </div>
          );
        })}
      </div>
    </div>
  );
}
