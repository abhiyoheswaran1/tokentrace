import { describe, expect, it } from "vitest";
import { buildDailyDigest, renderDailyDigestText } from "@/src/lib/daily-digest";

describe("daily digest", () => {
  it("summarizes guardrails, review queue, unknown cost, top project, and scan status", () => {
    const digest = buildDailyDigest({
      generatedAt: new Date("2026-05-11T12:00:00.000Z"),
      summary: {
        totalTokens: 100_000,
        totalCost: 42,
        unknownCostInteractions: 12
      },
      usageGuardrails: {
        monthLabel: "May 2026",
        window: { from: 0, to: 1 },
        cost: {
          configured: true,
          used: 42,
          limit: 50,
          percent: 0.84,
          remaining: 8,
          status: "warning"
        },
        tokens: {
          configured: true,
          used: 100_000,
          limit: 200_000,
          percent: 0.5,
          remaining: 100_000,
          status: "ok"
        }
      },
      reviewQueue: [
        {
          id: "guardrail-cost-warning",
          severity: "medium",
          category: "guardrail",
          title: "Monthly cost guardrail is close",
          evidence: "May 2026 is at $42.00 of $50.00.",
          action: "Watch the next sessions.",
          href: "/sessions",
          impactLabel: "May 2026 cost",
          impactValue: "$42.00"
        }
      ],
      projects: [
        {
          id: "project-1",
          project: "TokenTrace",
          path: "/repo/tokentrace",
          totalTokens: 75_000,
          cost: 30,
          sessions: 4,
          interactions: 20,
          outputInputRatio: 1.2,
          lastUsedAt: 2
        }
      ],
      latestScan: {
        headline: "Scan healthy",
        completedAt: 1_775_000_000_000,
        recordsImported: 20,
        filesScanned: 30
      }
    });

    expect(digest).toMatchObject({
      monthLabel: "May 2026",
      totalTokens: 100_000,
      totalCost: 42,
      unknownCostInteractions: 12,
      topReviewItem: expect.objectContaining({
        title: "Monthly cost guardrail is close"
      }),
      topProject: expect.objectContaining({
        project: "TokenTrace"
      }),
      latestScan: expect.objectContaining({
        headline: "Scan healthy"
      })
    });

    const text = renderDailyDigestText(digest);
    expect(text).toContain("TokenTrace Daily Digest");
    expect(text).toContain("Cost guardrail: $42.00 / $50.00, 84%, warning");
    expect(text).toContain("Top review: Monthly cost guardrail is close");
    expect(text).toContain("Unknown cost: 12 interactions");
  });
});
