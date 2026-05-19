import { describe, expect, it } from "vitest";
import { buildDataConfidenceScore } from "@/src/lib/data-confidence";

describe("data confidence score", () => {
  it("rewards exact tokens, priced costs, parser confidence, and fresh scans", () => {
    const score = buildDataConfidenceScore({
      totalInteractions: 10,
      exactTokenInteractions: 8,
      tokenizerEstimateInteractions: 2,
      simpleEstimateInteractions: 0,
      unknownTokenInteractions: 0,
      pricedCostInteractions: 10,
      unknownCostInteractions: 0,
      parserConfidence: 0.95,
      scanFreshness: "fresh"
    });

    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("high");
    expect(score.drivers[0]).toContain("Token coverage");
  });

  it("shows fix drivers when data has simple estimates, unknown costs, and stale scans", () => {
    const score = buildDataConfidenceScore({
      totalInteractions: 10,
      exactTokenInteractions: 2,
      tokenizerEstimateInteractions: 1,
      simpleEstimateInteractions: 4,
      unknownTokenInteractions: 3,
      pricedCostInteractions: 4,
      unknownCostInteractions: 6,
      parserConfidence: 0.4,
      scanFreshness: "stale"
    });

    expect(score.score).toBeLessThan(60);
    expect(score.grade).toBe("low");
    expect(score.drivers.join(" ")).toContain("Repair unknown costs");
    expect(score.drivers.join(" ")).toContain("Run a fresh scan");
  });
});
