import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview release polish", () => {
  const source = () => fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
  const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

  it("keeps below-chart review content compact on the Overview page", () => {
    const page = source();
    const reviewStatus = read("components/overview/review-status-strip.tsx");
    const topRepairItems = read("components/overview/top-repair-items-strip.tsx");

    expect(page).not.toContain("function OverviewReviewStatusStrip");
    expect(page).not.toContain("function TopRepairItemsStrip");
    expect(reviewStatus).toContain("export function OverviewReviewStatusStrip");
    expect(topRepairItems).toContain("export function TopRepairItemsStrip");
    expect(reviewStatus).toContain("Review Status");
    expect(topRepairItems).toContain("Top repair items");
    expect(page).toContain("<OverviewReviewStatusStrip");
    expect(page).toContain("<TopRepairItemsStrip");
    expect(page).not.toContain("function DataReadinessPanel");
    expect(page).not.toContain("function PostSessionReviewPanel");
    expect(page).not.toContain("Unknown Cost Repair Queue");
    expect(page).not.toContain('<Table className="min-w-[72rem]"');
  });

  it("uses consistent action labels for evidence, repair, model-rate, and parser paths", () => {
    const page = source();
    const overviewActions = [
      page,
      read("components/overview/review-status-strip.tsx"),
      read("components/overview/summary-cards.tsx"),
      read("components/overview/top-repair-items-strip.tsx")
    ].join("\n");

    expect(overviewActions).toContain("View evidence");
    expect(overviewActions).toContain("Open repair");
    expect(overviewActions).toContain("Set model rate");
    expect(overviewActions).toContain("Review parser");
    expect(overviewActions).not.toContain("Open next repair item");
    expect(overviewActions).not.toContain("View unknown-cost evidence");
    expect(overviewActions).not.toContain(">Evidence<");
    expect(overviewActions).not.toContain(">Parser<");
    expect(overviewActions).not.toContain(">Repair<");
  });

  it("uses user-facing readiness wording instead of internal diagnostics terms", () => {
    const page = source();
    const reviewStatus = read("components/overview/review-status-strip.tsx");

    expect(reviewStatus).toContain("Imported usage");
    expect(reviewStatus).toContain("Files to review");
    expect(reviewStatus).toContain("Cost coverage");
    expect(reviewStatus).toContain("Token math");
    expect(reviewStatus).toContain("Privacy boundary");
    expect(page).not.toContain("Data Readiness");
    expect(page).not.toContain("Parser coverage");
    expect(page).not.toContain("Boundaries");
  });

  it("keeps Overview panels in focused component files", () => {
    const page = source();
    const expectedFiles = [
      "components/overview/summary-cards.tsx",
      "components/overview/usage-pulse-panel.tsx",
      "components/overview/data-confidence-strip.tsx",
      "components/overview/trust-footer.tsx",
      "components/overview/guardrails-panel.tsx",
      "components/overview/first-run-panel.tsx"
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    }
    expect(page).not.toContain("function CostSessionsCard");
    expect(page).not.toContain("function UsagePulsePanel");
    expect(page).not.toContain("function DataConfidenceStrip");
    expect(page).not.toContain("function OverviewTrustFooter");
    expect(page).not.toContain("function UsageGuardrailsPanel");
    expect(page).not.toContain("function FirstRunPanel");
  });
});
