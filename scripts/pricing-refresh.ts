import { refreshPricing } from "@/src/lib/pricing-refresh";

const args = process.argv.slice(2);
const json = args.includes("--json");
const bundled = args.includes("--bundled");
const force = args.includes("--force");
const quiet = args.includes("--quiet");

const result = await refreshPricing({
  source: bundled ? "bundled" : "remote",
  force
});

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (!quiet) {
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
