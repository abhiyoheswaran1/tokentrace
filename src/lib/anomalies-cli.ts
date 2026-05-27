export type AnomaliesCliMetric = "tokens" | "cost" | "all";

export type AnomaliesCliOptions = {
  help: boolean;
  json: boolean;
  window: number;
  metric: AnomaliesCliMetric;
};

export function anomaliesUsage() {
  return `Usage: tokentrace anomalies [--json] [--window=N] [--metric=tokens|cost|all]

Detect deviations in the local daily token and cost trend using a
modified-z-score (MAD) detector. Zero AI tokens are spent; the math runs
locally over the existing TokenTrace SQLite database.

Options:
  --json            Print the anomaly report as JSON.
  --window=N        Trailing window size in days (default 14, min 3, max 60).
  --metric=NAME     Filter output to a single metric (default 'all').
                    Accepted: tokens, cost, all.
  -h, --help        Print this help.`;
}

function parseWindow(raw: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`Invalid --window value: ${raw}`);
  }
  if (value < 3 || value > 60) {
    throw new Error(`--window must be between 3 and 60 (received ${value})`);
  }
  return value;
}

function parseMetric(raw: string): AnomaliesCliMetric {
  if (raw === "tokens" || raw === "cost" || raw === "all") return raw;
  throw new Error(`Invalid --metric value: ${raw} (expected tokens, cost, or all)`);
}

export function parseAnomaliesArgs(argv: string[]): AnomaliesCliOptions {
  const options: AnomaliesCliOptions = {
    help: false,
    json: false,
    window: 14,
    metric: "all"
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("--window=")) {
      options.window = parseWindow(arg.slice("--window=".length));
      continue;
    }
    if (arg.startsWith("--metric=")) {
      options.metric = parseMetric(arg.slice("--metric=".length));
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
