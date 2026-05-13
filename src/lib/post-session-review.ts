import type { SummaryMetrics } from "@/src/lib/analytics";
import type { ScanDiff } from "@/src/lib/scan-diff";
import type { UsageGuardrailProgress } from "@/src/lib/usage-guardrails";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";

export type PostSessionReviewSession = {
  id: string;
  title: string | null;
  tool: string;
  project: string;
  models: string;
  totalTokens: number;
  cost: number | null;
  parserStatus: string | null;
  sourceFile: string;
};

export type PostSessionReview = {
  headline: string;
  latestScanId: string | null;
  newlyImportedRecords: number;
  scannedFiles: number;
  unknownCostInteractions: number;
  parserWarnings: number;
  guardrails: {
    monthLabel: string;
    cost: {
      status: string;
      used: number;
      percent: number | null;
    };
    tokens: {
      status: string;
      used: number;
      percent: number | null;
    };
  };
  expensiveSessions: Array<{
    id: string;
    title: string;
    tool: string;
    project: string;
    models: string;
    totalTokens: number;
    cost: number | null;
    href: string;
  }>;
  parserWarningSources: Array<{
    sourceFile: string;
    parserStatus: string;
    href: string;
  }>;
};

export type PostSessionReviewInput = {
  scanDiff: ScanDiff;
  usageGuardrails: UsageGuardrailProgress;
  summary: Pick<SummaryMetrics, "unknownCostInteractions">;
  sessions: PostSessionReviewSession[];
};

function recordHeadline(records: number) {
  if (records > 0) return `${records.toLocaleString()} new records imported`;
  return "No new records imported";
}

function sessionTitle(session: PostSessionReviewSession) {
  return session.title?.trim() || `${session.tool} session`;
}

export function buildPostSessionReview(input: PostSessionReviewInput): PostSessionReview {
  const newlyImportedRecords =
    input.scanDiff.delta.recordsImported > 0
      ? input.scanDiff.delta.recordsImported
      : input.scanDiff.current.recordsImported;
  const parserWarningSources = input.sessions
    .filter((session) => session.parserStatus && session.parserStatus !== "imported")
    .slice(0, 5)
    .map((session) => ({
      sourceFile: session.sourceFile,
      parserStatus: session.parserStatus ?? "unknown",
      href: `/parser-debug?source=${encodeURIComponent(session.sourceFile)}`
    }));
  const expensiveSessions = [...input.sessions]
    .filter((session) => (session.cost ?? 0) > 0 || session.totalTokens > 0)
    .sort((a, b) => {
      const costDelta = (b.cost ?? 0) - (a.cost ?? 0);
      if (costDelta !== 0) return costDelta;
      return b.totalTokens - a.totalTokens;
    })
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      title: sessionTitle(session),
      tool: session.tool,
      project: session.project,
      models: session.models,
      totalTokens: session.totalTokens,
      cost: session.cost,
      href: `/sessions/${encodeURIComponent(session.id)}`
    }));

  return {
    headline: recordHeadline(newlyImportedRecords),
    latestScanId: input.scanDiff.latestScanId,
    newlyImportedRecords,
    scannedFiles: input.scanDiff.current.filesScanned,
    unknownCostInteractions: input.summary.unknownCostInteractions,
    parserWarnings: parserWarningSources.length,
    guardrails: {
      monthLabel: input.usageGuardrails.monthLabel,
      cost: {
        status: input.usageGuardrails.cost.status,
        used: input.usageGuardrails.cost.used,
        percent: input.usageGuardrails.cost.percent
      },
      tokens: {
        status: input.usageGuardrails.tokens.status,
        used: input.usageGuardrails.tokens.used,
        percent: input.usageGuardrails.tokens.percent
      }
    },
    expensiveSessions,
    parserWarningSources
  };
}

export function renderPostSessionReviewText(review: PostSessionReview) {
  const lines = [
    "Post-session review",
    review.headline,
    `Scan: ${review.scannedFiles.toLocaleString()} files checked`,
    `Unknown cost: ${review.unknownCostInteractions.toLocaleString()} interactions`,
    `Guardrails: cost ${formatCurrency(review.guardrails.cost.used)} (${percent(review.guardrails.cost.percent)}), tokens ${formatTokens(review.guardrails.tokens.used)} (${percent(review.guardrails.tokens.percent)})`,
    `Parser warnings: ${review.parserWarnings.toLocaleString()}`
  ];

  if (review.expensiveSessions.length) {
    lines.push("Expensive sessions:");
    for (const session of review.expensiveSessions.slice(0, 3)) {
      lines.push(`- ${session.title}: ${formatTokens(session.totalTokens)}, ${formatCurrency(session.cost)}`);
    }
  }

  return lines.join("\n");
}
