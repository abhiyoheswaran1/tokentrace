import { getAnalyticsData } from "@/src/lib/analytics";

const args = process.argv.slice(2);
const data = getAnalyticsData();

if (args.includes("--json")) {
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
