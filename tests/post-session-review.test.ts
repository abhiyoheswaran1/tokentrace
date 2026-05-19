import { describe, expect, it } from "vitest";
import { buildPostSessionReview, renderPostSessionReviewText } from "@/src/lib/post-session-review";

describe("post-session review", () => {
  it("summarizes scan movement, guardrails, unknown costs, expensive sessions, and parser warnings", () => {
    const review = buildPostSessionReview({
      scanDiff: {
        latestScanId: "scan-2",
        previousScanId: "scan-1",
        latestStartedAt: 1800000000000,
        previousStartedAt: 1799900000000,
        latestCompletedAt: 1800000001000,
        previousCompletedAt: 1799900001000,
        current: {
          filesScanned: 20,
          recordsImported: 12,
          imported: 10,
          importedWithErrors: 1,
          duplicates: 2,
          ignored: 3,
          unsupported: 1,
          failed: 0
        },
        previous: {
          filesScanned: 10,
          recordsImported: 5,
          imported: 5,
          importedWithErrors: 0,
          duplicates: 1,
          ignored: 1,
          unsupported: 0,
          failed: 0
        },
        delta: {
          filesScanned: 10,
          recordsImported: 7,
          imported: 5,
          importedWithErrors: 1,
          duplicates: 1,
          ignored: 2,
          unsupported: 1,
          failed: 0
        },
        explanation: null
      },
      usageGuardrails: {
        monthLabel: "May 2026",
        window: { from: 0, to: 1 },
        cost: {
          configured: true,
          used: 84,
          limit: 100,
          percent: 0.84,
          remaining: 16,
          status: "warning"
        },
        tokens: {
          configured: true,
          used: 900_000,
          limit: 1_000_000,
          percent: 0.9,
          remaining: 100_000,
          status: "warning"
        },
        scoped: [],
        anomalies: []
      },
      summary: {
        unknownCostInteractions: 4
      },
      sessions: [
        {
          id: "session-1",
          title: "Large run",
          tool: "Codex CLI",
          project: "TokenTrace",
          models: "gpt-5.5",
          totalTokens: 100_000,
          cost: 20,
          parserStatus: "imported",
          sourceFile: "/tmp/one.jsonl"
        },
        {
          id: "session-2",
          title: "Parser warning",
          tool: "Claude Code",
          project: "TokenTrace",
          models: "claude-sonnet-4-5",
          totalTokens: 10_000,
          cost: null,
          parserStatus: "imported_with_errors",
          sourceFile: "/tmp/two.jsonl"
        }
      ]
    });

    expect(review).toMatchObject({
      headline: "7 new records imported",
      newlyImportedRecords: 7,
      unknownCostInteractions: 4,
      parserWarnings: 1
    });
    expect(review.expensiveSessions[0]).toMatchObject({
      id: "session-1",
      cost: 20
    });
    expect(renderPostSessionReviewText(review)).toContain("Post-session review");
    expect(renderPostSessionReviewText(review)).toContain("7 new records imported");
    expect(renderPostSessionReviewText(review)).toContain("Parser warnings: 1");
  });
});
