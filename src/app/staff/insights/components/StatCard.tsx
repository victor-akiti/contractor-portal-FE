'use client';

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  icon?: React.ReactNode;
}

const colorMap = {
  default: { border: '#e67509', bg: '#fff8f3', text: '#e67509' },
  green:   { border: '#16a34a', bg: '#f0fdf4', text: '#16a34a' },
  amber:   { border: '#d97706', bg: '#fffbeb', text: '#d97706' },
  red:     { border: '#dc2626', bg: '#fef2f2', text: '#dc2626' },
  blue:    { border: '#2563eb', bg: '#eff6ff', text: '#2563eb' },
  purple:  { border: '#7c3aed', bg: '#f5f3ff', text: '#7c3aed' },
};

export default function StatCard({ label, value, sub, color = 'default', icon }: StatCardProps) {
  const c = colorMap[color];
  const display = value === null || value === undefined ? '—' : value;

  return (
    <div style={{
      background: c.bg,
      borderLeft: `4px solid ${c.border}`,
      borderRadius: '0.5rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && <span style={{ color: c.text, opacity: 0.7 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: '1.6rem', fontWeight: 700, color: c.text, lineHeight: 1.2 }}>
        {display}
      </span>
      {sub && <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{sub}</span>}
    </div>
  );
}
