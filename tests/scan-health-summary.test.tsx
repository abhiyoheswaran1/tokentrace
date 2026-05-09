import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanHealthSummary } from "@/components/scan-health-summary";
import { buildScanHealth, type ScanConfidenceSummary } from "@/src/lib/scan-health";

const confidence: ScanConfidenceSummary = {
  interactions: 6,
  exactTokenInteractions: 2,
  highConfidenceTokenInteractions: 1,
  lowConfidenceTokenInteractions: 1,
  unknownTokenInteractions: 2,
  estimatedTokenInteractions: 2,
  exactCostInteractions: 1,
  estimatedCostInteractions: 1,
  unknownCostInteractions: 4,
  unknownCostCauses: {
    missingModelName: 1,
    missingPricing: 2,
    missingTokenCount: 1,
    other: 0
  }
};

describe("ScanHealthSummary", () => {
  it("renders ignored files, grouped notes, and unknown cost causes", () => {
    const health = buildScanHealth({
      scanRuns: [
        {
          id: "scan-1",
          startedAt: 1,
          completedAt: 2,
          filesScanned: 4,
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
        },
        {
          id: "unsupported-1",
          scanRunId: "scan-1",
          path: "/tmp/unsupported-a.json",
          modifiedTime: 1,
          sizeBytes: 100,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings: [],
          errors: ["No parser detected a compatible format."],
          rawMetadata: {}
        },
        {
          id: "unsupported-2",
          scanRunId: "scan-1",
          path: "/tmp/unsupported-b.json",
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
      confidence
    });

    const html = renderToStaticMarkup(<ScanHealthSummary health={health} />);

    expect(html).toContain("Ignored files");
    expect(html).toContain("1 ignored as non-usage");
    expect(html).toContain("No parser detected a compatible format.");
    expect(html).toContain("2 files");
    expect(html).toContain("2 missing pricing");
    expect(html).toContain("1 missing model");
    expect(html).toContain("1 missing token count");
  });
});
