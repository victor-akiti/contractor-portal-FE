'use client';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorCard({ message = 'Failed to load data', onRetry }: ErrorCardProps) {
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.5rem',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      <span style={{ color: '#dc2626', fontSize: '0.9rem' }}>⚠ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.4rem 0.9rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
