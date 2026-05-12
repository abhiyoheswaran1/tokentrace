import { formatCurrency, formatTokens } from "@/src/lib/format";
import type { UsageGuardrailProgress, UsageGuardrailMetric } from "@/src/lib/usage-guardrails";

export type LocalRecommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  evidence: string;
  action: string;
  href: string;
};

type RecommendationInput = {
  summary: {
    totalTokens: number;
    cachedTokens: number;
    inputTokens: number;
    unknownCostInteractions: number;
  };
  tools: Array<{
    tool: string;
    totalTokens: number;
    interactions: number;
    cacheEfficiency: number;
  }>;
  projects: Array<{
    project: string;
    totalTokens: number;
    cost: number;
  }>;
  unknownCosts: Array<{
    cause: string;
    model: string;
    interactions: number;
    repairHref: string;
  }>;
  scan?: {
    latestRecordsImported: number;
    duplicateFiles: number;
    parserReviewFiles: number;
    ignoredFiles: number;
  };
  guardrails?: Pick<UsageGuardrailProgress, "monthLabel" | "cost" | "tokens">;
};

function recommendation(
  id: string,
  severity: LocalRecommendation["severity"],
  title: string,
  evidence: string,
  action: string,
  href: string
): LocalRecommendation {
  return { id, severity, title, evidence, action, href };
}

function guardrailRecommendation(
  metric: UsageGuardrailMetric,
  kind: "cost" | "tokens",
  monthLabel: string
) {
  if (!metric.configured || metric.status === "ok") return null;
  const exceeded = metric.status === "exceeded";
  const formattedUsed = kind === "cost" ? formatCurrency(metric.used) : formatTokens(metric.used);
  const formattedLimit = kind === "cost" ? formatCurrency(metric.limit) : formatTokens(metric.limit);
  const noun = kind === "cost" ? "cost" : "token";
  const percent = Math.round(metric.percent * 100);

  return recommendation(
    `monthly-${noun}-limit-${metric.status}`,
    exceeded ? "high" : "medium",
    exceeded ? `Monthly ${noun} guardrail exceeded` : `Monthly ${noun} guardrail is close`,
    `${monthLabel} is at ${formattedUsed} of ${formattedLimit} (${percent}%).`,
    exceeded
      ? "Review current-month sessions before starting more long CLI runs."
      : "Watch the next few sessions or adjust the local guardrail in Settings.",
    "/sessions"
  );
}

export function buildLocalRecommendations(input: RecommendationInput): LocalRecommendation[] {
  const recommendations: LocalRecommendation[] = [];
  const missingPricing = input.unknownCosts
    .filter((row) => row.cause === "missing pricing")
    .reduce((sum, row) => sum + row.interactions, 0);

  if (missingPricing > 0) {
    const top = input.unknownCosts.find((row) => row.cause === "missing pricing");
    recommendations.push(recommendation(
      "unknown-pricing",
      "high",
      "Add missing model pricing",
      `${missingPricing.toLocaleString()} interactions have tokens and model names but no usable price row${top ? `; top model: ${top.model}` : ""}.`,
      "Configure the missing model prices so cost totals become complete.",
      top?.repairHref ?? "/pricing"
    ));
  } else if (input.summary.unknownCostInteractions > 0) {
    recommendations.push(recommendation(
      "unknown-cost",
      "medium",
      "Repair unknown cost rows",
      `${input.summary.unknownCostInteractions.toLocaleString()} interactions still have unknown cost.`,
      "Use the repair queue to decide whether pricing, model names, or token counts are missing.",
      "/diagnostics"
    ));
  }

  if (input.guardrails) {
    const guardrailItems = [
      guardrailRecommendation(input.guardrails.cost, "cost", input.guardrails.monthLabel),
      guardrailRecommendation(input.guardrails.tokens, "tokens", input.guardrails.monthLabel)
    ].filter((item): item is LocalRecommendation => Boolean(item));
    recommendations.push(...guardrailItems);
  }

  const topProject = input.projects[0];
  if (topProject && input.summary.totalTokens > 0 && topProject.totalTokens / input.summary.totalTokens >= 0.5) {
    recommendations.push(recommendation(
      "dominant-project",
      "medium",
      "One project dominates usage",
      `${topProject.project} accounts for ${Math.round((topProject.totalTokens / input.summary.totalTokens) * 100)}% of imported tokens.`,
      "Review that project's sessions before optimizing smaller usage elsewhere.",
      `/sessions?project=${encodeURIComponent(topProject.project)}`
    ));
  }

  const estimatedTool = input.tools.find((tool) => tool.interactions > 0 && tool.totalTokens > 0 && tool.tool === "Generic Log");
  if (estimatedTool) {
    recommendations.push(recommendation(
      "generic-log-estimates",
      "medium",
      "Generic logs are contributing usage",
      `${estimatedTool.tool} has ${estimatedTool.totalTokens.toLocaleString()} tokens across ${estimatedTool.interactions.toLocaleString()} interactions.`,
      "Review parser confidence before treating generic log estimates as exact usage.",
      "/parser-debug"
    ));
  }

  const cacheBase = input.summary.inputTokens + input.summary.cachedTokens;
  const cacheEfficiency = cacheBase > 0 ? input.summary.cachedTokens / cacheBase : 0;
  if (input.summary.inputTokens > 10_000 && cacheEfficiency < 0.1) {
    recommendations.push(recommendation(
      "low-cache",
      "low",
      "Cache usage is low",
      `Cached tokens are ${Math.round(cacheEfficiency * 100)}% of reusable input volume.`,
      "Inspect model and session mix to see whether your CLI can reuse more context.",
      "/models"
    ));
  }

  if (input.scan && input.scan.latestRecordsImported === 0 && input.scan.duplicateFiles > 0 && input.scan.parserReviewFiles === 0) {
    recommendations.push(recommendation(
      "duplicate-only-scan",
      "low",
      "Last scan found only already imported files",
      `${input.scan.duplicateFiles.toLocaleString()} duplicate files were skipped safely.`,
      "No action is needed unless you expected new sessions.",
      "/diagnostics"
    ));
  }

  if (input.scan && input.scan.parserReviewFiles > 0) {
    recommendations.push(recommendation(
      "parser-review",
      "medium",
      "Some files need parser review",
      `${input.scan.parserReviewFiles.toLocaleString()} files were unsupported in the latest scan.`,
      "Inspect Discovery to separate real usage files from support files.",
      "/discovery"
    ));
  }

  if (input.scan && input.scan.ignoredFiles > 0) {
    recommendations.push(recommendation(
      "ignored-support-files",
      "low",
      "Support files are being ignored",
      `${input.scan.ignoredFiles.toLocaleString()} known non-usage files were ignored instead of imported.`,
      "This is expected for Claude/Codex cache, plugin, todo, and support files.",
      "/discovery"
    ));
  }

  if (!recommendations.length) {
    recommendations.push(recommendation(
      "baseline",
      "low",
      "No urgent local recommendation",
      "Current scans, pricing, and parser confidence do not show a high-priority repair.",
      "Keep scanning after new CLI sessions.",
      "/settings"
    ));
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8);
}
