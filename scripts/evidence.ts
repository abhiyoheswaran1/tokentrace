import {
  buildEvidenceTrail,
  parseEvidenceMetric,
  type EvidenceMetric
} from "@/src/lib/evidence-trail";

const args = process.argv.slice(2);

const evidenceMetrics = new Set<EvidenceMetric>([
  "processed-tokens",
  "non-cache-tokens",
  "cached-tokens",
  "estimated-cost",
  "sessions",
  "unknown-cost",
  "guardrails",
  "review-queue"
]);

function usage() {
  return `Usage: tokentrace evidence --json [--metric=<metric>]

Metrics: ${Array.from(evidenceMetrics).join(", ")}`;
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let json = false;
  let metricArg: string | undefined;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("--metric=")) {
      metricArg = arg.slice("--metric=".length);
      if (!metricArg) fail("Invalid evidence metric: missing value.");
      continue;
    }
    if (arg === "--metric") {
      fail("Invalid evidence metric: use --metric=<metric>.");
    }
    if (arg.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (metricArg && !evidenceMetrics.has(metricArg as EvidenceMetric)) {
    fail(`Invalid evidence metric: ${metricArg}`);
  }

  return {
    json,
    metric: parseEvidenceMetric(metricArg)
  };
}

const options = parseArgs(args);
const trail = buildEvidenceTrail({ metric: options.metric });

if (options.json) {
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
