import { parseCauseFromKey, parseModelFromKey, parseRepairKey } from "@/src/lib/unknown-cost-repair/keys";
import {
  bulkUpdateUnknownCostRepairsWithResolver,
  markUnknownCostRepairIgnoredWithResolver,
  markUnknownCostRepairResolvedWithResolver,
  saveUnknownCostReviewWithResolver,
  type UnknownCostRepairMetadataResolver
} from "@/src/lib/unknown-cost-repair/reviews";
import type {
  UnknownCostRepairMetadata,
  UnknownCostRepairStatus,
  UnknownCostReviewState
} from "@/src/lib/unknown-cost-repair/types";
import { findWorkbenchGroupByKey } from "@/src/lib/unknown-cost-repair/workbench";

export type {
  UnknownCostRepairAction,
  UnknownCostRepairActionKind,
  UnknownCostRepairCause
} from "@/src/lib/repair-actions";
export {
  legacyRepairKey,
  parseRepairKey,
  repairItemHref,
  repairKey,
  withQuery
} from "@/src/lib/unknown-cost-repair/keys";
export {
  getUnknownCostReview,
  listUnknownCostRepairs
} from "@/src/lib/unknown-cost-repair/reviews";
export type {
  UnknownCostRepairMetadata,
  UnknownCostRepairStatus,
  UnknownCostRepairSuggestion,
  UnknownCostRepairWorkbench,
  UnknownCostRepairWorkbenchGroup,
  UnknownCostRepairWorkbenchOptions,
  UnknownCostReviewModel,
  UnknownCostReviewState
} from "@/src/lib/unknown-cost-repair/types";
export {
  buildUnknownCostRepairReport,
  buildUnknownCostRepairWorkbench,
  findWorkbenchGroupByKey,
  type UnknownCostRepairReport
} from "@/src/lib/unknown-cost-repair/workbench";

function fallbackMetadataForKey(key: string): UnknownCostRepairMetadata {
  const group = findWorkbenchGroupByKey(key);
  if (group) {
    return {
      sourceFile: group.sourceFile,
      model: group.model,
      cause: group.cause
    };
  }

  const parsed = parseRepairKey(key);
  if (parsed) {
    return {
      sourceFile: parsed.sourceFile,
      model: parsed.model,
      cause: parsed.cause
    };
  }

  return {
    sourceFile: "",
    model: parseModelFromKey(key),
    cause: parseCauseFromKey(key)
  };
}

const repairMetadataResolver: UnknownCostRepairMetadataResolver = fallbackMetadataForKey;

export function saveUnknownCostReview(input: {
  key: string;
  sourceFile?: string;
  model?: string;
  cause?: string;
  status?: UnknownCostRepairStatus;
  notes?: string;
  state?: UnknownCostReviewState;
  note?: string;
}) {
  return saveUnknownCostReviewWithResolver(input, repairMetadataResolver);
}

export function markUnknownCostRepairResolved(key: string, notes?: string) {
  return markUnknownCostRepairResolvedWithResolver(key, notes, repairMetadataResolver);
}

export function markUnknownCostRepairIgnored(key: string, notes?: string) {
  return markUnknownCostRepairIgnoredWithResolver(key, notes, repairMetadataResolver);
}

export function bulkUpdateUnknownCostRepairs(input: {
  keys: string[];
  status: UnknownCostRepairStatus;
  notes?: string;
}) {
  return bulkUpdateUnknownCostRepairsWithResolver(input, repairMetadataResolver);
}
