import { jsonReportUsage, parseJsonReportArgs, type JsonReportCliOptions } from "@/src/lib/report-cli";

const args = process.argv.slice(2);
let options: JsonReportCliOptions;

try {
  options = parseJsonReportArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid digest arguments.");
  console.error(jsonReportUsage("digest"));
  process.exit(1);
}

if (options.help) {
  console.log(jsonReportUsage("digest"));
  process.exit(0);
}

const [{ getAnalyticsData, getScanTrustData }, { buildDailyDigest, renderDailyDigestText }] = await Promise.all([
  import("@/src/lib/analytics"),
  import("@/src/lib/daily-digest")
]);
const data = getAnalyticsData();
const trust = getScanTrustData();
const latestRun = trust.health.latestRun;
const digest = buildDailyDigest({
  summary: data.summary,
  usageGuardrails: data.usageGuardrails,
  reviewQueue: data.reviewQueue,
  projects: data.projects,
  latestScan: latestRun
    ? {
        headline: trust.health.headline,
        completedAt: latestRun.completedAt,
        recordsImported: latestRun.recordsImported,
        filesScanned: latestRun.filesScanned
      }
    : null
});

if (options.json) {
  console.log(JSON.stringify(digest, null, 2));
} else {
  console.log(renderDailyDigestText(digest));
}
