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

export async function fetchPipeline(period: Period = '30d', dateRange?: DateRange): Promise<PipelineData> {
  const res = await getProtected(`insights/pipeline?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<PipelineData>(res);
}

export async function fetchPerformance(period: Period = '30d', dateRange?: DateRange): Promise<PerformanceData> {
  const res = await getProtected(`insights/performance?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<PerformanceData>(res);
}

export async function fetchCertificates(period: Period = '30d', dateRange?: DateRange): Promise<CertificatesData> {
  const res = await getProtected(`insights/certificates?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<CertificatesData>(res);
}

export async function fetchTrends(period: Period = '30d', dateRange?: DateRange): Promise<TrendsData> {
  const res = await getProtected(`insights/trends?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<TrendsData>(res);
}

export async function fetchDashboard(period: Period = '30d', dateRange?: DateRange): Promise<DashboardData> {
  const res = await getProtected(`insights/dashboard?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<DashboardData>(res);
}

export async function fetchExecSummary(period: Period = '30d', dateRange?: DateRange): Promise<ExecSummaryData> {
  const res = await getProtected(`insights/executive-summary?${periodQS(period, dateRange)}`, 'Admin');
  return unwrap<ExecSummaryData>(res);
}

export async function fetchNarrative(focus: 'pipeline' | 'performance' | 'certs' | 'all' = 'all'): Promise<NarrativeData> {
  const res = await getProtected(`insights/narrative?focus=${focus}`, 'Admin');
  return unwrap<NarrativeData>(res);
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
