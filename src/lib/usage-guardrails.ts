import { sqlite } from "@/src/db/client";
import { getAppSettings, type UsageGuardrails } from "@/src/db/settings";

export type UsageGuardrailMetric = {
  configured: boolean;
  used: number;
  limit: number | null;
  percent: number;
  remaining: number | null;
  status: "not-configured" | "ok" | "warning" | "exceeded";
};

export type UsageGuardrailProgress = {
  monthLabel: string;
  window: {
    from: number;
    to: number;
  };
  cost: UsageGuardrailMetric;
  tokens: UsageGuardrailMetric;
};

type GuardrailUsage = {
  cost: number;
  tokens: number;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function monthWindow(now: Date) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    from: from.getTime(),
    to: to.getTime()
  };
}

function monthLabel(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(now);
}

function metric(used: number, limit: number | null): UsageGuardrailMetric {
  if (limit == null || limit <= 0) {
    return {
      configured: false,
      used,
      limit: null,
      percent: 0,
      remaining: null,
      status: "not-configured"
    };
  }

  const percent = used / limit;
  return {
    configured: true,
    used,
    limit,
    percent,
    remaining: Math.max(0, limit - used),
    status: percent >= 1 ? "exceeded" : percent >= 0.8 ? "warning" : "ok"
  };
}

export function buildUsageGuardrailProgress({
  guardrails,
  usage,
  now = new Date()
}: {
  guardrails: UsageGuardrails;
  usage: GuardrailUsage;
  now?: Date;
}): UsageGuardrailProgress {
  return {
    monthLabel: monthLabel(now),
    window: monthWindow(now),
    cost: metric(usage.cost, guardrails.monthlyCostLimitUsd),
    tokens: metric(usage.tokens, guardrails.monthlyTokenLimit)
  };
}

function getCurrentMonthUsage(now: Date): GuardrailUsage {
  const window = monthWindow(now);
  const row = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(total_tokens), 0) AS tokens,
        COALESCE(SUM(cost), 0) AS cost
       FROM interactions
       WHERE timestamp >= ?
         AND timestamp < ?`
    )
    .get(window.from, window.to) as { tokens: number; cost: number } | undefined;

  return {
    tokens: number(row?.tokens),
    cost: number(row?.cost)
  };
}

export function getUsageGuardrailProgress(now = new Date()) {
  return buildUsageGuardrailProgress({
    guardrails: getAppSettings().usageGuardrails,
    usage: getCurrentMonthUsage(now),
    now
  });
}
