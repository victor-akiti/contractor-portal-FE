'use client';
import { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  color?: 'default' | 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  icon?: React.ReactNode;
  tooltip?: string;
}

const colorMap = {
  default: { border: '#d1d5db', bg: '#f9fafb', text: '#374151' },
  brand:   { border: '#e67509', bg: '#fff8f3', text: '#e67509' },
  green:   { border: '#86efac', bg: '#f0fdf4', text: '#15803d' },
  amber:   { border: '#fcd34d', bg: '#fffbeb', text: '#92400e' },
  red:     { border: '#fca5a5', bg: '#fff5f5', text: '#b91c1c' },
  blue:    { border: '#93c5fd', bg: '#eff6ff', text: '#1e40af' },
  purple:  { border: '#c4b5fd', bg: '#faf5ff', text: '#7e22ce' },
};

export default function StatCard({ label, value, sub, color = 'default', icon, tooltip }: StatCardProps) {
  const c = colorMap[color];
  const display = value === null || value === undefined ? '—' : value;
  const [tipVisible, setTipVisible] = useState(false);

  return (
    <div style={{
      background: c.bg,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: '0.5rem',
      padding: '0.875rem 1.125rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',
      minWidth: 0,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {icon && <span style={{ color: c.text, opacity: 0.7 }}>{icon}</span>}
          {tooltip && (
            <span
              onMouseEnter={() => setTipVisible(true)}
              onMouseLeave={() => setTipVisible(false)}
              style={{ cursor: 'help', fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1, userSelect: 'none' }}
            >
              ⓘ
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: c.text, lineHeight: 1.2 }}>
        {display}
      </span>
      {sub && <span style={{ fontSize: '0.72rem', color: '#6c757d' }}>{sub}</span>}

      {tooltip && tipVisible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: 0,
          zIndex: 50,
          background: '#1e293b',
          color: '#f1f5f9',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          maxWidth: '240px',
          whiteSpace: 'normal',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
