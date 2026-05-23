import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("overview Suspense streaming", () => {
  const page = fs.readFileSync(path.join(repoRoot, "app/page.tsx"), "utf8");
  const data = fs.readFileSync(path.join(repoRoot, "src/lib/overview-data.ts"), "utf8");

  it("page imports Suspense from react", () => {
    expect(page).toMatch(/from "react"/);
    expect(page).toContain("Suspense");
  });

  it("page wraps primary and repair sections in Suspense boundaries", () => {
    const matches = page.match(/<Suspense\b/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("overview-data exposes split fetchers wrapped in React.cache", () => {
    expect(data).toMatch(/export const getOverviewPrimaryData = cache\(/);
    expect(data).toMatch(/export const getOverviewRepairData = cache\(/);
  });

  it("page renders dedicated async section components", () => {
    expect(page).toContain("OverviewPrimarySection");
    expect(page).toContain("OverviewRepairSection");
  });
});
