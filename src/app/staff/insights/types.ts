// ── Pipeline ──────────────────────────────────────────────────────────────────
export interface StageCounts {
  stageA: number;
  stageB: number;
  stageC: number;
  stageD: number;
  stageE: number;
  stageF: number;
  stageG: number;
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

export interface StaleVendorItem {
  companyName: string;
  stage: string;
  daysWaiting: number;
  isPriority: boolean;
  status: 'active' | 'returned' | 'parked';
}

export interface PipelineData {
  period: string;
  stageCounts: StageCounts;
  avgDwellPerReviewStage: { stage: string; avgDays: number | null; sampleSize: number }[];
  bottleneck: { stage: string; avgDays: number | null; sampleSize: number } | null;
  oldestPendingPerStage: OldestPendingItem[];
  oldestReturned: OldestPendingItem | null;
  oldestParked: OldestPendingItem | null;
  throughput: {
    period: string;
    periodProgressions: number;
    periodL3Approvals: number;
    last7DaysProgressions: number;
    last7DaysL3Approvals: number;
  };
  summary: {
    totalVendorAccounts: number;
    totalRegistered: number;
    totalWithContractor: number;
    totalInPipeline: number;
    completionRate: number;
    avgCycleDays: number | null;
  };
  priorityVendors?: PriorityVendors;
}

// ── Performance ───────────────────────────────────────────────────────────────
export interface ApproverRecord {
  name: string;
  email: string;
  role: string;
  totalActions: number;
  avgResponseDays: number | null;
  stageBreakdown: { B: number; C: number; D: number; E: number; F: number; G: number };
  returnsInitiated: number;
  holdsInitiated: number;
  progressions: number;
}

export interface StageLoad {
  stage: string;
  avgCurrentDwellDays: number | null;
  avgCompletionDwellDays: number | null;
  completionSampleSize: number;
  currentVendors: number;
  responsibleRoles: string[];
}

export interface PerformanceData {
  period: string;
  byApprover: ApproverRecord[];
  byStage: StageLoad[];
  bottleneck: StageLoad | null;
  pendingByStage: Record<string, { companyName: string; daysWaiting: number }[]>;
  summary: {
    totalApproversInPeriod: number;
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
  period: string;
  statusBreakdown: {
    /** Current staff review queue — never period-filtered */
    pending: number;
    approvedInPeriod: number;
    rejectedInPeriod: number;
    totalTracked: number;
  };
  approvalRate: number | null;
  avgReviewDays: number | null;
  expiryBreakdown: { expired: number; expiringSoon: number; healthy: number; noExpiry: number };
  pendingByCompany: { companyName: string; pendingCerts: number }[];
  reviewerPerformance: ReviewerPerf[];
  companiesWithPendingCerts: number;
  summary: {
    healthRate: number | null;
    pendingReviewBacklog: number;
    reviewedInPeriod: number;
    criticalExpiry: number;
    expiringSoon: number;
  };
}

// ── Trends ────────────────────────────────────────────────────────────────────
export interface TrendsSeries {
  registrations: number[];
  submissions: number[];
  progressions: number[];
  approvals: number[];
  returns: number[];
  holds: number[];
  cumulativeApprovals: number[];
}

export interface TrendsData {
  period: string;
  bucketSize: 'day' | 'week' | 'month';
  trends: {
    labels: string[];
    series: TrendsSeries;
  };
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

// ── Shared types used across multiple responses ────────────────────────────────
export interface ExecFlag {
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface PriorityVendorUrgent {
  companyName: string;
  stage: string;
  daysWaiting: number;
}

export interface PriorityVendors {
  total: number;
  approved: number;
  inPipeline: number;
  returned: number;
  parked: number;
  byStage: Record<string, number>;
  approvalRate: number | null;
  urgentList: PriorityVendorUrgent[];
}

// ── Executive Summary ─────────────────────────────────────────────────────────
export interface ExecSummaryData {
  generatedAt: string;
  period: string;
  bucketSize: 'day' | 'week' | 'month';
  overview: {
    totalVendorAccounts: number;
    totalRegistered: number;
    notSubmitted: number;
    totalInPipeline: number;
    totalApproved: number;
    completionRate: number | null;
    avgCycleDays: number | null;
    returned: number;
    parked: number;
  };
  pipeline: {
    stageCounts: StageCounts;
    avgDwellPerReviewStage: { stage: string; avgDays: number | null; sampleSize: number }[];
    bottleneck: { stage: string; avgDays: number | null; sampleSize: number } | null;
    staleVendors: StaleVendorItem[];
  };
  activity: {
    period: string;
    totals: { progressions: number; approvals: number; returns: number; holds: number; submissions: number };
    last7Days: { progressions: number; approvals: number; returns: number; holds: number };
  };
  certificates: { pending: number; approved: number; rejected: number; expired: number; expiringSoon: number; total: number };
  dueDiligence: {
    atStageE: number;
    atStageF: number;
    avgDaysAtStageE: number | null;
    avgDaysAtStageF: number | null;
  };
  priorityVendors?: PriorityVendors;
  trends: {
    labels: string[];
    series: TrendsSeries;
  };
  tooltips: Record<string, string>;
  flags: ExecFlag[];
}

// ── AI Narrative ──────────────────────────────────────────────────────────────
export interface NarrativeHighlight {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
}

export interface NarrativeData {
  period: string;
  narrative: string;
  provider: 'groq' | 'huggingface' | 'rule-based';
  highlights: NarrativeHighlight[];
  generatedAt: string;
  metricsSnapshot: Record<string, unknown>;
}

// ── Dashboard (unified single-call response) ──────────────────────────────────
export interface DashboardKpis {
  totalVendorAccounts: number;
  totalRegistered: number;
  totalInPipeline: number;
  totalApproved: number;
  completionRate: number | null;
  avgCycleDays: number | null;
  returned: number;
  parked: number;
  totalWithContractor: number;
  notSubmitted: number;
  priorityInPipeline: number;
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
}

export interface DashboardData {
  generatedAt: string;
  period: string;
  bucketSize: 'day' | 'week' | 'month';
  kpis: DashboardKpis;
  pipeline: {
    stageCounts: StageCounts;
    distribution: PipelineDistributionItem[];
    avgDwellPerReviewStage: { stage: string; avgDays: number | null }[];
    bottleneck: { stage: string; avgDays: number | null } | null;
    staleVendors: StaleVendorItem[];
  };
  trends: DashboardTrends;
  activity: {
    totals: { progressions: number; approvals: number; returns: number; holds: number; submissions: number };
    period: string;
    last7Days: { progressions: number; approvals: number; returns: number; holds: number };
  };
  periodComparison: {
    currentPeriodProgressions: number;
    prevPeriodProgressions: number;
    changePercent: number | null;
  };
  certificates: { pending: number; approved: number; rejected: number; expired: number; expiringSoon: number; total: number };
  dueDiligence: {
    atStageE: number;
    atStageF: number;
    avgDaysAtStageE: number | null;
    avgDaysAtStageF: number | null;
  };
  holdStats: { totalApprovedHolds: number; periodHolds: number };
  priorityVendors?: PriorityVendors;
  tooltips: Record<string, string>;
  flags: ExecFlag[];
}

// ── Shared ────────────────────────────────────────────────────────────────────
export type Period = '7d' | '14d' | '30d' | '60d' | '90d' | '180d' | '1y' | '3y' | '5y' | '10y' | 'custom';
export type SortDir = 'asc' | 'desc';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}
