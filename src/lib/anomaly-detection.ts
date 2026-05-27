import type { TrendPoint } from "@/src/lib/analytics-types";

export type AnomalySeverity = "notable" | "high" | "severe";
export type AnomalyMetric = "tokens" | "cost";

export type Anomaly = {
  date: string;
  metric: AnomalyMetric;
  value: number;
  baseline: number;
  deviation: number;
  ratio: number | null;
  zScore: number;
  severity: AnomalySeverity;
};

export type AnomalyThresholds = { notable: number; high: number; severe: number };

export type AnomalyReport = {
  generatedAt: string;
  windowSize: number;
  thresholds: AnomalyThresholds;
  anomalies: Anomaly[];
  summary: {
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byMetric: Record<AnomalyMetric, number>;
    latestAnomalyDate: string | null;
  };
};

export type DetectAnomalyOptions = {
  windowSize?: number;
  minWindow?: number;
  thresholds?: AnomalyThresholds;
};

const DEFAULT_WINDOW = 14;
const DEFAULT_MIN_WINDOW = 5;
const DEFAULT_THRESHOLDS: AnomalyThresholds = { notable: 3, high: 4.5, severe: 6 };

// Makes MAD a consistent estimator of stddev under normality.
const MAD_TO_STDDEV = 0.6745;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function medianAbsoluteDeviation(values: number[]) {
  const med = median(values);
  const deviations = values.map((value) => Math.abs(value - med));
  return { median: med, mad: median(deviations) };
}

function severityForZ(zScore: number, thresholds: AnomalyThresholds): AnomalySeverity | null {
  const absZ = Math.abs(zScore);
  if (absZ >= thresholds.severe) return "severe";
  if (absZ >= thresholds.high) return "high";
  if (absZ >= thresholds.notable) return "notable";
  return null;
}

type ScoreResult = {
  severity: AnomalySeverity | null;
  baseline: number;
  zScore: number;
};

function scoreValue(value: number, window: number[], thresholds: AnomalyThresholds): ScoreResult {
  const { median: baseline, mad } = medianAbsoluteDeviation(window);

  if (mad === 0) {
    // No spread in the window; the modified z-score is undefined. Fall back
    // to an absolute-ratio rule so we don't flag the first non-zero day
    // after a quiet stretch unless it's genuinely large.
    if (baseline <= 0) {
      return { severity: null, baseline, zScore: 0 };
    }
    const flatRunLength = window.filter((entry) => entry === baseline).length;
    if (value > 2 * baseline && flatRunLength >= 3) {
      return { severity: "severe", baseline, zScore: Number.POSITIVE_INFINITY };
    }
    return { severity: null, baseline, zScore: 0 };
  }

  const zScore = (MAD_TO_STDDEV * (value - baseline)) / mad;
  return { severity: severityForZ(zScore, thresholds), baseline, zScore };
}

const METRICS: Array<{ metric: AnomalyMetric; valueOf: (point: TrendPoint) => number }> = [
  { metric: "tokens", valueOf: (point) => point.totalTokens },
  { metric: "cost", valueOf: (point) => point.cost }
];

export function detectAnomalies(
  points: TrendPoint[],
  options: DetectAnomalyOptions = {}
): AnomalyReport {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW;
  const minWindow = options.minWindow ?? DEFAULT_MIN_WINDOW;
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;

  const anomalies: Anomaly[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const windowStart = Math.max(0, i - windowSize);
    if (i - windowStart < minWindow) continue;

    for (const { metric, valueOf } of METRICS) {
      const window: number[] = [];
      for (let j = windowStart; j < i; j += 1) {
        window.push(valueOf(points[j]));
      }
      const nonZero = window.filter((value) => value > 0);
      if (nonZero.length < minWindow) continue;

      const value = valueOf(point);
      const score = scoreValue(value, window, thresholds);
      if (!score.severity) continue;

      const deviation = value - score.baseline;
      const ratio = score.baseline > 0 ? value / score.baseline : null;
      anomalies.push({
        date: point.date,
        metric,
        value,
        baseline: score.baseline,
        deviation,
        ratio,
        zScore: score.zScore,
        severity: score.severity
      });
    }
  }

  const summary: AnomalyReport["summary"] = {
    total: anomalies.length,
    bySeverity: { notable: 0, high: 0, severe: 0 },
    byMetric: { tokens: 0, cost: 0 },
    latestAnomalyDate: null
  };

  for (const anomaly of anomalies) {
    summary.bySeverity[anomaly.severity] += 1;
    summary.byMetric[anomaly.metric] += 1;
    if (!summary.latestAnomalyDate || anomaly.date > summary.latestAnomalyDate) {
      summary.latestAnomalyDate = anomaly.date;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    windowSize,
    thresholds,
    anomalies,
    summary
  };
}
