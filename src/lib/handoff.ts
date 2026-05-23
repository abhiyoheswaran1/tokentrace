import { listAgentActions, type AgentAction } from "@/src/lib/agent-actions";
import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";

export type HandoffSuggestedAction = {
  label: string;
  command: string;
  href?: string;
};

export type HandoffEnvelope = {
  $schema: "tokentrace.handoff.v1";
  generatedAt: string;
  scan: {
    lastStartedAt: string | null;
    lastCompletedAt: string | null;
    filesScanned: number;
    recordsImported: number;
  };
  repairQueue: {
    unresolvedCount: number;
    topCauses: Array<{ cause: string; interactions: number }>;
    focusHref: string | null;
  };
  confidence: {
    overall: "high" | "medium" | "low" | "unknown";
    drivers: string[];
  };
  recentActions: AgentAction[];
  suggestedNextActions: HandoffSuggestedAction[];
};

export function buildHandoffEnvelope(): HandoffEnvelope {
  const trust = safeRead(() => getScanTrustData());
  const latestRun = trust?.health.latestRun ?? null;
  const analytics = safeRead(() => getAnalyticsData({}));
  const workbench = safeRead(() => buildUnknownCostRepairWorkbench());
  const recentActions = safeRead(() => listAgentActions({ limit: 20 })) ?? [];

  const scan = {
    lastStartedAt: toIso(latestRun?.startedAt),
    lastCompletedAt: toIso(latestRun?.completedAt),
    filesScanned: latestRun?.filesScanned ?? 0,
    recordsImported: latestRun?.recordsImported ?? 0
  };

  const causesMap = new Map<string, number>();
  for (const group of workbench?.groups ?? []) {
    if (group.state !== "unresolved") continue;
    causesMap.set(group.cause, (causesMap.get(group.cause) ?? 0) + group.interactions);
  }
  const topCauses = Array.from(causesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cause, interactions]) => ({ cause, interactions }));

  const unresolvedGroup = workbench?.groups.find((group) => group.state === "unresolved") ?? null;
  const repairQueue = {
    unresolvedCount: workbench?.groups.filter((group) => group.state === "unresolved").length ?? 0,
    topCauses,
    focusHref: unresolvedGroup?.repairHref ?? null
  };

  const confidence = inferConfidence(analytics?.summary ?? null);

  const suggestedNextActions: HandoffSuggestedAction[] = [];
  if (!latestRun) {
    suggestedNextActions.push({
      label: "Run a local scan",
      command: "tokentrace scan --json"
    });
  }
  if (repairQueue.unresolvedCount > 0) {
    suggestedNextActions.push({
      label: `Resolve unknown cost: ${topCauses[0]?.cause ?? "top cause"}`,
      command: "tokentrace repair --json",
      href: unresolvedGroup?.repairHref ?? "/repair"
    });
  }
  if ((analytics?.summary.unknownCostInteractions ?? 0) > 0) {
    suggestedNextActions.push({
      label: "Refresh model rates",
      command: "tokentrace doctor refresh-prices"
    });
  }
  if (suggestedNextActions.length === 0) {
    suggestedNextActions.push({
      label: "Open the local dashboard",
      command: "tokentrace serve"
    });
  }

  return {
    $schema: "tokentrace.handoff.v1",
    generatedAt: new Date().toISOString(),
    scan,
    repairQueue,
    confidence,
    recentActions,
    suggestedNextActions
  };
}

function inferConfidence(summary: { totalTokens: number; unknownCostInteractions: number } | null) {
  if (!summary || summary.totalTokens === 0) {
    return { overall: "unknown" as const, drivers: ["No imported usage yet"] };
  }
  const drivers: string[] = [];
  if (summary.unknownCostInteractions > 0) {
    drivers.push(`${summary.unknownCostInteractions} unknown-cost interactions still pending`);
  }
  const ratio = summary.unknownCostInteractions / Math.max(summary.totalTokens, 1);
  const overall = ratio > 0.05 ? ("low" as const) : ratio > 0 ? ("medium" as const) : ("high" as const);
  return { overall, drivers };
}

function safeRead<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function toIso(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return new Date(value).toISOString();
}
