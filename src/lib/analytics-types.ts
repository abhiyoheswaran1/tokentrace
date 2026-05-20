import type { DataConfidenceGrade, DataConfidenceScore } from "@/src/lib/data-confidence";
import type { EvidenceMetric } from "@/src/lib/evidence-trail";
import type { LocalRecommendation } from "@/src/lib/recommendations";
import type { ProjectSignalRow } from "@/src/lib/project-signals";
import type { ReviewQueueItem } from "@/src/lib/review-queue";
import type { ScanConfidenceSummary, ScanHealth } from "@/src/lib/scan-health";
import type { SessionComparisonRow } from "@/src/lib/session-comparison";
import type { UsageGuardrailProgress } from "@/src/lib/usage-guardrails";

export type TrendPoint = {
  date: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cost: number;
};

export type SummaryMetrics = {
  totalTokens: number;
  nonCachedTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalCost: number;
  exactCost: number;
  estimatedCost: number;
  unknownCostInteractions: number;
  sessions: number;
  interactions: number;
  mostUsedTool: string;
  mostUsedModel: string;
};

export type EvidenceLinkMap = Record<EvidenceMetric, string>;

export type UsageComparisonSnapshot = Pick<
  SummaryMetrics,
  "totalTokens" | "totalCost" | "sessions" | "interactions" | "unknownCostInteractions"
>;

export type UsageComparison = {
  mode: "selected-period" | "latest-seven-days" | "empty";
  label: string;
  current: UsageComparisonSnapshot;
  previous: UsageComparisonSnapshot;
  delta: UsageComparisonSnapshot & {
    totalTokensPercent: number | null;
    totalCostPercent: number | null;
    sessionsPercent: number | null;
    interactionsPercent: number | null;
    unknownCostInteractionsPercent: number | null;
  };
  headline: string;
  detail: string;
};

export type ToolComparisonRow = {
  tool: string;
  provider: string;
  totalTokens: number;
  cost: number;
  sessions: number;
  interactions: number;
  averageTokensPerSession: number;
  averageTokensPerInteraction: number;
  outputInputRatio: number;
  cacheEfficiency: number;
  mostExpensiveModel: string;
};

export type ModelAnalyticsRow = {
  model: string;
  provider: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  interactions: number;
  averageOutputTokens: number;
  tokenEfficiency: number;
  suggestedAlternative: string | null;
  overuseFlag: string | null;
};

export type ProjectAnalyticsRow = {
  id: string;
  project: string;
  path: string;
  totalTokens: number;
  cost: number;
  sessions: number;
  interactions: number;
  outputInputRatio: number;
  lastUsedAt: number | null;
  confidenceScore?: number;
  confidenceGrade?: DataConfidenceGrade;
};

export type SessionRow = {
  id: string;
  startedAt: number | null;
  endedAt: number | null;
  title: string | null;
  sourceFile: string;
  tool: string;
  provider: string;
  project: string;
  projectPath: string;
  models: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cost: number | null;
  costEstimated: boolean;
  estimatedTokens: boolean;
  tokenConfidence: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  parserReason: string | null;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
  interactionCount: number;
  durationMs: number | null;
  confidenceScore?: number;
  confidenceGrade?: DataConfidenceGrade;
};

export type Insight = {
  id: string;
  severity: "high" | "medium" | "low";
  problem: string;
  evidence: string;
  savingOpportunity: string;
  recommendation: string;
};

export type UnknownCostQueueRow = {
  cause: "missing model" | "missing pricing" | "missing token count" | "other";
  model: string;
  provider: string;
  tool: string;
  sourceFile: string;
  interactions: number;
  sessions: number;
  totalTokens: number;
  repairHref: string;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type ModelAliasSuggestion = {
  model: string;
  provider: string;
  tool: string;
  sourceFile: string;
  interactions: number;
  totalTokens: number;
  suggestedModel: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  repairHref: string;
  parserHref: string;
};

export type DebugScanFile = {
  id: string;
  scanRunId: string;
  path: string;
  modifiedTime: number | null;
  sizeBytes: number;
  fileHash: string | null;
  parser: string | null;
  status: string;
  recordsImported: number;
  warnings: string[];
  errors: string[];
  rawMetadata: Record<string, unknown>;
  scanStartedAt: number;
};

export type DebugScanRun = {
  id: string;
  startedAt: number;
  completedAt: number | null;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
};

export type ScanTrustData = {
  scanRuns: DebugScanRun[];
  scanFiles: DebugScanFile[];
  confidence: ScanConfidenceSummary;
  pricedModelCount: number;
  health: ScanHealth;
};

export type ScanTrustOptions = {
  scanFileScope?: "all" | "recent" | "latest" | "none";
  sessionDetail?: "full" | "summary";
  analyticsProfile?: "full" | "overview";
};

export type AnalyticsData = {
  summary: SummaryMetrics;
  scanTrust: ScanTrustData;
  dataConfidence: DataConfidenceScore;
  evidenceLinks: EvidenceLinkMap;
  comparison: UsageComparison;
  trends: TrendPoint[];
  tools: ToolComparisonRow[];
  models: ModelAnalyticsRow[];
  projects: ProjectAnalyticsRow[];
  sessions: SessionRow[];
  unknownCosts: UnknownCostQueueRow[];
  modelAliasSuggestions: ModelAliasSuggestion[];
  usageGuardrails: UsageGuardrailProgress;
  reviewQueue: ReviewQueueItem[];
  sessionComparisons: SessionComparisonRow[];
  projectSignals: ProjectSignalRow[];
  recommendations: LocalRecommendation[];
  insights: Insight[];
};

export type AnalyticsFilters = {
  from?: number | null;
  to?: number | null;
};
