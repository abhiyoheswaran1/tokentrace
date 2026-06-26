import type { UnknownCostRepairCause } from "@/src/lib/repair-actions";

export type AutoClassificationRule = "exact-model" | "family-fragment" | "parser-source" | "none";

export type AutoClassification = {
  suggestedModel: string | null;
  suggestedProvider: string | null;
  confidence: number;
  rule: AutoClassificationRule;
  evidence: {
    matchedRows: number;
    sampleSourceFile: string | null;
  };
};

export type ClassifyInput = {
  cause: UnknownCostRepairCause;
  providerId: string;
  model: string;
  sourceFile: string;
};

export type PricedModelRow = {
  providerId: string;
  providerName: string;
  modelName: string;
  usageCount: number;
};

export type SourcePricedRow = {
  sourceFile: string;
  providerId: string;
  providerName: string;
  modelName: string;
  usageCount: number;
};

export type ClassificationLookups = {
  pricedByProvider: Map<string, PricedModelRow[]>;
  pricedBySource: Map<string, SourcePricedRow>;
};
