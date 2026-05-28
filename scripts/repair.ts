const args = process.argv.slice(2);

export {};

const HELP = [
  "Usage:",
  "  tokentrace repair [--json]",
  "  tokentrace repair auto-classify [--json] [--min-confidence=N]",
  "  tokentrace repair set-parser <path> --parser <id> [--note \"...\"] [--json]",
  "  tokentrace repair set-parser <path> --exclude [--note \"...\"] [--json]",
  "  tokentrace repair clear-parser <path> [--json]"
].join("\n");

function fail(message: string): never {
  console.error(message);
  console.error(HELP);
  process.exit(1);
}

if (args[0] === "--help" || args[0] === "-h") {
  console.log(HELP);
  process.exit(0);
}

if (args[0] === "auto-classify") {
  const {
    autoClassifyUsage,
    buildAutoClassifyResult,
    parseAutoClassifyArgs,
    renderAutoClassifyText
  } = await import("@/src/lib/unknown-cost-repair/auto-classify-cli");

  let options;
  try {
    options = parseAutoClassifyArgs(args.slice(1));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid auto-classify arguments.");
    console.error(autoClassifyUsage());
    process.exit(1);
  }

  if (options.help) {
    console.log(autoClassifyUsage());
    process.exit(0);
  }

  const { buildUnknownCostRepairWorkbench } = await import("@/src/lib/unknown-cost-repair");
  const workbench = buildUnknownCostRepairWorkbench();
  const result = buildAutoClassifyResult(workbench, { minConfidence: options.minConfidence });

  if (options.apply) {
    const [{ upsertAlias }, { backfillAlias }, { prepareCached }, { sqlite }] = await Promise.all([
      import("@/src/lib/model-aliases/store"),
      import("@/src/lib/model-aliases/backfill"),
      import("@/src/db/prepared"),
      import("@/src/db/client")
    ]);

    const outcome: NonNullable<typeof result.applied> = {
      dryRun: options.dryRun,
      aliasesWritten: 0,
      interactionsBackfilled: 0,
      totalCostBackfilled: 0,
      skipped: [],
      actions: []
    };

    // The classifier emits providerName (display), but aliases require providerId.
    // Map by group.provider (display name) -> providerId via the priced-model row.
    const resolvePricedModelId = (providerName: string, modelName: string) => {
      const row = prepareCached(
        `SELECT m.id AS modelId, m.provider_id AS providerId
         FROM models m
         LEFT JOIN providers p ON p.id = m.provider_id
         WHERE m.name = ? AND (p.name = ? OR m.provider_id = ?)
         LIMIT 1`
      ).get(modelName, providerName, providerName) as
        | { modelId: string; providerId: string }
        | undefined;
      return row ?? null;
    };

    const processSuggestion = (suggestion: (typeof result.suggestions)[number]) => {
      const c = suggestion.classification;
      if (c.rule === "none" || !c.suggestedModel) {
        outcome.skipped.push({ key: suggestion.key, reason: "No suggested model." });
        return;
      }
      if (c.rule === "parser-source") {
        outcome.skipped.push({
          key: suggestion.key,
          reason: "parser-source suggestions have no (provider, observed-model) pair; fix the parser instead."
        });
        return;
      }
      const resolved = resolvePricedModelId(
        c.suggestedProvider ?? suggestion.provider,
        c.suggestedModel
      );
      if (!resolved) {
        outcome.skipped.push({
          key: suggestion.key,
          reason: `Could not resolve priced model "${c.suggestedModel}" under provider "${suggestion.provider}".`
        });
        return;
      }

      if (!options.dryRun) {
        upsertAlias({
          providerId: resolved.providerId,
          observedModel: suggestion.model,
          pricedModelId: resolved.modelId,
          confidence: c.confidence,
          rule: c.rule
        });
      }

      const backfill = backfillAlias(
        {
          providerId: resolved.providerId,
          observedModel: suggestion.model,
          pricedModelId: resolved.modelId
        },
        { dryRun: options.dryRun }
      );

      outcome.aliasesWritten += 1;
      outcome.interactionsBackfilled += backfill.affectedInteractions;
      outcome.totalCostBackfilled += backfill.totalCost;
      outcome.actions.push({
        key: suggestion.key,
        providerId: resolved.providerId,
        observedModel: suggestion.model,
        suggestedModel: c.suggestedModel,
        confidence: c.confidence,
        rule: c.rule,
        affectedInteractions: backfill.affectedInteractions,
        addedCost: backfill.totalCost
      });
    };

    if (options.dryRun) {
      for (const suggestion of result.suggestions) processSuggestion(suggestion);
    } else {
      // Apply the whole batch atomically: every alias + cost backfill commits
      // together, or none does, so a failure partway can't leave the local
      // database half-applied with inaccurate reported counts.
      const applyBatch = sqlite.transaction(() => {
        for (const suggestion of result.suggestions) processSuggestion(suggestion);
      });
      applyBatch();
    }

    result.applied = outcome;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderAutoClassifyText(result));
  }
  process.exit(0);
}

if (args[0] === "set-parser" || args[0] === "clear-parser") {
  const { parseParserOverrideArgs, runParserOverrideAction } = await import(
    "@/src/lib/parser-overrides-cli"
  );
  try {
    const action = parseParserOverrideArgs(args);
    console.log(runParserOverrideAction(action));
    process.exit(0);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function parseArgs(argv: string[]) {
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    }
    fail(`Unknown argument: ${arg}`);
  }

  return { json };
}

const options = parseArgs(args);
const { buildUnknownCostRepairWorkbench } = await import("@/src/lib/unknown-cost-repair");
const workbench = buildUnknownCostRepairWorkbench();

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...workbench
      },
      null,
      2
    )
  );
} else {
  console.log("TokenTrace Unknown Cost Repair");
  console.log(`${workbench.summary.totalInteractions.toLocaleString()} unknown-cost interactions`);
  for (const group of workbench.groups.slice(0, 8)) {
    console.log(`- ${group.cause}: ${group.model} (${group.interactions.toLocaleString()} interactions)`);
    console.log(`  ${group.repairHref}`);
  }
}
