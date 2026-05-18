import { formatCurrency, formatTokens } from "@/src/lib/format";
import type {
  ModelAnalyticsRow,
  ProjectAnalyticsRow,
  SessionRow,
  SummaryMetrics,
  ToolComparisonRow,
  UnknownCostQueueRow
} from "@/src/lib/analytics";
import type { UsageGuardrailProgress, UsageGuardrailMetric } from "@/src/lib/usage-guardrails";

export type ReviewQueueCategory =
  | "guardrail"
  | "cost-repair"
  | "session"
  | "project"
  | "model"
  | "cache"
  | "baseline";

export type ReviewQueueItem = {
  id: string;
  severity: "high" | "medium" | "low";
  category: ReviewQueueCategory;
  title: string;
  evidence: string;
  action: string;
  href: string;
  impactLabel: string;
  impactValue: string;
};

type ReviewQueueInput = {
  summary: Pick<SummaryMetrics, "totalTokens" | "totalCost" | "inputTokens" | "cachedTokens" | "unknownCostInteractions">;
  guardrails: Pick<UsageGuardrailProgress, "monthLabel" | "cost" | "tokens">;
  unknownCosts: UnknownCostQueueRow[];
  sessions: SessionRow[];
  projects: ProjectAnalyticsRow[];
  models: ModelAnalyticsRow[];
  tools: ToolComparisonRow[];
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function guardrailItem(
  metric: UsageGuardrailMetric,
  kind: "cost" | "tokens",
  monthLabel: string
): ReviewQueueItem | null {
  if (!metric.configured || metric.status === "ok") return null;
  const exceeded = metric.status === "exceeded";
  const formattedUsed = kind === "cost" ? formatCurrency(metric.used) : formatTokens(metric.used);
  const formattedLimit = kind === "cost" ? formatCurrency(metric.limit) : formatTokens(metric.limit);
  const noun = kind === "cost" ? "cost" : "token";

  return {
    id: `guardrail-${kind}-${metric.status}`,
    severity: exceeded ? "high" : "medium",
    category: "guardrail",
    title: exceeded ? `Monthly ${noun} guardrail exceeded` : `Monthly ${noun} guardrail is close`,
    evidence: `${monthLabel} is at ${formattedUsed} of ${formattedLimit} (${Math.round(metric.percent * 100)}%).`,
    action: exceeded
      ? "Review current-month sessions before starting another long CLI run."
      : "Watch the next sessions or adjust the local guardrail in Settings.",
    href: "/sessions",
    impactLabel: `${monthLabel} ${noun}`,
    impactValue: formattedUsed
  };
}

function unknownCostItem(row: UnknownCostQueueRow): ReviewQueueItem {
  const severity = row.cause === "missing pricing" ? "high" : "medium";
  return {
    id: `repair-unknown-cost-${slug(row.cause)}-${slug(row.model)}`,
    severity,
    category: "cost-repair",
    title: row.cause === "missing pricing" ? "Price a real model name" : "Repair unknown-cost usage",
    evidence: `${row.interactions.toLocaleString()} interactions from ${row.tool} are ${row.cause}; model: ${row.model}.`,
    action: row.cause === "missing pricing"
      ? "Add or confirm the model price so cost totals become complete."
      : "Inspect parser evidence to recover the missing model or token count.",
    href: row.repairHref,
    impactLabel: "unknown cost",
    impactValue: `${row.interactions.toLocaleString()} interactions`
  };
}

function sessionItem(session: SessionRow, summary: ReviewQueueInput["summary"]): ReviewQueueItem {
  const tokenShare = summary.totalTokens > 0 ? session.totalTokens / summary.totalTokens : 0;
  const costShare = summary.totalCost > 0 && session.cost != null ? session.cost / summary.totalCost : 0;
  const severity = tokenShare >= 0.25 || costShare >= 0.25 ? "high" : "medium";
  const title = session.title?.trim() || `${session.tool} session`;

  return {
    id: `review-session-${session.id}`,
    severity,
    category: "session",
    title: "Review a high-impact session",
    evidence: `${title} used ${formatTokens(session.totalTokens)} tokens${session.cost != null ? ` and ${formatCurrency(session.cost)}` : ""}.`,
    action: "Open the evidence trail before optimizing smaller usage elsewhere.",
    href: session.sourceHref,
    impactLabel: "session tokens",
    impactValue: formatTokens(session.totalTokens)
  };
}

function projectItem(project: ProjectAnalyticsRow, summary: ReviewQueueInput["summary"]): ReviewQueueItem | null {
  if (summary.totalTokens <= 0 || project.totalTokens / summary.totalTokens < 0.5) return null;
  return {
    id: `review-project-${project.id}`,
    severity: "medium",
    category: "project",
    title: "One project dominates usage",
    evidence: `${project.project} accounts for ${Math.round((project.totalTokens / summary.totalTokens) * 100)}% of imported tokens.`,
    action: "Review this project's sessions before spreading effort across smaller projects.",
    href: withQuery("/sessions", { project: project.project }),
    impactLabel: "project tokens",
    impactValue: formatTokens(project.totalTokens)
  };
}

function modelItem(model: ModelAnalyticsRow): ReviewQueueItem | null {
  if (!model.overuseFlag || !model.suggestedAlternative) return null;
  return {
    id: `review-model-${slug(model.provider)}-${slug(model.model)}`,
    severity: "medium",
    category: "model",
    title: "Check expensive-model usage",
    evidence: `${model.model} has ${formatTokens(model.totalTokens)} tokens and ${model.suggestedAlternative} is cheaper in Model Rates.`,
    action: "Review sessions for mechanical work that could use a cheaper configured model.",
    href: withQuery("/sessions", { model: model.model }),
    impactLabel: "model cost",
    impactValue: formatCurrency(model.cost)
  };
}

function cacheItem(tool: ToolComparisonRow, summary: ReviewQueueInput["summary"]): ReviewQueueItem | null {
  if (tool.totalTokens < 10_000 || tool.cacheEfficiency >= 0.05 || summary.inputTokens < 10_000) return null;
  return {
    id: `review-cache-${slug(tool.tool)}`,
    severity: "low",
    category: "cache",
    title: "Cache reuse is low",
    evidence: `${tool.tool} has ${formatTokens(tool.totalTokens)} tokens with ${Math.round(tool.cacheEfficiency * 100)}% cache efficiency.`,
    action: "Inspect model and session mix to see whether context reuse is possible.",
    href: withQuery("/sessions", { tool: tool.tool }),
    impactLabel: "tool tokens",
    impactValue: formatTokens(tool.totalTokens)
  };
}

export function buildReviewQueue(input: ReviewQueueInput): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];
  const guardrailItems = [
    guardrailItem(input.guardrails.cost, "cost", input.guardrails.monthLabel),
    guardrailItem(input.guardrails.tokens, "tokens", input.guardrails.monthLabel)
  ].filter((item): item is ReviewQueueItem => Boolean(item));
  items.push(...guardrailItems);

  const topUnknownCost = input.unknownCosts[0];
  if (topUnknownCost) {
    items.push(unknownCostItem(topUnknownCost));
  }

  const topSession = [...input.sessions].sort((a, b) => {
    const costDelta = (b.cost ?? 0) - (a.cost ?? 0);
    return costDelta || b.totalTokens - a.totalTokens;
  })[0];
  if (topSession && topSession.totalTokens > 0) {
    items.push(sessionItem(topSession, input.summary));
  }

  const topProject = input.projects[0] ? projectItem(input.projects[0], input.summary) : null;
  if (topProject) items.push(topProject);

  const modelReview = input.models.map(modelItem).find(Boolean);
  if (modelReview) items.push(modelReview);

  const cacheReview = input.tools.map((tool) => cacheItem(tool, input.summary)).find(Boolean);
  if (cacheReview) items.push(cacheReview);

  if (!items.length) {
    return [
      {
        id: "baseline",
        severity: "low",
        category: "baseline",
        title: "No urgent review item",
        evidence: "Current local usage does not show a high-priority repair or optimization queue.",
        action: "Keep scanning after meaningful CLI sessions.",
        href: "/settings",
        impactLabel: "review status",
        impactValue: "clear"
      }
    ];
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  const categoryRank: Record<ReviewQueueCategory, number> = {
    guardrail: 0,
    "cost-repair": 1,
    session: 2,
    project: 3,
    model: 4,
    cache: 5,
    baseline: 6
  };
  return items
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || categoryRank[a.category] - categoryRank[b.category])
    .slice(0, 8);
}
