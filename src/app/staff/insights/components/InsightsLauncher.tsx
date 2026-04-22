'use client';

/**
 * Reusable launcher for the Insights section.
 * Renders as a navigation link or, when asModal=true, opens the insights page
 * inside a full-screen modal overlay.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';

const InsightsPage = lazy(() => import('../page'));

interface InsightsLauncherProps {
  asModal?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function InsightsLauncher({
  asModal = false,
  label = 'Approval Insights',
  className,
  style,
}: InsightsLauncherProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!asModal) {
    return (
      <Link
        href="/staff/insights"
        className={className}
        style={style}
      >
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className}
        style={{
          background: '#e67509',
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          padding: '0.5rem 1.1rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer',
          ...style,
        }}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '2rem 1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div style={{
            background: '#fff',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: 1100,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e0e0e0',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1,
            }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#343a40' }}>
                Approval Insights & Reporting
              </h2>
              <button
                onClick={close}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Page content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Suspense fallback={
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Loading insights…</div>
              }>
                <InsightsPage />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
