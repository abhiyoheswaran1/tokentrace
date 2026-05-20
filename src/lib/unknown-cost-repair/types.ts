import type { UnknownCostRepairAction, UnknownCostRepairCause } from "@/src/lib/repair-actions";

export type UnknownCostRepairStatus = "unresolved" | "ignored" | "resolved" | "needs-parser-review";
export type UnknownCostReviewState = UnknownCostRepairStatus;

export type UnknownCostReviewModel = {
  key: string;
  sourceFile: string;
  model: string;
  cause: string;
  status: UnknownCostRepairStatus;
  notes: string;
  createdAt: number | null;
  updatedAt: number | null;
};

export type UnknownCostRepairSuggestion = {
  suggestedModel: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type UnknownCostRepairWorkbenchGroup = {
  key: string;
  cause: UnknownCostRepairCause;
  sourceFile: string;
  provider: string;
  model: string;
  tool: string;
  state: UnknownCostRepairStatus;
  note: string;
  suggestedModel: string | null;
  interactions: number;
  sessions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  review: Pick<UnknownCostReviewModel, "status" | "notes" | "createdAt" | "updatedAt">;
  suggestion: UnknownCostRepairSuggestion;
  itemHref: string;
  repairHref: string;
  sourceHref: string;
  sessionHref: string;
  sessionsHref: string;
  parserHref: string;
  pricingHref: string | null;
  primaryAction: UnknownCostRepairAction;
  secondaryActions: UnknownCostRepairAction[];
  impact: string;
  resolvedStateLabel: string;
};

export type UnknownCostRepairWorkbench = {
  summary: {
    unresolved: number;
    needsParserReview: number;
    ignored: number;
    resolved: number;
    totalInteractions: number;
  };
  groups: UnknownCostRepairWorkbenchGroup[];
  totalGroups: number;
  shownGroups: number;
  hasMoreGroups: boolean;
};

export type UnknownCostRepairWorkbenchOptions = {
  limit?: number;
  requiredKey?: string | null;
};

export type UnknownCostRepairMetadata = {
  sourceFile: string;
  model: string;
  cause: string;
};
