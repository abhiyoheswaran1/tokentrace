import { describe, expect, it } from "vitest";
import { buildLocalRecommendations } from "@/src/lib/recommendations";

describe("local recommendations", () => {
  it("prioritizes missing pricing before optimization advice", () => {
    const recommendations = buildLocalRecommendations({
      summary: {
        totalTokens: 100_000,
        cachedTokens: 1_000,
        inputTokens: 60_000,
        unknownCostInteractions: 12
      },
      tools: [
        {
          tool: "Claude Code",
          totalTokens: 100_000,
          interactions: 20,
          cacheEfficiency: 0.01
        }
      ],
      projects: [
        {
          project: "TokenTrace",
          totalTokens: 80_000,
          cost: 20
        }
      ],
      unknownCosts: [
        {
          cause: "missing pricing",
          model: "gpt-later",
          interactions: 12,
          repairHref: "/pricing"
        }
      ],
      scan: {
        latestRecordsImported: 0,
        duplicateFiles: 6,
        parserReviewFiles: 0,
        ignoredFiles: 3
      }
    });

    expect(recommendations[0]).toMatchObject({
      id: "unknown-pricing",
      severity: "high",
      href: "/pricing"
    });
    expect(recommendations.map((item) => item.id)).toContain("dominant-project");
    expect(recommendations.map((item) => item.id)).toContain("low-cache");
  });

  it("explains duplicate-only scans as healthy no-op scans", () => {
    const recommendations = buildLocalRecommendations({
      summary: {
        totalTokens: 0,
        cachedTokens: 0,
        inputTokens: 0,
        unknownCostInteractions: 0
      },
      tools: [],
      projects: [],
      unknownCosts: [],
      scan: {
        latestRecordsImported: 0,
        duplicateFiles: 8,
        parserReviewFiles: 0,
        ignoredFiles: 0
      }
    });

    expect(recommendations[0]).toMatchObject({
      id: "duplicate-only-scan",
      severity: "low"
    });
  });
});
