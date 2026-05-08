import { describe, expect, it } from "vitest";
import { buildScanHealth, type ScanConfidenceSummary } from "@/src/lib/scan-health";

const emptyConfidence: ScanConfidenceSummary = {
  interactions: 0,
  exactTokenInteractions: 0,
  highConfidenceTokenInteractions: 0,
  lowConfidenceTokenInteractions: 0,
  unknownTokenInteractions: 0,
  estimatedTokenInteractions: 0,
  exactCostInteractions: 0,
  estimatedCostInteractions: 0,
  unknownCostInteractions: 0
};

describe("scan health", () => {
  it("prompts for a first scan when there is no scan history", () => {
    const health = buildScanHealth({
      scanRuns: [],
      scanFiles: [],
      confidence: emptyConfidence
    });

    expect(health.headline).toBe("No scans yet");
    expect(health.tone).toBe("secondary");
    expect(health.actions[0].label).toBe("Run first scan");
  });

  it("prioritizes parser failures over warnings", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 2,
          recordsImported: 1,
          warnings: ["one warning"],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "file-1",
          scanRunId: "scan-1",
          path: "/tmp/a.jsonl",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: "generic-jsonl",
          status: "imported",
          recordsImported: 1,
          warnings: [],
          errors: [],
          rawMetadata: { tokenConfidence: { exact: 1 } }
        },
        {
          id: "file-2",
          scanRunId: "scan-1",
          path: "/tmp/b.log",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "failed",
          recordsImported: 0,
          warnings: [],
          errors: ["parse failed"],
          rawMetadata: {}
        }
      ],
      confidence: {
        ...emptyConfidence,
        interactions: 1,
        exactTokenInteractions: 1,
        exactCostInteractions: 1
      }
    });

    expect(health.tone).toBe("destructive");
    expect(health.headline).toBe("Scan needs attention");
    expect(health.actions.some((item) => item.label === "Review parser failures")).toBe(true);
  });

  it("recommends pricing review when imported interactions have unknown cost", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 1,
          recordsImported: 1,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "file-1",
          scanRunId: "scan-1",
          path: "/tmp/a.jsonl",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: "generic-jsonl",
          status: "imported",
          recordsImported: 1,
          warnings: [],
          errors: [],
          rawMetadata: { tokenConfidence: { exact: 1 } }
        }
      ],
      confidence: {
        ...emptyConfidence,
        interactions: 5,
        exactTokenInteractions: 5,
        unknownCostInteractions: 2,
        exactCostInteractions: 3
      }
    });

    expect(health.tone).toBe("warning");
    expect(health.costCoverage.priced).toBe(3);
    expect(health.actions.some((item) => item.label === "Configure missing prices")).toBe(true);
  });
});
