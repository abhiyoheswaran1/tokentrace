import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "@/src/lib/markdown-report";

describe("markdown report", () => {
  it("renders a deterministic local report with digest, review, and accounting sections", () => {
    const markdown = renderMarkdownReport({
      title: "TokenTrace Local Report",
      generatedAt: "2026-05-13T12:00:00.000Z",
      scopeLabel: "Since yesterday",
      digest: {
        totalTokens: 1_000,
        totalCost: 12.5,
        unknownCostInteractions: 3,
        topReviewTitle: "Repair pricing",
        topProjectName: "TokenTrace"
      },
      postSessionReview: {
        headline: "5 new records imported",
        parserWarnings: 1,
        unknownCostInteractions: 3,
        expensiveSessionTitles: ["Large run"]
      },
      accounting: {
        status: "ready",
        processedTokens: 1_000,
        nonCacheTokens: 800,
        cachedTokens: 200,
        balanceDeltaTokens: 0
      }
    });

    expect(markdown).toContain("# TokenTrace Local Report");
    expect(markdown).toContain("Scope: Since yesterday");
    expect(markdown).toContain("- Tokens: 1.0K");
    expect(markdown).toContain("## Post-Session Review");
    expect(markdown).toContain("- Parser warnings: 1");
    expect(markdown).toContain("## Accounting");
    expect(markdown).not.toContain("[object Object]");
  });
});
