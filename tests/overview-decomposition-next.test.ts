import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Overview next decomposition", () => {
  it("keeps the route focused on data assembly and panel composition", () => {
    const page = read("app/page.tsx");
    const overviewData = read("src/lib/overview-data.ts");

    expect(page.trimEnd().split("\n").length).toBeLessThan(170);
    expect(page).toContain("getOverviewPageData");
    expect(overviewData).toContain("export async function getOverviewPageData");
    expect(page).toContain("@/components/overview/recommendations-card");
    expect(page).toContain("@/components/overview/current-mix-panel");

    expect(fs.existsSync(path.join(process.cwd(), "components/overview/recommendations-card.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "components/overview/current-mix-panel.tsx"))).toBe(true);
    expect(read("components/overview/recommendations-card.tsx")).toContain("export function OverviewRecommendationsCard");
    expect(read("components/overview/current-mix-panel.tsx")).toContain("export function OverviewCurrentMixPanel");
  });
});
