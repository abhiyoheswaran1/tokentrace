import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview release polish", () => {
  const source = () => fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

  it("keeps below-chart review content compact on the Overview page", () => {
    const page = source();

    expect(page).toContain("function OverviewReviewStatusStrip");
    expect(page).toContain("function TopRepairItemsStrip");
    expect(page).toContain("Review Status");
    expect(page).toContain("Top repair items");
    expect(page).toContain("<OverviewReviewStatusStrip");
    expect(page).toContain("<TopRepairItemsStrip");
    expect(page).not.toContain("function DataReadinessPanel");
    expect(page).not.toContain("function PostSessionReviewPanel");
    expect(page).not.toContain("Unknown Cost Repair Queue");
    expect(page).not.toContain('<Table className="min-w-[72rem]"');
  });

  it("uses consistent action labels for evidence, repair, model-rate, and parser paths", () => {
    const page = source();

    expect(page).toContain("View evidence");
    expect(page).toContain("Open repair");
    expect(page).toContain("Set model rate");
    expect(page).toContain("Review parser");
    expect(page).not.toContain("Open next repair item");
    expect(page).not.toContain("View unknown-cost evidence");
    expect(page).not.toContain(">Evidence<");
    expect(page).not.toContain(">Parser<");
    expect(page).not.toContain(">Repair<");
  });

  it("uses user-facing readiness wording instead of internal diagnostics terms", () => {
    const page = source();

    expect(page).toContain("Imported usage");
    expect(page).toContain("Files to review");
    expect(page).toContain("Cost coverage");
    expect(page).toContain("Token math");
    expect(page).toContain("Privacy boundary");
    expect(page).not.toContain("Data Readiness");
    expect(page).not.toContain("Parser coverage");
    expect(page).not.toContain("Boundaries");
  });
});
