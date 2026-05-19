import { getProtected } from '@/requests/get';
import { BACKEND_BASE_URL } from '@/lib/config';
import type {
  PipelineData,
  PerformanceData,
  CertificatesData,
  TrendsData,
  ExecSummaryData,
  NarrativeData,
  DashboardData,
  Period,
  DateRange,
} from './types';

type ApiResponse<T> = { status: string; data: T } | T;

function unwrap<T>(res: ApiResponse<T>): T {
  if (res && typeof res === 'object' && 'status' in res && 'data' in res) {
    return (res as { status: string; data: T }).data;
  }
  return res as T;
}

function periodQS(period: Period, dateRange?: DateRange): string {
  if (period === 'custom' && dateRange) {
    return `period=custom&s=${dateRange.start}&e=${dateRange.end}`;
  }
  return `period=${period}`;
}

// ── Request cache ─────────────────────────────────────────────────────────────
// inflightCache deduplicates concurrent calls for the same key.
// resultCache serves TTL-fresh results without a network round-trip.

const inflightCache = new Map<string, Promise<unknown>>();
const resultCache   = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS  = 3 * 60_000; // 3 minutes

function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const inflight = inflightCache.get(key);
  if (inflight) return inflight as Promise<T>;

  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Promise.resolve(cached.data as T);
  }

  const p = fetcher()
    .then(data => {
      resultCache.set(key, { data, ts: Date.now() });
      inflightCache.delete(key);
      return data;
    })
    .catch(err => {
      inflightCache.delete(key);
      throw err;
    });

  inflightCache.set(key, p as Promise<unknown>);
  return p;
}

// ── Prefetch ──────────────────────────────────────────────────────────────────
// Fires all period-sensitive fetches in parallel so tab switches hit the cache.

export function prefetchAll(period: Period = '30d', dateRange?: DateRange): void {
  fetchDashboard(period, dateRange);
  fetchPipeline(period, dateRange);
  fetchPerformance(period, dateRange);
  fetchTrends(period, dateRange);
  fetchCertificates(period, dateRange);
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export function fetchPipeline(period: Period = '30d', dateRange?: DateRange): Promise<PipelineData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`pipeline::${qs}`, async () => {
    const res = await getProtected(`insights/pipeline?${qs}`, 'Admin');
    return unwrap<PipelineData>(res);
  });
}

export function fetchPerformance(period: Period = '30d', dateRange?: DateRange): Promise<PerformanceData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`performance::${qs}`, async () => {
    const res = await getProtected(`insights/performance?${qs}`, 'Admin');
    return unwrap<PerformanceData>(res);
  });
}

export function fetchCertificates(period: Period = '30d', dateRange?: DateRange): Promise<CertificatesData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`certificates::${qs}`, async () => {
    const res = await getProtected(`insights/certificates?${qs}`, 'Admin');
    return unwrap<CertificatesData>(res);
  });
}

export function fetchTrends(period: Period = '30d', dateRange?: DateRange): Promise<TrendsData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`trends::${qs}`, async () => {
    const res = await getProtected(`insights/trends?${qs}`, 'Admin');
    return unwrap<TrendsData>(res);
  });
}

export function fetchDashboard(period: Period = '30d', dateRange?: DateRange): Promise<DashboardData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`dashboard::${qs}`, async () => {
    const res = await getProtected(`insights/dashboard?${qs}`, 'Admin');
    return unwrap<DashboardData>(res);
  });
}

export function fetchExecSummary(period: Period = '30d', dateRange?: DateRange): Promise<ExecSummaryData> {
  const qs = periodQS(period, dateRange);
  return cachedFetch(`executive-summary::${qs}`, async () => {
    const res = await getProtected(`insights/executive-summary?${qs}`, 'Admin');
    return unwrap<ExecSummaryData>(res);
  });
}

export function fetchNarrative(focus: 'pipeline' | 'performance' | 'certs' | 'all' = 'all'): Promise<NarrativeData> {
  return cachedFetch(`narrative::${focus}`, async () => {
    const res = await getProtected(`insights/narrative?focus=${focus}`, 'Admin');
    return unwrap<NarrativeData>(res);
  });
}

export async function downloadExport(path: string, filename: string): Promise<void> {
  const { auth } = await import('@/lib/firebase');
  const { getIdToken } = await import('firebase/auth');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await getIdToken(user);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // continue without auth header — cookie handles it
  }

  const res = await fetch(`${BACKEND_BASE_URL}/${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Download failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
