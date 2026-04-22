'use client';
import { useState, useMemo } from 'react';
import type { SortDir } from '../types';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortFn?: (a: T, b: T) => number;
  width?: string;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
  maxRows?: number;
  rowStyle?: (row: T, index: number) => React.CSSProperties;
}

export default function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 'desc',
  maxRows,
  rowStyle,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find(c => c.key === sortKey);
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (col?.sortFn) {
        cmp = col.sortFn(a, b);
      } else {
        const av = a[sortKey as keyof T];
        const bv = b[sortKey as keyof T];
        if (av == null && bv == null) cmp = 0;
        else if (av == null) cmp = 1;
        else if (bv == null) cmp = -1;
        else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const displayed = maxRows ? sorted.slice(0, maxRows) : sorted;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const arrow = (key: string) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e0e0e0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
            {columns.map(col => (
              <th
                key={String(col.key)}
                onClick={() => handleSort(String(col.key))}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#343a40',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: col.width,
                }}
              >
                {col.label}{arrow(String(col.key))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                No data
              </td>
            </tr>
          ) : (
            displayed.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: idx % 2 === 0 ? '#fff' : '#fafafa',
                  ...(rowStyle ? rowStyle(row, idx) : {}),
                }}
              >
                {columns.map(col => (
                  <td key={String(col.key)} style={{ padding: '0.7rem 1rem', verticalAlign: 'middle' }}>
                    {col.render
                      ? col.render(row)
                      : (row[col.key as keyof T] == null ? '—' : String(row[col.key as keyof T]))}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
