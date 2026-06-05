import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Evidence page decomposition", () => {
  it("keeps the route focused on data loading and panel composition", () => {
    const page = read("app/evidence/page.tsx");

    expect(page.trimEnd().split("\n").length).toBeLessThan(220);
    expect(page).toContain("@/app/evidence/evidence-page-data");
    expect(page).toContain("@/app/evidence/evidence-context-panel");
    expect(page).toContain("@/app/evidence/evidence-summary-cards");
    expect(page).toContain("@/app/evidence/evidence-tables");
    expect(page).toContain("@/app/evidence/evidence-workbench");

    const pageData = read("app/evidence/evidence-page-data.ts");
    expect(pageData).toContain("export async function getEvidencePageData");
    expect(pageData).toContain("function safeReturnTo");
    expect(pageData).toContain("drilldownActions");
    expect(read("app/evidence/evidence-context-panel.tsx")).toContain("export function EvidenceContextPanel");
    expect(read("app/evidence/evidence-summary-cards.tsx")).toContain("export function MetricTotalsCard");
    expect(read("app/evidence/evidence-summary-cards.tsx")).toContain("export function ConfidenceSplitCard");
    expect(read("app/evidence/evidence-tables.tsx")).toContain("export function TopSourceFilesCard");
    expect(read("app/evidence/evidence-tables.tsx")).toContain("export function SessionEvidenceCard");
    expect(read("app/evidence/evidence-workbench.tsx")).toContain("export function EvidenceWorkbenchCard");
  });
});
