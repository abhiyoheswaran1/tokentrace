import { formatCurrency, formatExactTokens } from "@/src/lib/format";
import { getAnalyticsData } from "@/src/lib/analytics";
import { buildEvidenceTrail, type EvidenceMetric } from "@/src/lib/evidence-trail";

export type EvidencePackScope = {
  type: "metric" | "session" | "project" | "scan" | "repair" | "model-rate";
  id: string;
  label: string;
};

export type EvidencePackInputRecord = {
  id: string;
  role?: string | null;
  model?: string | null;
  rawText?: string | null;
  rawTextPreview?: string | null;
  [key: string]: unknown;
};

export type EvidencePack = {
  schemaVersion: "tokentrace.evidence-pack.v1";
  generatedAt: string;
  scope: EvidencePackScope;
  totals: {
    tokens: number;
    cost: number;
    sessions: number;
    interactions: number;
    unknownCostInteractions: number;
  };
  confidenceDrivers: string[];
  sourceFiles: string[];
  parserNotes: string[];
  modelRateState: string[];
  repairLinks: string[];
  redaction: {
    rawContentIncluded: false;
    rawContentPolicy: "excluded by default";
    excludedFields: string[];
  };
  records: Array<Record<string, unknown>>;
};

export function buildEvidencePack(input: {
  scope: EvidencePackScope;
  generatedAt?: string;
  totals: EvidencePack["totals"];
  confidenceDrivers: string[];
  sourceFiles: string[];
  parserNotes: string[];
  modelRateState: string[];
  repairLinks: string[];
  records: EvidencePackInputRecord[];
}): EvidencePack {
  return {
    schemaVersion: "tokentrace.evidence-pack.v1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scope: input.scope,
    totals: input.totals,
    confidenceDrivers: [...input.confidenceDrivers].sort(),
    sourceFiles: [...new Set(input.sourceFiles)].sort(),
    parserNotes: [...input.parserNotes].sort(),
    modelRateState: [...input.modelRateState].sort(),
    repairLinks: [...new Set(input.repairLinks)].sort(),
    redaction: {
      rawContentIncluded: false,
      rawContentPolicy: "excluded by default",
      excludedFields: ["rawText", "rawTextPreview", "content", "prompt", "completion", "message"]
    },
    records: input.records.map((record) => {
      const sanitized = { ...record };
      delete sanitized.rawText;
      delete sanitized.rawTextPreview;
      return sanitized;
    })
  };
}

export function buildMetricEvidencePack(input: {
  metric: EvidenceMetric;
  generatedAt?: string;
}): EvidencePack {
  const trail = buildEvidenceTrail({ metric: input.metric });
  const analytics = getAnalyticsData();

  return buildEvidencePack({
    generatedAt: input.generatedAt,
    scope: {
      type: "metric",
      id: input.metric,
      label: trail.title
    },
    totals: trail.totals,
    confidenceDrivers: [
      `${trail.confidence.exact.toLocaleString()} exact interactions`,
      `${trail.confidence.estimated.toLocaleString()} estimated interactions`,
      `${trail.confidence.unknown.toLocaleString()} unknown interactions`,
      `Data confidence ${analytics.dataConfidence.score}/100`
    ],
    sourceFiles: trail.sourceFiles.map((source) => source.sourceFile),
    parserNotes: trail.sessions
      .map((session) => `${session.parser ?? "unknown parser"}: ${session.parserStatus ?? "unknown status"}`)
      .slice(0, 20),
    modelRateState: trail.sessions
      .map((session) =>
        session.pricingHref ? `${session.model}: model-rate link available` : `${session.model}: no model-rate link`
      )
      .slice(0, 20),
    repairLinks: trail.sessions
      .filter((session) => session.unknownCostInteractions > 0)
      .map((session) => `/repair?source=${encodeURIComponent(session.sourceFile)}`),
    records: trail.sessions.map((session) => ({
      id: session.id,
      role: "session",
      model: session.model,
      sourceFile: session.sourceFile,
      totalTokens: session.totalTokens,
      cost: session.cost,
      interactions: session.interactions
    }))
  });
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function renderEvidencePackMarkdown(pack: EvidencePack) {
  return [
    "# TokenTrace Evidence Pack",
    "",
    `Generated: ${pack.generatedAt}`,
    `Scope: ${pack.scope.type} / ${pack.scope.label}`,
    "",
    "## Totals",
    list([
      `Tokens: ${formatExactTokens(pack.totals.tokens)}`,
      `Cost: ${formatCurrency(pack.totals.cost)}`,
      `Sessions: ${pack.totals.sessions.toLocaleString()}`,
      `Interactions: ${pack.totals.interactions.toLocaleString()}`,
      `Unknown cost interactions: ${pack.totals.unknownCostInteractions.toLocaleString()}`
    ]),
    "",
    "## Confidence Drivers",
    list(pack.confidenceDrivers),
    "",
    "## Source Files",
    list(pack.sourceFiles),
    "",
    "## Parser Notes",
    list(pack.parserNotes),
    "",
    "## Model-Rate State",
    list(pack.modelRateState),
    "",
    "## Repair Links",
    list(pack.repairLinks),
    "",
    "## Redaction",
    list([
      `Raw content included: ${pack.redaction.rawContentIncluded ? "yes" : "no"}`,
      `Policy: ${pack.redaction.rawContentPolicy}`,
      `Excluded fields: ${pack.redaction.excludedFields.join(", ")}`
    ])
  ].join("\n");
}
