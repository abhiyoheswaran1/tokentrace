import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Repair page decomposition", () => {
  it("keeps the route focused on data loading and panel composition", () => {
    const page = read("app/repair/page.tsx");

    expect(page.trimEnd().split("\n").length).toBeLessThan(220);
    expect(page).toContain("@/app/repair/repair-page-data");
    expect(page).toContain("@/components/repair/repair-guidance");
    expect(page).toContain("@/components/repair/repair-summary");
    expect(page).toContain("@/components/repair/repair-items-table");

    expect(read("app/repair/repair-page-data.ts")).toContain("export async function getRepairPageData");
    expect(read("components/repair/repair-guidance.tsx")).toContain("export function RepairGuidancePanel");
    expect(read("components/repair/repair-guidance.tsx")).toContain("export function FocusedRepairPanel");
    expect(read("components/repair/repair-summary.tsx")).toContain("export function RepairSummaryCard");
    expect(read("components/repair/repair-items-table.tsx")).toContain("export function RepairItemsTable");
  });
});
