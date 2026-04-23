// ── Pipeline ──────────────────────────────────────────────────────────────────
export interface StageCounts {
  inProgress: number;
  stageA: number;
  stageB: number;
  stageC: number;
  stageD: number;
  stageE: number;
  stageF: number;
  l3: number;
  returned: number;
  parked: number;
  parkRequested: number;
}

export interface OldestPendingItem {
  stage: string;
  companyName: string;
  companyId: string;
  entryTime: string;
  daysWaiting: number;
}

export interface PipelineData {
  stageCounts: StageCounts;
  avgDwellPerStage: Record<string, number | null>;
  oldestPendingPerStage: OldestPendingItem[];
  throughput: {
    progressionsLast7Days: number;
    progressionsLast30Days: number;
    l3ApprovalsLast7Days: number;
    l3ApprovalsLast30Days: number;
  };
  summary: {
    totalCompanies: number;
    totalInPipeline: number;
    completionRate: number;
    avgTotalCycleDays: number | null;
  };
}

// ── Performance ───────────────────────────────────────────────────────────────
export interface ApproverRecord {
  name: string;
  email: string;
  role: string;
  totalActions: number;
  recentActions: number;
  avgResponseDays: number | null;
  stageBreakdown: { A: number; B: number; C: number; D: number; E: number; F: number };
  returnsInitiated: number;
  holdsInitiated: number;
  recentProgressions: number;
}

export interface StageLoad {
  stage: string;
  avgDwellDays: number | null;
  currentVendors: number;
  sampleSize: number;
  responsibleRoles: string[];
}

export interface PerformanceData {
  period: string;
  byApprover: ApproverRecord[];
  byStage: StageLoad[];
  bottleneck: StageLoad | null;
  pendingByStage: Record<string, { companyName: string; daysWaiting: number }[]>;
  summary: {
    totalApproversOnRecord: number;
    activeApproversInPeriod: number;
    systemAvgResponseDays: number | null;
    mostActiveApprover: string | null;
    bottleneckStage: string | null;
  };
}

// ── Certificates ──────────────────────────────────────────────────────────────
export interface ReviewerPerf {
  name: string;
  role: string;
  approved: number;
  rejected: number;
  total: number;
  avgReviewDays: number | null;
}

export interface CertificatesData {
  statusBreakdown: { pending: number; approved: number; rejected: number; total: number };
  approvalRate: number | null;
  avgReviewDays: number | null;
  expiryBreakdown: { expired: number; expiringSoon: number; healthy: number; noExpiry: number };
  pendingByCompany: { companyName: string; pendingCerts: number }[];
  reviewerPerformance: ReviewerPerf[];
  companiesWithPendingCerts: number;
  summary: {
    healthRate: number | null;
    pendingReviewBacklog: number;
    criticalExpiry: number;
    expiringSoon: number;
  };
}

// ── Trends ────────────────────────────────────────────────────────────────────
export interface TimeSeriesPoint {
  week: string;
  progressions: number;
  approvals: number;
  returns: number;
  holds: number;
  submissions: number;
}

export interface TrendsData {
  period: string;
  timeSeries: TimeSeriesPoint[];
  returnsByStage: { A: number; B: number; C: number; D: number; E: number; F: number; unknown: number };
  holdStats: { totalRequested: number; totalApproved: number; approvalRate: number | null };
  topReturnInitiators: { name: string; count: number }[];
  topHoldInitiators: { name: string; count: number }[];
  avgReturnToResubmitDays: number | null;
  periodComparison: {
    currentPeriodProgressions: number;
    prevPeriodProgressions: number;
    changePercent: number | null;
  };
  summary: {
    totalReturns: number;
    totalHolds: number;
    totalProgressions: number;
    totalL3Approvals: number;
    totalSubmissions: number;
  };
}

// ── Executive Summary ─────────────────────────────────────────────────────────
export interface ExecFlag {
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface ExecSummaryData {
  generatedAt: string;
  overview: {
    totalCompanies: number;
    totalInPipeline: number;
    totalApproved: number;
    completionRate: number | null;
    avgCycleDays: number | null;
    returned: number;
    parked: number;
    inProgress: number;
  };
  pipeline: {
    stageCounts: StageCounts;
    avgDwellPerStage: { stage: string; avgDays: number | null }[];
    bottleneck: { stage: string; avgDays: number | null } | null;
    staleVendors: { companyName: string; stage: string; daysWaiting: number }[];
  };
  activity: {
    last30Days: { progressions: number; approvals: number; returns: number; holds: number; submissions: number };
    last7Days: { progressions: number; approvals: number };
  };
  certificates: { pending: number; approved: number; rejected: number; expired: number; expiringSoon: number; total: number };
  dueDiligence: {
    atStageD: number;
    atStageE: number;
    currentlyAtDueDiligence: number;
    avgDaysAtStageD: number | null;
    avgDaysAtStageE: number | null;
  };
  flags: ExecFlag[];
}

// ── AI Narrative ──────────────────────────────────────────────────────────────
export interface NarrativeHighlight {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
}

export interface NarrativeData {
  narrative: string;
  provider: 'groq' | 'huggingface' | 'rule-based';
  highlights: NarrativeHighlight[];
  generatedAt: string;
  metricsSnapshot: Record<string, unknown>;
}

// ── Dashboard (unified single-call response) ──────────────────────────────────
export interface DashboardKpis {
  totalRegistered: number;
  totalInPipeline: number;
  totalApproved: number;
  completionRate: number | null;
  avgCycleDays: number | null;
  returned: number;
  parked: number;
  inProgress: number;
  certsPending: number;
  certsExpired: number;
  certsExpiringSoon: number;
}

export interface PipelineDistributionItem {
  label: string;
  value: number;
  color: string;
}

export interface DashboardTrends {
  labels: string[];
  series: {
    registrations: number[];
    submissions: number[];
    progressions: number[];
    approvals: number[];
    returns: number[];
    holds: number[];
    cumulativeApprovals: number[];
  };
  returnsByStage: { A: number; B: number; C: number; D: number; E: number; F: number; Unknown: number };
}

export interface DashboardData {
  generatedAt: string;
  period: string;
  bucketSize: 'day' | 'week' | 'month';
  kpis: DashboardKpis;
  pipeline: {
    stageCounts: StageCounts;
    distribution: PipelineDistributionItem[];
    avgDwellPerStage: { stage: string; avgDays: number | null }[];
    bottleneck: { stage: string; avgDays: number | null } | null;
    staleVendors: { companyName: string; stage: string; daysWaiting: number }[];
  };
  trends: DashboardTrends;
  activity: {
    last30Days: { progressions: number; approvals: number; returns: number; holds: number; submissions: number };
    last7Days: { progressions: number; approvals: number };
  };
  periodComparison: {
    currentPeriodProgressions: number;
    prevPeriodProgressions: number;
    changePercent: number | null;
  };
  certificates: { pending: number; approved: number; rejected: number; expired: number; expiringSoon: number; total: number };
  dueDiligence: {
    atStageD: number;
    atStageE: number;
    avgDaysAtStageD: number | null;
    avgDaysAtStageE: number | null;
  };
  holdStats: { totalApproved: number; periodHolds: number };
  flags: ExecFlag[];
}

// ── Shared ────────────────────────────────────────────────────────────────────
export type Period = '7d' | '14d' | '30d' | '60d' | '90d' | '180d' | '1y' | '3y' | '5y' | '10y';
export type SortDir = 'asc' | 'desc';
