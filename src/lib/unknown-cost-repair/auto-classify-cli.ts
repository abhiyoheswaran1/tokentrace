import type {
  AutoClassification,
  AutoClassificationRule
} from "@/src/lib/unknown-cost-repair/auto-classify";
import type {
  UnknownCostRepairWorkbench,
  UnknownCostRepairWorkbenchGroup
} from "@/src/lib/unknown-cost-repair/types";

export type AutoClassifyCliOptions = {
  help: boolean;
  json: boolean;
  minConfidence: number;
  apply: boolean;
  dryRun: boolean;
  minConfidenceProvided: boolean;
};

export const APPLY_MIN_CONFIDENCE_FLOOR = 0.85;

export function autoClassifyUsage() {
  return `Usage: tokentrace repair auto-classify [--json] [--min-confidence=N]
       tokentrace repair auto-classify --apply --min-confidence=N [--dry-run] [--json]

Print deterministic classification suggestions for the local unknown-cost
repair queue. The classifier runs three rules in order of confidence:

  - exact-model      (case-insensitive match against a priced model)
  - family-fragment  (normalized candidate match: snapshots, prefixes, Claude family)
  - parser-source    (same source file has priced examples)

Zero AI tokens are spent. Suggestions are advisory by default.

--apply persists each qualifying exact-model or family-fragment suggestion
as a model alias in the local database and backfills costs for the matching
unknown-cost interactions using the aliased priced model's rates.
parser-source matches are skipped from --apply because they have no
(provider, observed-model) pair to persist; fix those by re-parsing the
source or setting a parser override.

Options:
  --json                Print suggestions (and apply summary) as JSON.
  --min-confidence=N    Filter to suggestions with confidence >= N (0..1).
                        Required with --apply. Floor for --apply is ${APPLY_MIN_CONFIDENCE_FLOOR}.
  --apply               Write aliases and backfill matching interaction costs.
  --dry-run             With --apply, preview the writes without persisting.
  -h, --help            Print this help.`;
}

export function parseAutoClassifyArgs(argv: string[]): AutoClassifyCliOptions {
  const options: AutoClassifyCliOptions = {
    help: false,
    json: false,
    minConfidence: 0,
    apply: false,
    dryRun: false,
    minConfidenceProvided: false
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--min-confidence=")) {
      const raw = arg.slice("--min-confidence=".length);
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new Error(`Invalid --min-confidence value: ${raw} (expected number 0..1)`);
      }
      options.minConfidence = parsed;
      options.minConfidenceProvided = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.apply) {
    if (!options.minConfidenceProvided) {
      throw new Error("--apply requires --min-confidence=N (no implicit default).");
    }
    if (options.minConfidence < APPLY_MIN_CONFIDENCE_FLOOR) {
      throw new Error(
        `--apply requires --min-confidence >= ${APPLY_MIN_CONFIDENCE_FLOOR} (received ${options.minConfidence}).`
      );
    }
  } else if (options.dryRun) {
    throw new Error("--dry-run requires --apply.");
  }

  return options;
}

type SuggestionSummary = {
  total: number;
  byRule: Record<AutoClassificationRule, number>;
  highConfidence: number;
};

function summarize(suggestions: Array<{ classification: AutoClassification }>): SuggestionSummary {
  const summary: SuggestionSummary = {
    total: suggestions.length,
    byRule: {
      "exact-model": 0,
      "family-fragment": 0,
      "parser-source": 0,
      none: 0
    },
    highConfidence: 0
  };
  for (const entry of suggestions) {
    summary.byRule[entry.classification.rule] += 1;
    if (entry.classification.confidence >= 0.85) summary.highConfidence += 1;
  }
  return summary;
}

export type AutoClassifySuggestion = {
  key: string;
  cause: UnknownCostRepairWorkbenchGroup["cause"];
  sourceFile: string;
  model: string;
  provider: string;
  tool: string;
  interactions: number;
  totalTokens: number;
  classification: AutoClassification;
};

export type AutoClassifyApplyOutcome = {
  dryRun: boolean;
  aliasesWritten: number;
  interactionsBackfilled: number;
  totalCostBackfilled: number;
  skipped: Array<{ key: string; reason: string }>;
  actions: Array<{
    key: string;
    providerId: string;
    observedModel: string;
    suggestedModel: string;
    confidence: number;
    rule: string;
    affectedInteractions: number;
    addedCost: number;
  }>;
};

export type AutoClassifyResult = {
  generatedAt: string;
  minConfidence: number;
  totalGroups: number;
  shownSuggestions: number;
  summary: SuggestionSummary;
  suggestions: AutoClassifySuggestion[];
  applied?: AutoClassifyApplyOutcome;
};

export function buildAutoClassifyResult(
  workbench: UnknownCostRepairWorkbench,
  options: { minConfidence: number }
): AutoClassifyResult {
  const filtered = workbench.groups
    .filter((group) => group.classification.confidence >= options.minConfidence)
    .map((group) => ({
      key: group.key,
      cause: group.cause,
      sourceFile: group.sourceFile,
      model: group.model,
      provider: group.provider,
      tool: group.tool,
      interactions: group.interactions,
      totalTokens: group.totalTokens,
      classification: group.classification
    }));

  return {
    generatedAt: new Date().toISOString(),
    minConfidence: options.minConfidence,
    totalGroups: workbench.groups.length,
    shownSuggestions: filtered.length,
    summary: summarize(filtered),
    suggestions: filtered
  };
}

export function renderAutoClassifyText(result: AutoClassifyResult): string {
  const lines = [
    "TokenTrace auto-classification suggestions",
    `Min confidence: ${result.minConfidence}`,
    `Suggestions: ${result.shownSuggestions} (of ${result.totalGroups} unknown-cost groups)`,
    `By rule: exact-model=${result.summary.byRule["exact-model"]}, family-fragment=${result.summary.byRule["family-fragment"]}, parser-source=${result.summary.byRule["parser-source"]}, none=${result.summary.byRule.none}`,
    `High confidence (>=0.85): ${result.summary.highConfidence}`,
    ""
  ];

  if (result.suggestions.length === 0) {
    lines.push("No suggestions match the minimum-confidence threshold.");
  } else {
    for (const entry of result.suggestions.slice(0, 30)) {
      const c = entry.classification;
      lines.push(
        `${c.rule.padEnd(16)} conf=${c.confidence.toFixed(2)} ${entry.model} -> ${c.suggestedModel ?? "(none)"} (${entry.cause}, ${entry.sourceFile})`
      );
    }
    if (result.suggestions.length > 30) {
      lines.push(`... and ${result.suggestions.length - 30} more (use --json for the full report).`);
    }
  }

  if (result.applied) {
    lines.push("");
    lines.push(
      `Apply: ${result.applied.dryRun ? "DRY RUN" : "wrote"} ${result.applied.aliasesWritten} alias(es), backfilled ${result.applied.interactionsBackfilled} interaction(s) totaling $${result.applied.totalCostBackfilled.toFixed(2)}.`
    );
    if (result.applied.skipped.length > 0) {
      lines.push(`Skipped ${result.applied.skipped.length}:`);
      for (const entry of result.applied.skipped.slice(0, 10)) {
        lines.push(`  - ${entry.key}: ${entry.reason}`);
      }
    }
  }
  return lines.join("\n");
}
