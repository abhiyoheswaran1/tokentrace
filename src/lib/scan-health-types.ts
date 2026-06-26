export type ScanHealthRun = {
  id: string;
  startedAt: number;
  completedAt: number | null;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
};

export type ScanHealthFile = {
  id: string;
  scanRunId: string;
  path: string;
  modifiedTime: number | null;
  sizeBytes: number;
  parser: string | null;
  status: string;
  recordsImported: number;
  warnings: string[];
  errors: string[];
  rawMetadata: Record<string, unknown>;
};

export type ScanConfidenceSummary = {
  interactions: number;
  exactTokenInteractions: number;
  tokenizerEstimateInteractions?: number;
  simpleEstimateInteractions?: number;
  highConfidenceTokenInteractions: number;
  lowConfidenceTokenInteractions: number;
  unknownTokenInteractions: number;
  estimatedTokenInteractions: number;
  exactCostInteractions: number;
  estimatedCostInteractions: number;
  unknownCostInteractions: number;
  unknownCostCauses: {
    missingModelName: number;
    missingPricing: number;
    missingTokenCount: number;
    other: number;
  };
};

export type ScanHealthAction = {
  label: string;
  href: string;
  reason: string;
  tone: "default" | "warning" | "destructive";
};

export type SupplyChainHealth = {
  status: "passed" | "failed" | "not-run";
  checkedAt: number | null;
  findings: number;
  summary: string;
};

export type ScanHealthNoteGroup = {
  severity: "warning" | "error";
  message: string;
  count: number;
  examples: string[];
};

export type ScanHealth = {
  latestRun: ScanHealthRun | null;
  lastSuccessfulRun: ScanHealthRun | null;
  latestFiles: ScanHealthFile[];
  headline: string;
  description: string;
  tone: "success" | "warning" | "destructive" | "secondary";
  latestStatusCounts: Record<string, number>;
  parserCounts: Record<string, number>;
  latestWarnings: string[];
  latestErrors: string[];
  latestNoteGroups: ScanHealthNoteGroup[];
  freshness: {
    state: "no-scan" | "no-successful-scan" | "fresh" | "stale";
    lastSuccessfulCompletedAt: number | null;
    staleAfterMs: number;
    description: string;
  };
  tokenCoverage: {
    exact: number;
    tokenizerEstimate: number;
    simpleEstimate: number;
    highConfidenceEstimate: number;
    lowConfidenceEstimate: number;
    unknown: number;
    estimated: number;
    total: number;
  };
  costCoverage: {
    priced: number;
    exact: number;
    estimated: number;
    unknown: number;
    unknownCauses: ScanConfidenceSummary["unknownCostCauses"];
    total: number;
  };
  supplyChain: SupplyChainHealth;
  actions: ScanHealthAction[];
};
