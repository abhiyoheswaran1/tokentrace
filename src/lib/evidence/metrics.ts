export type EvidenceMetric =
  | "processed-tokens"
  | "non-cache-tokens"
  | "cached-tokens"
  | "estimated-cost"
  | "sessions"
  | "unknown-cost"
  | "guardrails"
  | "review-queue";

export const evidenceMetrics: EvidenceMetric[] = [
  "processed-tokens",
  "non-cache-tokens",
  "cached-tokens",
  "estimated-cost",
  "sessions",
  "unknown-cost",
  "guardrails",
  "review-queue"
];

export const metricTitles: Record<EvidenceMetric, { title: string; description: string }> = {
  "processed-tokens": {
    title: "Processed tokens",
    description: "All input, output, cache, and reasoning tokens from imported local CLI records."
  },
  "non-cache-tokens": {
    title: "Non-cache tokens",
    description: "Fresh input, output, and reasoning tokens, excluding cache read/write tokens."
  },
  "cached-tokens": {
    title: "Cached tokens",
    description: "Cache read and cache write tokens reported by supported tools."
  },
  "estimated-cost": {
    title: "Estimated cost",
    description: "Cost calculated from editable provider model rates, including exact, estimated, and unknown rows."
  },
  sessions: {
    title: "Sessions",
    description: "Imported local CLI sessions and their interaction evidence."
  },
  "unknown-cost": {
    title: "Unknown cost",
    description: "Interactions whose cost cannot be calculated because model, price, or token counts are missing."
  },
  guardrails: {
    title: "Monthly guardrails",
    description: "Current-month usage contributing to local guardrail progress."
  },
  "review-queue": {
    title: "Review queue",
    description: "Evidence behind deterministic local review recommendations."
  }
};

export function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function parseEvidenceMetric(value: unknown): EvidenceMetric {
  if (typeof value !== "string") return "processed-tokens";
  return evidenceMetrics.includes(value as EvidenceMetric) ? (value as EvidenceMetric) : "processed-tokens";
}

export function evidenceHref(
  metric: EvidenceMetric,
  params: Record<string, string | null | undefined> = {}
) {
  return withQuery("/evidence", { metric, ...params });
}
