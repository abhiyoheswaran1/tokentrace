import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";

const args = process.argv.slice(2);
const metricArg = args.find((arg) => arg.startsWith("--metric="))?.slice("--metric=".length);
const trail = buildEvidenceTrail({ metric: parseEvidenceMetric(metricArg) });

if (args.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...trail
      },
      null,
      2
    )
  );
} else {
  console.log(`TokenTrace Evidence: ${trail.title}`);
  console.log(trail.description);
  console.log(
    `${trail.totals.sessions.toLocaleString()} sessions, ${trail.totals.interactions.toLocaleString()} interactions, ${trail.totals.tokens.toLocaleString()} tokens`
  );
  for (const session of trail.sessions.slice(0, 8)) {
    console.log(`- ${session.title}: ${session.totalTokens.toLocaleString()} tokens, ${session.sourceFile}`);
  }
}
