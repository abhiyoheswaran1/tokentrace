import {
  parsePricingRefreshArgs,
  pricingRefreshUsage,
  type PricingRefreshCliOptions
} from "@/src/lib/pricing-refresh-cli";

const args = process.argv.slice(2);
let options: PricingRefreshCliOptions;

try {
  options = parsePricingRefreshArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid pricing refresh arguments.");
  console.error(pricingRefreshUsage());
  process.exit(1);
}

if (options.help) {
  console.log(pricingRefreshUsage());
  process.exit(0);
}

const { refreshPricing } = await import("@/src/lib/pricing-refresh");

const result = await refreshPricing({
  source: options.bundled ? "bundled" : "remote",
  force: options.force
});

if (options.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (!options.quiet) {
  console.log("TokenTrace pricing refresh complete");
  console.log(`Source: ${result.source}`);
  console.log(`Checked at: ${result.checkedAt}`);
  console.log(`Imported: ${result.imported}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Manual rows skipped: ${result.skippedManual}`);
  console.log(`Costs recalculated: ${result.costsRecalculated}`);
  console.log(`Model aliases updated: ${result.modelAliasesUpdated}`);
  console.log(`Unknown cost interactions: ${result.unknownCostInteractions}`);
  if (result.error) console.log(`Fallback reason: ${result.error}`);
}
