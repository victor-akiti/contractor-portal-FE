'use client';
import type { DateRange, Period } from '../types';

const PRESET_PERIODS: Period[] = ['7d', '14d', '30d', '60d', '90d', '180d', '1y'];
const todayISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  period: Period;
  rawDateRange: DateRange;
  onChange: (period: Period, dateRange: DateRange) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function PeriodSelector({ period, rawDateRange, onChange, onRefresh, loading }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
      padding: '0.5rem 0.75rem',
      background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
    }}>
      <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Period
      </span>
      {PRESET_PERIODS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p, { start: '', end: '' })}
          style={{
            padding: '0.18rem 0.6rem',
            border: `1px solid ${period === p ? '#e67509' : '#d1d5db'}`,
            borderRadius: '9999px',
            background: period === p ? '#e67509' : '#fff',
            color: period === p ? '#fff' : '#374151',
            fontSize: '0.78rem',
            cursor: 'pointer',
            fontWeight: period === p ? 600 : 400,
            transition: 'all 0.12s',
          }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange('custom', rawDateRange)}
        style={{
          padding: '0.18rem 0.6rem',
          border: `1px solid ${period === 'custom' ? '#7c3aed' : '#d1d5db'}`,
          borderRadius: '9999px',
          background: period === 'custom' ? '#7c3aed' : '#fff',
          color: period === 'custom' ? '#fff' : '#374151',
          fontSize: '0.78rem',
          cursor: 'pointer',
          fontWeight: period === 'custom' ? 600 : 400,
          transition: 'all 0.12s',
        }}
      >
        Custom
      </button>
      {period === 'custom' && (
        <>
          <input
            type="date"
            value={rawDateRange.start}
            max={rawDateRange.end || todayISO()}
            onChange={e => onChange('custom', { ...rawDateRange, start: e.target.value })}
            style={{ fontSize: '0.78rem', padding: '0.18rem 0.45rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>→</span>
          <input
            type="date"
            value={rawDateRange.end}
            min={rawDateRange.start}
            max={todayISO()}
            onChange={e => onChange('custom', { ...rawDateRange, end: e.target.value })}
            style={{ fontSize: '0.78rem', padding: '0.18rem 0.45rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff' }}
          />
          {(!rawDateRange.start || !rawDateRange.end) && (
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>pick both dates</span>
          )}
        </>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={!!loading}
          style={{
            marginLeft: 'auto',
            padding: '0.18rem 0.6rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            background: '#fff',
            fontSize: '0.78rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#374151',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      )}
    </div>
  );
}
