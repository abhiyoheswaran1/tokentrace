import { anomaliesUsage, parseAnomaliesArgs, type AnomaliesCliOptions } from "@/src/lib/anomalies-cli";
import type { Anomaly, AnomalyReport } from "@/src/lib/anomaly-detection";

const args = process.argv.slice(2);
let options: AnomaliesCliOptions;

try {
  options = parseAnomaliesArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid anomalies arguments.");
  console.error(anomaliesUsage());
  process.exit(1);
}

if (options.help) {
  console.log(anomaliesUsage());
  process.exit(0);
}

const [{ getTrends }, { detectAnomalies }] = await Promise.all([
  import("@/src/lib/analytics/trends"),
  import("@/src/lib/anomaly-detection")
]);

const trends = getTrends();
const report = detectAnomalies(trends, { windowSize: options.window });

function filterReport(input: AnomalyReport): AnomalyReport {
  if (options.metric === "all") return input;
  const anomalies = input.anomalies.filter((entry) => entry.metric === options.metric);
  return {
    ...input,
    anomalies,
    summary: {
      total: anomalies.length,
      bySeverity: anomalies.reduce(
        (current, entry) => {
          current[entry.severity] += 1;
          return current;
        },
        { notable: 0, high: 0, severe: 0 }
      ),
      byMetric: anomalies.reduce(
        (current, entry) => {
          current[entry.metric] += 1;
          return current;
        },
        { tokens: 0, cost: 0 }
      ),
      latestAnomalyDate: anomalies.length
        ? anomalies[anomalies.length - 1].date
        : null
    }
  };
}

const filtered = filterReport(report);

function renderText(input: AnomalyReport) {
  const lines = [
    "TokenTrace Anomaly Report",
    `Window: ${input.windowSize} days · Thresholds notable=${input.thresholds.notable}, high=${input.thresholds.high}, severe=${input.thresholds.severe}`,
    `Anomalies: ${input.summary.total} (severe=${input.summary.bySeverity.severe}, high=${input.summary.bySeverity.high}, notable=${input.summary.bySeverity.notable})`,
    `By metric: tokens=${input.summary.byMetric.tokens}, cost=${input.summary.byMetric.cost}`,
    input.summary.latestAnomalyDate ? `Latest anomaly: ${input.summary.latestAnomalyDate}` : null,
    ""
  ].filter((line): line is string => line != null);

  if (input.anomalies.length === 0) {
    lines.push("No deviations detected. Run `tokentrace anomalies --json` for the empty report shape.");
    return lines.join("\n");
  }

  for (const anomaly of input.anomalies.slice(0, 20)) {
    lines.push(formatLine(anomaly));
  }
  if (input.anomalies.length > 20) {
    lines.push(`... and ${input.anomalies.length - 20} more (use --json for the full report).`);
  }
  return lines.join("\n");
}

function formatLine(anomaly: Anomaly) {
  const ratio = anomaly.ratio != null && Number.isFinite(anomaly.ratio)
    ? `${anomaly.ratio.toFixed(2)}x`
    : "n/a";
  const z = Number.isFinite(anomaly.zScore) ? anomaly.zScore.toFixed(2) : "inf";
  return `${anomaly.severity.padEnd(7)} ${anomaly.date} ${anomaly.metric.padEnd(6)} value=${anomaly.value} baseline=${anomaly.baseline} ratio=${ratio} z=${z}`;
}

if (options.json) {
  console.log(JSON.stringify(filtered, null, 2));
} else {
  console.log(renderText(filtered));
}
