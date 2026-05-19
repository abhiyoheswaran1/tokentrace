import { formatCurrency, formatExactTokens } from "@/src/lib/format";

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
