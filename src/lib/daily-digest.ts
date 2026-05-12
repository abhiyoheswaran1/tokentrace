import { formatCurrency, formatDate, formatTokens, percent } from "@/src/lib/format";
import type { ProjectAnalyticsRow, SummaryMetrics } from "@/src/lib/analytics";
import type { ReviewQueueItem } from "@/src/lib/review-queue";
import type { UsageGuardrailMetric, UsageGuardrailProgress } from "@/src/lib/usage-guardrails";

export type DailyDigest = {
  generatedAt: string;
  monthLabel: string;
  totalTokens: number;
  totalCost: number;
  unknownCostInteractions: number;
  guardrails: {
    cost: UsageGuardrailMetric;
    tokens: UsageGuardrailMetric;
  };
  topReviewItem: ReviewQueueItem;
  topProject: Pick<ProjectAnalyticsRow, "project" | "path" | "totalTokens" | "cost" | "sessions"> | null;
  latestScan: {
    headline: string;
    completedAt: number | null;
    recordsImported: number;
    filesScanned: number;
  } | null;
};

type DailyDigestInput = {
  generatedAt?: Date;
  summary: Pick<SummaryMetrics, "totalTokens" | "totalCost" | "unknownCostInteractions">;
  usageGuardrails: UsageGuardrailProgress;
  reviewQueue: ReviewQueueItem[];
  projects: ProjectAnalyticsRow[];
  latestScan?: DailyDigest["latestScan"];
};

function fallbackReviewItem(): ReviewQueueItem {
  return {
    id: "baseline",
    severity: "low",
    category: "baseline",
    title: "No urgent review item",
    evidence: "Current local usage does not show a high-priority repair or optimization queue.",
    action: "Keep scanning after meaningful CLI sessions.",
    href: "/settings",
    impactLabel: "review status",
    impactValue: "clear"
  };
}

export function buildDailyDigest(input: DailyDigestInput): DailyDigest {
  const topProject = input.projects[0] ?? null;
  return {
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    monthLabel: input.usageGuardrails.monthLabel,
    totalTokens: input.summary.totalTokens,
    totalCost: input.summary.totalCost,
    unknownCostInteractions: input.summary.unknownCostInteractions,
    guardrails: {
      cost: input.usageGuardrails.cost,
      tokens: input.usageGuardrails.tokens
    },
    topReviewItem: input.reviewQueue[0] ?? fallbackReviewItem(),
    topProject: topProject
      ? {
          project: topProject.project,
          path: topProject.path,
          totalTokens: topProject.totalTokens,
          cost: topProject.cost,
          sessions: topProject.sessions
        }
      : null,
    latestScan: input.latestScan ?? null
  };
}

function renderGuardrailLine(label: string, metric: UsageGuardrailMetric, formatter: (value: number | null) => string) {
  if (!metric.configured) {
    return `${label} guardrail: not set, current ${formatter(metric.used)}`;
  }
  return `${label} guardrail: ${formatter(metric.used)} / ${formatter(metric.limit)}, ${percent(metric.percent)}, ${metric.status}`;
}

export function renderDailyDigestText(digest: DailyDigest) {
  return [
    "TokenTrace Daily Digest",
    `Generated: ${formatDate(new Date(digest.generatedAt).getTime())}`,
    `Month: ${digest.monthLabel}`,
    `Usage: ${formatTokens(digest.totalTokens)} tokens, ${formatCurrency(digest.totalCost)}`,
    renderGuardrailLine("Cost", digest.guardrails.cost, formatCurrency),
    renderGuardrailLine("Token", digest.guardrails.tokens, formatTokens),
    `Top review: ${digest.topReviewItem.title}`,
    `Evidence: ${digest.topReviewItem.evidence}`,
    `Next action: ${digest.topReviewItem.action}`,
    `Unknown cost: ${digest.unknownCostInteractions.toLocaleString()} interactions`,
    digest.topProject
      ? `Top project: ${digest.topProject.project}, ${formatTokens(digest.topProject.totalTokens)}, ${formatCurrency(digest.topProject.cost)}`
      : "Top project: no imported project usage",
    digest.latestScan
      ? `Latest scan: ${digest.latestScan.headline}, ${digest.latestScan.recordsImported.toLocaleString()} records from ${digest.latestScan.filesScanned.toLocaleString()} files`
      : "Latest scan: no scan yet"
  ].join("\n");
}
