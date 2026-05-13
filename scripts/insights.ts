import { jsonReportUsage, parseJsonReportArgs, type JsonReportCliOptions } from "@/src/lib/report-cli";

const args = process.argv.slice(2);
let options: JsonReportCliOptions;

try {
  options = parseJsonReportArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid insights arguments.");
  console.error(jsonReportUsage("insights"));
  process.exit(1);
}

if (options.help) {
  console.log(jsonReportUsage("insights"));
  process.exit(0);
}

const { getAnalyticsData } = await import("@/src/lib/analytics");
const data = getAnalyticsData();

if (options.json) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    reviewQueue: data.reviewQueue,
    recommendations: data.recommendations,
    unknownCosts: data.unknownCosts,
    insights: data.insights
  }, null, 2));
} else {
  for (const item of data.reviewQueue.slice(0, 6)) {
    console.log(`${item.severity.toUpperCase()}: ${item.title}`);
    console.log(`  ${item.evidence}`);
    console.log(`  ${item.action}`);
  }
}
