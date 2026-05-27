import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/src/lib/anomaly-detection";
import type { TrendPoint } from "@/src/lib/analytics-types";

function dateAt(dayIndex: number) {
  const base = new Date(Date.UTC(2026, 0, 1));
  base.setUTCDate(base.getUTCDate() + dayIndex);
  return base.toISOString().slice(0, 10);
}

function makeSeries(values: number[]): TrendPoint[] {
  return values.map((value, index) => ({
    date: dateAt(index),
    totalTokens: value,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    cost: value * 0.001
  }));
}

function stableBaseline(): number[] {
  // 14 alternating values: median=100, deviations from median all = 10, MAD=10.
  const out: number[] = [];
  for (let i = 0; i < 14; i += 1) out.push(i % 2 === 0 ? 90 : 110);
  return out;
}

describe("detectAnomalies", () => {
  it("returns an empty report for empty input", () => {
    const report = detectAnomalies([]);
    expect(report.anomalies).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.summary.latestAnomalyDate).toBeNull();
    expect(report.windowSize).toBeGreaterThan(0);
  });

  it("returns no anomalies for a perfectly flat series", () => {
    const series = makeSeries(Array(30).fill(100));
    const report = detectAnomalies(series);
    expect(report.anomalies).toEqual([]);
    expect(report.summary.total).toBe(0);
  });

  it("flags a single severe spike against a stable baseline", () => {
    // 14 stable days then a 10x spike on day 14.
    const series = makeSeries([...stableBaseline(), 1000]);
    const report = detectAnomalies(series);
    const tokenAnomalies = report.anomalies.filter((a) => a.metric === "tokens");
    expect(tokenAnomalies).toHaveLength(1);
    const anomaly = tokenAnomalies[0];
    expect(anomaly.date).toBe(dateAt(14));
    expect(anomaly.severity).toBe("severe");
    expect(anomaly.value).toBe(1000);
    expect(anomaly.baseline).toBe(100);
    expect(anomaly.zScore).toBeGreaterThan(6);
    expect(anomaly.ratio).toBeCloseTo(10, 5);
  });

  it("buckets severity by modified z-score thresholds", () => {
    // baseline window median=100, mad=10. modified z = 0.6745 * (value - 100) / 10.
    // value=150 -> z≈3.37 (notable), value=170 -> z≈4.72 (high), value=200 -> z≈6.745 (severe),
    // value=110 -> z≈0.67 (none).
    const cases: Array<{ value: number; severity: "notable" | "high" | "severe" | null }> = [
      { value: 110, severity: null },
      { value: 150, severity: "notable" },
      { value: 170, severity: "high" },
      { value: 200, severity: "severe" }
    ];

    for (const { value, severity } of cases) {
      const series = makeSeries([...stableBaseline(), value]);
      const report = detectAnomalies(series);
      const dayAnomaly = report.anomalies.find(
        (a) => a.date === dateAt(14) && a.metric === "tokens"
      );
      if (severity === null) {
        expect(dayAnomaly, `expected no anomaly for value=${value}`).toBeUndefined();
      } else {
        expect(dayAnomaly, `expected anomaly for value=${value}`).toBeDefined();
        expect(dayAnomaly?.severity).toBe(severity);
      }
    }
  });

  it("handles the MAD=0 edge case via the absolute-ratio fallback", () => {
    // Quiet baseline: 14 days at 100. Median=100, MAD=0.
    const baseline = Array(14).fill(100);

    // value == median -> no anomaly
    expect(
      detectAnomalies(makeSeries([...baseline, 100])).anomalies.filter(
        (a) => a.metric === "tokens"
      )
    ).toEqual([]);

    // value=150 (1.5x median) -> below 2x threshold, not flagged
    expect(
      detectAnomalies(makeSeries([...baseline, 150])).anomalies.filter(
        (a) => a.metric === "tokens"
      )
    ).toEqual([]);

    // value=250 (2.5x median) -> flagged as severe
    const spike = detectAnomalies(makeSeries([...baseline, 250]));
    const tokenAnomaly = spike.anomalies.find(
      (a) => a.metric === "tokens" && a.date === dateAt(14)
    );
    expect(tokenAnomaly).toBeDefined();
    expect(tokenAnomaly?.severity).toBe("severe");
  });

  it("requires the trailing window to have enough observations", () => {
    // Series of 3 days with default windowSize=14 and minWindow=5 -> no eligible days.
    const series = makeSeries([100, 200, 1000]);
    const report = detectAnomalies(series);
    expect(report.anomalies).toEqual([]);
  });

  it("respects a custom windowSize option", () => {
    // 7 stable days then a clear spike on day 7. windowSize=7 -> day 7 is eligible.
    const baseline = stableBaseline().slice(0, 7); // [90,110,90,110,90,110,90]
    const series = makeSeries([...baseline, 1000]);
    const report = detectAnomalies(series, { windowSize: 7 });
    const tokenAnomaly = report.anomalies.find(
      (a) => a.metric === "tokens" && a.date === dateAt(7)
    );
    expect(tokenAnomaly).toBeDefined();
    expect(tokenAnomaly?.severity).toBe("severe");
  });

  it("scores tokens and cost independently", () => {
    // Spike on tokens only; cost stays at baseline.
    const baseline = stableBaseline();
    const series: TrendPoint[] = [
      ...baseline.map((v, i) => ({
        date: dateAt(i),
        totalTokens: v,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0,
        cost: v * 0.001
      })),
      {
        date: dateAt(14),
        totalTokens: 1000,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0,
        cost: 0.1 // proportional to baseline 100 tokens, no cost spike
      }
    ];

    const report = detectAnomalies(series);
    const tokensSpike = report.anomalies.find(
      (a) => a.date === dateAt(14) && a.metric === "tokens"
    );
    const costSpike = report.anomalies.find(
      (a) => a.date === dateAt(14) && a.metric === "cost"
    );
    expect(tokensSpike).toBeDefined();
    expect(costSpike).toBeUndefined();
  });

  it("summarizes anomalies by severity and metric", () => {
    // Spike that flags both tokens and cost as severe.
    const series = makeSeries([...stableBaseline(), 1000]);
    const report = detectAnomalies(series);
    expect(report.summary.total).toBe(2);
    expect(report.summary.bySeverity.severe).toBe(2);
    expect(report.summary.byMetric.tokens).toBe(1);
    expect(report.summary.byMetric.cost).toBe(1);
    expect(report.summary.latestAnomalyDate).toBe(dateAt(14));
  });
});
