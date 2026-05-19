import { describe, expect, it } from "vitest";
import { buildSavedReportDefinitions, renderSavedReport } from "@/src/lib/saved-reports";

describe("0.12 saved reports", () => {
  it("defines recurring local report types for dashboard and CLI export", () => {
    const definitions = buildSavedReportDefinitions();

    expect(definitions.map((definition) => definition.id)).toEqual([
      "weekly-usage",
      "high-cost-sessions",
      "unknown-cost-repair",
      "confidence-trends",
      "guardrail-status",
      "source-coverage"
    ]);
    expect(definitions.every((definition) => definition.formats.includes("markdown"))).toBe(true);
    expect(definitions.every((definition) => definition.rawContentIncluded === false)).toBe(true);
  });

  it("renders Markdown and CSV from the same report payload", () => {
    const markdown = renderSavedReport({
      definitionId: "weekly-usage",
      format: "markdown",
      generatedAt: "2026-05-19T10:00:00.000Z",
      rows: [
        { label: "Tokens", value: "1.2M", detail: "Weekly usage" },
        { label: "Cost", value: "$12.50", detail: "Provider estimate" }
      ]
    });
    const csv = renderSavedReport({
      definitionId: "weekly-usage",
      format: "csv",
      generatedAt: "2026-05-19T10:00:00.000Z",
      rows: [
        { label: "Tokens", value: "1.2M", detail: "Weekly usage" },
        { label: "Cost", value: "$12.50", detail: "Provider estimate" }
      ]
    });

    expect(markdown).toContain("# Weekly Usage Report");
    expect(markdown).toContain("- Tokens: 1.2M");
    expect(csv).toContain("label,value,detail");
    expect(csv).toContain("Tokens,1.2M,Weekly usage");
  });
});
