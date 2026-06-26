import { prepareCached } from "@/src/db/prepared";
import { modelNameCandidates } from "@/src/lib/model-aliases";
import type {
  AutoClassification,
  ClassificationLookups,
  ClassifyInput,
  PricedModelRow,
  SourcePricedRow
} from "@/src/lib/unknown-cost-repair/classification-types";

export type {
  AutoClassification,
  AutoClassificationRule,
  ClassificationLookups,
  ClassifyInput,
  PricedModelRow,
  SourcePricedRow
} from "@/src/lib/unknown-cost-repair/classification-types";

export function buildClassificationLookups(): ClassificationLookups {
  const pricedRows = prepareCached(
    `SELECT
       m.provider_id AS providerId,
       COALESCE(p.name, 'Unknown') AS providerName,
       m.name AS modelName,
       COUNT(i.id) AS usageCount
     FROM models m
     LEFT JOIN providers p ON p.id = m.provider_id
     LEFT JOIN interactions i ON i.model_id = m.id AND i.cost IS NOT NULL
     WHERE m.input_token_price IS NOT NULL AND m.output_token_price IS NOT NULL
     GROUP BY m.id, m.provider_id, m.name, p.name`
  ).all() as PricedModelRow[];

  const pricedByProvider = new Map<string, PricedModelRow[]>();
  for (const row of pricedRows) {
    const bucket = pricedByProvider.get(row.providerId) ?? [];
    bucket.push({
      providerId: row.providerId,
      providerName: row.providerName,
      modelName: row.modelName,
      usageCount: Number(row.usageCount ?? 0)
    });
    pricedByProvider.set(row.providerId, bucket);
  }

  const sourceRows = prepareCached(
    `SELECT
       s.source_file AS sourceFile,
       m.provider_id AS providerId,
       COALESCE(p.name, 'Unknown') AS providerName,
       m.name AS modelName,
       COUNT(i.id) AS usageCount
     FROM interactions i
     JOIN sessions s ON s.id = i.session_id
     JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NOT NULL
       AND m.input_token_price IS NOT NULL
       AND m.output_token_price IS NOT NULL
     GROUP BY s.source_file, m.id, m.provider_id, m.name, p.name`
  ).all() as SourcePricedRow[];

  const pricedBySource = new Map<string, SourcePricedRow>();
  for (const row of sourceRows) {
    const normalized: SourcePricedRow = {
      sourceFile: row.sourceFile,
      providerId: row.providerId,
      providerName: row.providerName,
      modelName: row.modelName,
      usageCount: Number(row.usageCount ?? 0)
    };
    const existing = pricedBySource.get(row.sourceFile);
    if (!existing || normalized.usageCount > existing.usageCount) {
      pricedBySource.set(row.sourceFile, normalized);
    }
  }

  return { pricedByProvider, pricedBySource };
}

export function emptyClassification(): AutoClassification {
  return {
    suggestedModel: null,
    suggestedProvider: null,
    confidence: 0,
    rule: "none",
    evidence: { matchedRows: 0, sampleSourceFile: null }
  };
}

function findExactModelMatch(input: ClassifyInput, lookups: ClassificationLookups): AutoClassification | null {
  const siblings = lookups.pricedByProvider.get(input.providerId) ?? [];
  if (siblings.length === 0) return null;
  const candidates = modelNameCandidates(input.model);
  const first = candidates[0]?.toLowerCase();
  const exact = siblings.find((row) => row.modelName.toLowerCase() === first);
  if (!exact) return null;
  return {
    suggestedModel: exact.modelName,
    suggestedProvider: exact.providerName,
    confidence: 0.95,
    rule: "exact-model",
    evidence: { matchedRows: exact.usageCount, sampleSourceFile: null }
  };
}

function findFamilyMatch(input: ClassifyInput, lookups: ClassificationLookups): AutoClassification | null {
  const siblings = lookups.pricedByProvider.get(input.providerId) ?? [];
  if (siblings.length === 0) return null;
  const candidates = modelNameCandidates(input.model);
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (candidate === undefined) continue;
    const lowered = candidate.toLowerCase();
    const match = siblings.find((row) => row.modelName.toLowerCase() === lowered);
    if (match) {
      return {
        suggestedModel: match.modelName,
        suggestedProvider: match.providerName,
        confidence: 0.7,
        rule: "family-fragment",
        evidence: { matchedRows: match.usageCount, sampleSourceFile: null }
      };
    }
  }
  return null;
}

function findParserSourceMatch(input: ClassifyInput, lookups: ClassificationLookups): AutoClassification | null {
  const sourceMatch = lookups.pricedBySource.get(input.sourceFile);
  if (!sourceMatch) return null;
  return {
    suggestedModel: sourceMatch.modelName,
    suggestedProvider: sourceMatch.providerName,
    confidence: 0.45,
    rule: "parser-source",
    evidence: {
      matchedRows: sourceMatch.usageCount,
      sampleSourceFile: sourceMatch.sourceFile
    }
  };
}

export function classifyGroup(input: ClassifyInput, lookups: ClassificationLookups): AutoClassification {
  const exact = findExactModelMatch(input, lookups);
  if (exact) return exact;
  const family = findFamilyMatch(input, lookups);
  if (family) return family;
  const source = findParserSourceMatch(input, lookups);
  if (source) return source;
  return emptyClassification();
}
