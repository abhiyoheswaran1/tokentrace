import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("unknown-cost repair decomposition", () => {
  it("keeps the compatibility module small and delegates focused responsibilities", () => {
    const barrel = read("src/lib/unknown-cost-repair.ts");
    const lineCount = barrel.trim().split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(140);
    expect(barrel).toContain('from "@/src/lib/unknown-cost-repair/types"');
    expect(barrel).toContain('from "@/src/lib/unknown-cost-repair/keys"');
    expect(barrel).toContain('from "@/src/lib/unknown-cost-repair/reviews"');
    expect(barrel).toContain('from "@/src/lib/unknown-cost-repair/workbench"');
  });

  it("splits keys, review persistence, suggestions, and workbench shaping into focused modules", () => {
    expect(read("src/lib/unknown-cost-repair/keys.ts")).toContain("export function repairKey");
    expect(read("src/lib/unknown-cost-repair/reviews.ts")).toContain("export function saveUnknownCostReviewWithResolver");
    expect(read("src/lib/unknown-cost-repair/suggestions.ts")).toContain("export function aliasSuggestion");
    expect(read("src/lib/unknown-cost-repair/workbench.ts")).toContain("export function buildUnknownCostRepairWorkbench");
  });
});
