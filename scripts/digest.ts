import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildDailyDigest, renderDailyDigestText } from "@/src/lib/daily-digest";

const args = process.argv.slice(2);
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

if (args.includes("--json")) {
  console.log(JSON.stringify(digest, null, 2));
} else {
  console.log(renderDailyDigestText(digest));
}
