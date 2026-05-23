import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("lazy chart wrappers", () => {
  it("TrendSection lazy wrapper uses next/dynamic with ssr:false", () => {
    const src = fs.readFileSync(path.join(repoRoot, "components/charts/trend-section-lazy.tsx"), "utf8");
    expect(src).toContain("next/dynamic");
    expect(src).toContain("ssr: false");
    expect(src).toContain("ChartSkeleton");
  });

  it("RankBarChart lazy wrapper uses next/dynamic with ssr:false", () => {
    const src = fs.readFileSync(path.join(repoRoot, "components/charts/rank-bar-chart-lazy.tsx"), "utf8");
    expect(src).toContain("next/dynamic");
    expect(src).toContain("ssr: false");
    expect(src).toContain("ChartSkeleton");
  });

  it("overview page imports the lazy TrendSection", () => {
    const src = fs.readFileSync(path.join(repoRoot, "app/page.tsx"), "utf8");
    expect(src).toContain("trend-section-lazy");
  });

  it("RankBarChart call sites import the lazy wrapper", () => {
    const callers = [
      "app/projects/page.tsx",
      "app/tools/page.tsx",
      "app/models/page.tsx",
      "components/overview/current-mix-panel.tsx"
    ];
    for (const file of callers) {
      const src = fs.readFileSync(path.join(repoRoot, file), "utf8");
      expect(src, `${file} should import the lazy RankBarChart`).toContain(
        "@/components/charts/rank-bar-chart-lazy"
      );
    }
  });
});
