import { describe, expect, it } from "vitest";
import { buildDoctorReport } from "@/src/lib/doctor";
import type { ScanConfidenceSummary } from "@/src/lib/scan-health";

const confidence: ScanConfidenceSummary = {
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

describe("doctor report", () => {
  it("derives parser trust from supplied scan files without ambient database state", () => {
    const report = buildDoctorReport({
      roots: ["/Users/test/.claude"],
      pricedModelCount: 12,
      confidence,
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
          path: "/Users/test/.claude/projects/a.jsonl",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: "claude-code",
          status: "imported_with_errors",
          recordsImported: 1,
          warnings: ["partial import"],
          errors: [],
          rawMetadata: {
            parser: {
              name: "claude-code",
              version: "2"
            },
            reason: "Synthetic doctor input"
          }
        }
      ]
    });

    expect(report.parserTrust.summary.importedWithErrors).toBe(1);
    expect(report.parserTrust.parsers).toEqual([
      expect.objectContaining({
        parser: "claude-code",
        version: "2",
        importedWithErrors: 1,
        latestReason: "Synthetic doctor input"
      })
    ]);
    expect(report.scanDiff).toMatchObject({
      latestScanId: "scan-1",
      previousScanId: null,
      current: {
        filesScanned: 1,
        recordsImported: 1,
        importedWithErrors: 1
      },
      delta: {
        filesScanned: 1,
        recordsImported: 1,
        importedWithErrors: 1
      }
    });
  });

  it("includes support matrix and scan freshness in the JSON report", () => {
    const report = buildDoctorReport({
      roots: ["/Users/test/.claude"],
      pricedModelCount: 12,
      confidence,
      scanRuns: [],
      scanFiles: []
    });

    expect(report.supportMatrix.summary.stable).toBeGreaterThan(0);
    expect(report.supportMatrix.items.map((item) => item.id)).toContain("claude-code");
    expect(report.scanFreshness.state).toBe("no-scan");
  });

  it("explains a zero-import duplicate-only scan", () => {
    const report = buildDoctorReport({
      roots: ["/Users/test/.claude"],
      pricedModelCount: 12,
      confidence,
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 2,
          recordsImported: 0,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: [
        {
          id: "file-1",
          scanRunId: "scan-1",
          path: "/Users/test/.claude/projects/a.jsonl",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "skipped_duplicate",
          recordsImported: 0,
          warnings: ["File hash already imported. Use force rescan to parse again."],
          errors: [],
          rawMetadata: {}
        }
      ]
    });

    expect(report.latestScan.zeroImportExplanation).toBe("The latest scan imported nothing because all usage candidates were already imported duplicates.");
    expect(report.recommendations[0].id).toBe("scan-duplicates-only");
    expect(report.fileStatus.duplicates).toBe(1);
  });

  it("separates ignored support files from unsupported parser-review files", () => {
    const report = buildDoctorReport({
      roots: ["/Users/test/.claude"],
      pricedModelCount: 12,
      confidence,
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
      scanFiles: [
        {
          id: "ignored-1",
          scanRunId: "scan-1",
          path: "/Users/test/.claude/cache/a.json",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "ignored_non_usage",
          recordsImported: 0,
          warnings: [],
          errors: [],
          rawMetadata: { ignoreReason: "Claude cache/support file" }
        },
        {
          id: "unsupported-1",
          scanRunId: "scan-1",
          path: "/Users/test/.claude/projects/unknown.json",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings: [],
          errors: ["No parser detected a compatible format."],
          rawMetadata: {}
        }
      ]
    });

    expect(report.fileStatus.ignored).toBe(1);
    expect(report.fileStatus.unsupported).toBe(1);
    expect(report.recommendations.some((item) => item.id === "parser-review")).toBe(true);
    expect(report.recommendations.some((item) => item.id === "ignored-support-files")).toBe(true);
  });

  it("prioritizes unknown-cost causes as repairable recommendations", () => {
    const report = buildDoctorReport({
      roots: ["/Users/test/.claude"],
      pricedModelCount: 12,
      confidence: {
        ...confidence,
        interactions: 10,
        exactCostInteractions: 6,
        unknownCostInteractions: 4,
        unknownCostCauses: {
          missingModelName: 1,
          missingPricing: 2,
          missingTokenCount: 1,
          other: 0
        }
      },
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 1,
          recordsImported: 10,
          warnings: [],
          errors: []
        }
      ],
      scanFiles: []
    });

    expect(report.pricing.unknown).toBe(4);
    expect(report.recommendations.map((item) => item.id)).toContain("missing-pricing");
    expect(report.recommendations.map((item) => item.id)).toContain("missing-model");
    expect(report.recommendations.map((item) => item.id)).toContain("missing-token-count");
  });
});
