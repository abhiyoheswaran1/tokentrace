import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRepairDelta, repairDeltaSummary } from "@/src/lib/repair-delta";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("repair delta feedback", () => {
  it("summarizes unknown-cost repair changes between before and after snapshots", () => {
    const delta = buildRepairDelta(
      {
        unknownCostInteractions: 12,
        groups: [
          { key: "pricing:a", cause: "missing pricing", model: "gpt-a", sourceFile: "/tmp/a.jsonl", interactions: 8 },
          { key: "parser:b", cause: "missing model", model: "unknown", sourceFile: "/tmp/b.jsonl", interactions: 4 }
        ]
      },
      {
        unknownCostInteractions: 4,
        groups: [
          { key: "parser:b", cause: "missing model", model: "unknown", sourceFile: "/tmp/b.jsonl", interactions: 4 }
        ]
      }
    );

    expect(delta).toMatchObject({
      beforeUnknownCostInteractions: 12,
      afterUnknownCostInteractions: 4,
      unknownCostChange: -8,
      beforeGroups: 2,
      afterGroups: 1,
      topCause: "missing model"
    });
    expect(delta.resolvedGroups).toHaveLength(1);
    expect(delta.remainingCauses).toEqual([{ cause: "missing model", groups: 1, interactions: 4 }]);
    expect(repairDeltaSummary(delta)).toBe(
      "Unknown cost moved from 12 to 4 interactions. 1 repair group resolved. Top remaining cause: missing model."
    );
  });

  it("wires pricing saves, price refreshes, scans, and scan status UI to repair deltas", () => {
    expect(read("src/lib/pricing.ts")).toContain("repairDelta");
    expect(read("src/lib/pricing-refresh.ts")).toContain("repairDelta");
    expect(read("src/ingestion/scan-results.ts")).toContain("repairDelta");
    expect(read("components/scan-now-button.tsx")).toContain("repairDeltaSummary");
    expect(read("components/pricing/pricing-workflow.ts")).toContain("repairDeltaSummary");
  });
});
