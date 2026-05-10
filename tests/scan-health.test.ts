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
  unknownCostInteractions: 0,
  unknownCostCauses: {
    missingModelName: 0,
    missingPricing: 0,
    missingTokenCount: 0,
    other: 0
  }
};

describe("scan health", () => {
  it("tracks the last successful scan and warns when it is stale", () => {
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    const health = buildScanHealth({
      now: 10_000 + eightDays,
      scanRuns: [
        {
          id: "scan-2",
          startedAt: 20_000,
          completedAt: 21_000,
          filesScanned: 4,
          recordsImported: 0,
          warnings: [],
          errors: []
        },
        {
          id: "scan-1",
          startedAt: 1_000,
          completedAt: 10_000,
          filesScanned: 4,
          recordsImported: 3,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [],
      confidence: emptyConfidence
    });

    expect(health.lastSuccessfulRun?.id).toBe("scan-1");
    expect(health.freshness.state).toBe("stale");
    expect(health.actions.some((item) => item.label === "Run a fresh scan")).toBe(true);
  });

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

  it("keeps unsupported files visible when parser failures also exist", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 236,
          recordsImported: 10,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "file-1",
          scanRunId: "scan-1",
          path: "/tmp/imported.jsonl",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: "claude-code",
          status: "imported_with_errors",
          recordsImported: 10,
          warnings: [],
          errors: ["one malformed line"],
          rawMetadata: {}
        },
        ...Array.from({ length: 233 }, (_, index) => ({
          id: `unsupported-${index}`,
          scanRunId: "scan-1",
          path: `/tmp/unsupported-${index}.json`,
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings: [],
          errors: ["No parser detected a compatible format."],
          rawMetadata: {}
        }))
      ],
      confidence: emptyConfidence
    });

    expect(health.tone).toBe("destructive");
    expect(health.description).toContain("1 file failed or imported with errors");
    expect(health.description).toContain("233 files need parser review");
  });

  it("groups repeated scan notes by reason instead of repeating raw paths", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 3,
          recordsImported: 0,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: Array.from({ length: 3 }, (_, index) => ({
        id: `file-${index}`,
        scanRunId: "scan-1",
        path: `/tmp/source-${index}.json`,
        modifiedTime: 1,
        sizeBytes: 100,
        parser: null,
        status: "skipped_unknown",
        recordsImported: 0,
        warnings: [],
        errors: ["No parser detected a compatible format."],
        rawMetadata: {}
      })),
      confidence: emptyConfidence
    });

    expect(health.latestNoteGroups).toEqual([
      {
        severity: "warning",
        message: "No parser detected a compatible format.",
        count: 3,
        examples: ["/tmp/source-0.json", "/tmp/source-1.json", "/tmp/source-2.json"]
      }
    ]);
  });

  it("treats unsupported-only scans as review recommended instead of destructive", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 1,
          recordsImported: 0,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "unsupported-1",
          scanRunId: "scan-1",
          path: "/tmp/unsupported.json",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings: [],
          errors: ["No parser detected a compatible format."],
          rawMetadata: {}
        }
      ],
      confidence: emptyConfidence
    });

    expect(health.tone).toBe("warning");
    expect(health.headline).toBe("Review recommended");
    expect(health.actions.some((item) => item.label === "Review parser failures")).toBe(false);
    expect(health.actions.some((item) => item.label === "Inspect unsupported files")).toBe(true);
  });

  it("includes ignored non-usage files in the latest status counts", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 2,
          recordsImported: 1,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "ignored-1",
          scanRunId: "scan-1",
          path: "/tmp/.claude/cache/a.json",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "ignored_non_usage",
          recordsImported: 0,
          warnings: [],
          errors: [],
          rawMetadata: { ignoreReason: "Claude support file outside project transcripts" }
        }
      ],
      confidence: emptyConfidence
    });

    expect(health.latestStatusCounts.ignored_non_usage).toBe(1);
  });

  it("keeps unknown cost causes available for doctor copy", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 1,
          recordsImported: 4,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [],
      confidence: {
        ...emptyConfidence,
        interactions: 4,
        unknownCostInteractions: 4,
        unknownCostCauses: {
          missingModelName: 1,
          missingPricing: 2,
          missingTokenCount: 1,
          other: 0
        }
      }
    });

    expect(health.costCoverage.unknownCauses).toEqual({
      missingModelName: 1,
      missingPricing: 2,
      missingTokenCount: 1,
      other: 0
    });
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
