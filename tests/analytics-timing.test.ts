import { afterEach, describe, expect, it } from "vitest";
import {
  getAnalyticsTimingReport,
  recordAnalyticsQueryTiming,
  resetAnalyticsTimingReport
} from "@/src/lib/analytics-timing";

describe("analytics query timing", () => {
  afterEach(() => {
    resetAnalyticsTimingReport();
    delete process.env.TOKENTRACE_ANALYTICS_QUERY_WARN_MS;
  });

  it("records analytics queries that cross the guardrail threshold", () => {
    process.env.TOKENTRACE_ANALYTICS_QUERY_WARN_MS = "500";

    recordAnalyticsQueryTiming("analytics.trends", 499);
    recordAnalyticsQueryTiming("analytics.sessions", 501);

    const report = getAnalyticsTimingReport();

    expect(report.thresholdMs).toBe(500);
    expect(report.slowQueries).toEqual([
      expect.objectContaining({
        label: "analytics.sessions",
        durationMs: 501,
        thresholdMs: 500
      })
    ]);
  });
});
