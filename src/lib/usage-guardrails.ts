import { sqlite } from "@/src/db/client";
import { getAppSettings, type ScopedUsageGuardrail, type UsageGuardrails } from "@/src/db/settings";

export type UsageGuardrailMetric = {
  configured: boolean;
  used: number;
  limit: number | null;
  percent: number;
  remaining: number | null;
  status: "not-configured" | "ok" | "warning" | "exceeded";
};

export type ScopedUsageGuardrailProgress = {
  id: string;
  scope: ScopedUsageGuardrail["scope"];
  name: string;
  warningThreshold: number;
  cost: UsageGuardrailMetric;
  tokens: UsageGuardrailMetric;
};

export type UsageGuardrailProgress = {
  monthLabel: string;
  window: {
    from: number;
    to: number;
  };
  cost: UsageGuardrailMetric;
  tokens: UsageGuardrailMetric;
  scoped: ScopedUsageGuardrailProgress[];
  anomalies: Array<{
    id: string;
    severity: "warning" | "blocked";
    message: string;
  }>;
};

type GuardrailUsage = {
  cost: number;
  tokens: number;
  scoped?: ScopedGuardrailUsage[];
};

type ScopedGuardrailUsage = {
  scope: ScopedUsageGuardrail["scope"];
  name: string;
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

function metric(used: number, limit: number | null, warningThreshold = 0.8): UsageGuardrailMetric {
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
    status: percent >= 1 ? "exceeded" : percent >= warningThreshold ? "warning" : "ok"
  };
}

function scopedProgress(guardrails: UsageGuardrails, usage: GuardrailUsage): ScopedUsageGuardrailProgress[] {
  const scopedUsage = usage.scoped ?? [];
  return (guardrails.scoped ?? []).map((guardrail) => {
    const current = scopedUsage.find(
      (item) =>
        item.scope === guardrail.scope &&
        item.name.toLowerCase() === guardrail.name.toLowerCase()
    ) ?? { scope: guardrail.scope, name: guardrail.name, cost: 0, tokens: 0 };
    return {
      id: guardrail.id,
      scope: guardrail.scope,
      name: guardrail.name,
      warningThreshold: guardrail.warningThreshold,
      cost: metric(current.cost, guardrail.monthlyCostLimitUsd, guardrail.warningThreshold),
      tokens: metric(current.tokens, guardrail.monthlyTokenLimit, guardrail.warningThreshold)
    };
  });
}

function anomalies(scoped: ScopedUsageGuardrailProgress[]): UsageGuardrailProgress["anomalies"] {
  return scoped.flatMap((item) => {
    const findings: UsageGuardrailProgress["anomalies"] = [];
    if (item.cost.status === "exceeded" || item.tokens.status === "exceeded") {
      findings.push({
        id: `${item.id}-exceeded`,
        severity: "blocked",
        message: `${item.scope} ${item.name} exceeded a local monthly guardrail.`
      });
    } else if (item.cost.status === "warning" || item.tokens.status === "warning") {
      findings.push({
        id: `${item.id}-warning`,
        severity: "warning",
        message: `${item.scope} ${item.name} is near a local monthly guardrail.`
      });
    }
    return findings;
  });
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
  const scoped = scopedProgress(guardrails, usage);
  return {
    monthLabel: monthLabel(now),
    window: monthWindow(now),
    cost: metric(usage.cost, guardrails.monthlyCostLimitUsd),
    tokens: metric(usage.tokens, guardrails.monthlyTokenLimit),
    scoped,
    anomalies: anomalies(scoped)
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

  const scopedRows = sqlite
    .prepare(
      `SELECT 'project' AS scope, COALESCE(p.name, 'Unassigned') AS name,
        COALESCE(SUM(i.total_tokens), 0) AS tokens,
        COALESCE(SUM(i.cost), 0) AS cost
       FROM interactions i
       JOIN sessions s ON s.id = i.session_id
       LEFT JOIN projects p ON p.id = s.project_id
       WHERE i.timestamp >= ? AND i.timestamp < ?
       GROUP BY COALESCE(p.name, 'Unassigned')
       UNION ALL
       SELECT 'tool' AS scope, t.name AS name,
        COALESCE(SUM(i.total_tokens), 0) AS tokens,
        COALESCE(SUM(i.cost), 0) AS cost
       FROM interactions i
       JOIN sessions s ON s.id = i.session_id
       JOIN tools t ON t.id = s.tool_id
       WHERE i.timestamp >= ? AND i.timestamp < ?
       GROUP BY t.name
       UNION ALL
       SELECT 'model' AS scope, COALESCE(m.name, 'unknown') AS name,
        COALESCE(SUM(i.total_tokens), 0) AS tokens,
        COALESCE(SUM(i.cost), 0) AS cost
       FROM interactions i
       LEFT JOIN models m ON m.id = i.model_id
       WHERE i.timestamp >= ? AND i.timestamp < ?
       GROUP BY COALESCE(m.name, 'unknown')`
    )
    .all(window.from, window.to, window.from, window.to, window.from, window.to) as ScopedGuardrailUsage[];

  return {
    tokens: number(row?.tokens),
    cost: number(row?.cost),
    scoped: scopedRows.map((item) => ({
      scope: item.scope,
      name: item.name,
      tokens: number(item.tokens),
      cost: number(item.cost)
    }))
  };
}

export function getUsageGuardrailProgress(now = new Date()) {
  return buildUsageGuardrailProgress({
    guardrails: getAppSettings().usageGuardrails,
    usage: getCurrentMonthUsage(now),
    now
  });
}
