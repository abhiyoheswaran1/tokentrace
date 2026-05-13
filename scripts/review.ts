import { digestUsage, parseDigestArgs, type DigestCliOptions } from "@/src/lib/report-cli";

const args = process.argv.slice(2);
let options: DigestCliOptions;

try {
  options = parseDigestArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid review arguments.");
  console.error(digestUsage().replace("tokentrace digest", "tokentrace review"));
  process.exit(1);
}

if (options.help) {
  console.log(digestUsage().replace("tokentrace digest", "tokentrace review"));
  process.exit(0);
}

const [
  { getAnalyticsData, getScanTrustData },
  { buildPostSessionReview, renderPostSessionReviewText },
  { buildScanDiff },
  { resolveSinceFilter }
] = await Promise.all([
  import("@/src/lib/analytics"),
  import("@/src/lib/post-session-review"),
  import("@/src/lib/scan-diff"),
  import("@/src/lib/since-filter")
]);

const trust = getScanTrustData();
const latestRun = trust.health.latestRun;
const since = resolveSinceFilter(options.since, { latestScanStartedAt: latestRun?.startedAt ?? null });
const data = getAnalyticsData(since.filters);
const review = buildPostSessionReview({
  scanDiff: buildScanDiff(),
  usageGuardrails: data.usageGuardrails,
  summary: data.summary,
  sessions: data.sessions
});

if (options.json) {
  console.log(JSON.stringify(review, null, 2));
} else {
  console.log(renderPostSessionReviewText(review));
}
