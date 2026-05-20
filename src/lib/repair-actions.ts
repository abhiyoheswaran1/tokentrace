export type UnknownCostRepairCause =
  | "missing provider"
  | "missing model"
  | "missing pricing"
  | "missing token count"
  | "parser review"
  | "other";

export type UnknownCostRepairActionKind =
  | "set-model-rate"
  | "review-parser"
  | "view-evidence"
  | "open-focused-repair"
  | "recalculate-after-change";

export type UnknownCostRepairAction = {
  kind: UnknownCostRepairActionKind;
  label: string;
  href: string;
  description: string;
  expectedChange: string;
};

export type RepairActionContext = {
  cause: UnknownCostRepairCause;
  model: string;
  tool: string;
  sourceFile: string;
  itemHref: string;
  parserHref: string;
  pricingHref: string | null;
  sourceHref: string;
};

export function repairImpact(cause: UnknownCostRepairCause) {
  if (cause === "missing pricing") {
    return "After setting the model rate and recalculating, these interactions can move from unknown cost into priced or estimated cost totals.";
  }
  if (cause === "missing model") {
    return "After parser review records a usable model name, TokenTrace can match the interaction to model rates and remove the model gap.";
  }
  if (cause === "missing token count") {
    return "After parser review recovers usable token counts, the interaction can be priced instead of staying unknown.";
  }
  if (cause === "parser review") {
    return "After parser review confirms the source shape, supported rows can be imported with clearer token and cost confidence.";
  }
  if (cause === "missing provider") {
    return "After parser review restores provider metadata, TokenTrace can route the model to the right local pricing table.";
  }
  return "After the missing metadata is corrected and recalculated, this group should leave unresolved unknown-cost repair.";
}

export function resolvedStateLabel(cause: UnknownCostRepairCause) {
  if (cause === "missing pricing") return "Resolved after local pricing recalculation";
  if (cause === "missing model") return "Resolved after parser evidence is corrected";
  if (cause === "missing token count") return "Resolved after token counts are recovered";
  if (cause === "missing provider") return "Resolved after provider metadata is corrected";
  if (cause === "parser review") return "Resolved after parser review is verified";
  return "Resolved after local repair is verified";
}

export function primaryRepairAction(context: RepairActionContext): UnknownCostRepairAction {
  if (context.cause === "missing pricing" && context.pricingHref) {
    return {
      kind: "set-model-rate",
      label: "Set model rate",
      href: context.pricingHref,
      description: `Add local input and output prices for ${context.model}.`,
      expectedChange: "These interactions can move from unknown cost into priced or estimated cost totals."
    };
  }

  if (context.cause === "missing token count") {
    return {
      kind: "review-parser",
      label: "Recover token counts",
      href: context.parserHref,
      description: `Inspect parser output for ${context.sourceFile}.`,
      expectedChange: "Parser review can recover usable token counts so costs can be recalculated."
    };
  }

  if (context.cause === "missing provider") {
    return {
      kind: "review-parser",
      label: "Review provider evidence",
      href: context.parserHref,
      description: `Inspect provider metadata for ${context.tool}.`,
      expectedChange: "Parser review can restore provider metadata so the model can map to pricing."
    };
  }

  if (context.cause === "missing model") {
    return {
      kind: "review-parser",
      label: "Review parser evidence",
      href: context.parserHref,
      description: `Inspect parser output for ${context.sourceFile}.`,
      expectedChange: "Parser review can recover a usable model name so pricing can be matched."
    };
  }

  if (context.cause === "parser review") {
    return {
      kind: "review-parser",
      label: "Review parser evidence",
      href: context.parserHref,
      description: `Resolve parser warnings for ${context.sourceFile}.`,
      expectedChange: "Parser review can confirm whether supported rows should import with clearer confidence."
    };
  }

  return {
    kind: "view-evidence",
    label: "View evidence",
    href: context.sourceHref,
    description: `Inspect the source sessions for ${context.model}.`,
    expectedChange: "Evidence review identifies which metadata needs correction before recalculation."
  };
}

export function secondaryRepairActions(context: RepairActionContext, primary: UnknownCostRepairAction) {
  const actions: UnknownCostRepairAction[] = [
    {
      kind: "view-evidence",
      label: "View evidence",
      href: context.sourceHref,
      description: "Open the local sessions that produced this unknown-cost group.",
      expectedChange: "Evidence confirms the source rows affected by the repair."
    },
    {
      kind: "review-parser",
      label: "Review parser",
      href: context.parserHref,
      description: "Inspect parser status, warnings, and raw metadata for this source file.",
      expectedChange: "Parser review clarifies whether model, token, or provider metadata needs repair."
    },
    {
      kind: "open-focused-repair",
      label: "Open repair",
      href: context.itemHref,
      description: "Focus this repair item with its state controls and evidence links.",
      expectedChange: "The repair stays isolated while you update state, notes, or related evidence."
    },
    {
      kind: "recalculate-after-change",
      label: "Recalculate after change",
      href: "/diagnostics",
      description: "Run a local scan or pricing refresh after changing parser or rate data.",
      expectedChange: "Recalculation should reduce unresolved unknown-cost interactions."
    }
  ];

  return actions.filter((action) => action.kind !== primary.kind || action.href !== primary.href);
}
