import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("repair action decomposition", () => {
  it("keeps repair action copy and links in a focused helper module", () => {
    const repair = read("src/lib/unknown-cost-repair.ts");
    const actionsPath = path.join(process.cwd(), "src/lib/repair-actions.ts");
    const repairLines = repair.trimEnd().split("\n").length;

    expect(fs.existsSync(actionsPath)).toBe(true);
    const actions = read("src/lib/repair-actions.ts");
    expect(repairLines).toBeLessThan(680);
    expect(actions).toContain("export function primaryRepairAction");
    expect(actions).toContain("export function secondaryRepairActions");
    expect(actions).toContain("export function repairImpact");
    expect(actions).toContain("export function resolvedStateLabel");
    expect(repair).toContain("@/src/lib/repair-actions");
  });
});
