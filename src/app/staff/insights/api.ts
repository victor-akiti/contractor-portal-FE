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
} from './types';

type ApiResponse<T> = { status: string; data: T } | T;

function unwrap<T>(res: ApiResponse<T>): T {
  if (res && typeof res === 'object' && 'status' in res && 'data' in res) {
    return (res as { status: string; data: T }).data;
  }
  return res as T;
}

export async function fetchPipeline(): Promise<PipelineData> {
  const res = await getProtected('insights/pipeline', 'Admin');
  return unwrap<PipelineData>(res);
}

export async function fetchPerformance(period: Period = '30d'): Promise<PerformanceData> {
  const res = await getProtected(`insights/performance?period=${period}`, 'Admin');
  return unwrap<PerformanceData>(res);
}

export async function fetchCertificates(): Promise<CertificatesData> {
  const res = await getProtected('insights/certificates', 'Admin');
  return unwrap<CertificatesData>(res);
}

export async function fetchTrends(period: Period = '30d'): Promise<TrendsData> {
  const res = await getProtected(`insights/trends?period=${period}`, 'Admin');
  return unwrap<TrendsData>(res);
}

export async function fetchDashboard(period: Period = '30d'): Promise<DashboardData> {
  const res = await getProtected(`insights/dashboard?period=${period}`, 'Admin');
  return unwrap<DashboardData>(res);
}

export async function fetchExecSummary(period: Period = '30d'): Promise<ExecSummaryData> {
  const res = await getProtected(`insights/executive-summary?period=${period}`, 'Admin');
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
