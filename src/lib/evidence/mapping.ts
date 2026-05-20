import { metricTitles, withQuery, type EvidenceMetric } from "@/src/lib/evidence/metrics";
import type { EvidenceTrailRows } from "@/src/lib/evidence/query";

export type EvidenceTrailSession = {
  id: string;
  title: string;
  tool: string;
  provider: string;
  project: string;
  model: string;
  sourceFile: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  tokenConfidence: string;
  totalTokens: number;
  cost: number | null;
  unknownCostInteractions: number;
  interactions: number;
  sessionHref: string;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type EvidenceTrail = {
  metric: EvidenceMetric;
  title: string;
  description: string;
  totals: {
    tokens: number;
    cost: number;
    sessions: number;
    interactions: number;
    unknownCostInteractions: number;
  };
  confidence: {
    exact: number;
    estimated: number;
    unknown: number;
  };
  sourceFiles: Array<{
    sourceFile: string;
    tokens: number;
    sessions: number;
    interactions: number;
    unknownCostInteractions: number;
    sourceHref: string;
    parserHref: string;
  }>;
  sessions: EvidenceTrailSession[];
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function mapEvidenceTrail({
  metric,
  rows
}: {
  metric: EvidenceMetric;
  rows: EvidenceTrailRows;
}): EvidenceTrail {
  const config = metricTitles[metric] ?? metricTitles["processed-tokens"];
  const sessions: EvidenceTrailSession[] = rows.sessions.map((session) => {
    const cost = session.cost == null ? null : number(session.cost);
    return {
      id: session.id,
      title: session.title,
      tool: session.tool,
      provider: session.provider,
      project: session.project,
      model: session.model,
      sourceFile: session.sourceFile,
      parser: session.parser,
      parserStatus: session.parserStatus,
      parserConfidence:
        typeof session.parserConfidence === "number" && Number.isFinite(session.parserConfidence)
          ? session.parserConfidence
          : null,
      tokenConfidence: session.tokenConfidence,
      totalTokens: number(session.totalTokens),
      cost: metric === "unknown-cost" && number(session.unknownCostInteractions) > 0 ? null : cost,
      unknownCostInteractions: number(session.unknownCostInteractions),
      interactions: number(session.interactions),
      sessionHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
      sourceHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
      parserHref: withQuery("/parser-debug", { source: session.sourceFile }),
      pricingHref: session.pricingModel ? withQuery("/pricing", { model: session.pricingModel }) : null
    };
  });

  return {
    metric,
    title: config.title,
    description: config.description,
    totals: {
      tokens: number(rows.totals.tokens),
      cost: number(rows.totals.cost),
      sessions: number(rows.totals.sessions),
      interactions: number(rows.totals.interactions),
      unknownCostInteractions: number(rows.totals.unknownCostInteractions)
    },
    confidence: {
      exact: number(rows.confidence.exact),
      estimated: number(rows.confidence.estimated),
      unknown: number(rows.confidence.unknown)
    },
    sourceFiles: rows.sourceFiles.map((source) => ({
      sourceFile: source.sourceFile,
      tokens: number(source.tokens),
      sessions: number(source.sessions),
      interactions: number(source.interactions),
      unknownCostInteractions: number(source.unknownCostInteractions),
      sourceHref: withQuery("/sessions", { source: source.sourceFile, evidence: metric }),
      parserHref: withQuery("/parser-debug", { source: source.sourceFile })
    })),
    sessions
  };
}
