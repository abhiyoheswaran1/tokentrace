import { describe, expect, it } from "vitest";
import { buildFirstRunStatus } from "@/src/lib/first-run-status";

describe("first-run status", () => {
  it("prioritizes missing readable roots before scan actions", () => {
    const status = buildFirstRunStatus({
      rootCount: 0,
      pricedModelCount: 4,
      latestScan: null,
      interactions: 0,
      unknownCostInteractions: 0
    });

    expect(status.title).toBe("Add a readable CLI folder");
    expect(status.primaryAction.href).toBe("/settings");
    expect(status.checks.find((check) => check.id === "roots")).toMatchObject({ state: "warn" });
  });

  it("explains duplicate-only or unsupported-only scans instead of showing a vague empty dashboard", () => {
    const status = buildFirstRunStatus({
      rootCount: 1,
      pricedModelCount: 4,
      latestScan: {
        filesScanned: 12,
        recordsImported: 0,
        zeroImportExplanation: "The latest scan only found known CLI support files, not usage transcripts."
      },
      interactions: 0,
      unknownCostInteractions: 0
    });

    expect(status.title).toBe("Latest scan imported no usage");
    expect(status.description).toContain("known CLI support files");
    expect(status.primaryAction.href).toBe("/discovery");
  });
});
