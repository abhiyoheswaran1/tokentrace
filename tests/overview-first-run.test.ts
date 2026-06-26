import { describe, expect, it } from "vitest";
import { buildOverviewFirstRunStatus } from "@/src/lib/overview-data";

describe("overview first-run status", () => {
  it("uses latest scan evidence when scans ran but imported no interactions", () => {
    const status = buildOverviewFirstRunStatus({
      rootCount: 2,
      pricedModelCount: 14,
      latestScan: {
        filesScanned: 7,
        recordsImported: 0,
        zeroImportExplanation: "All discovered files were duplicates or non-usage files."
      },
      interactions: 0,
      unknownCostInteractions: 0
    });

    expect(status.title).toBe("Latest scan imported no usage");
    expect(status.primaryAction).toEqual({
      label: "Inspect discovered files",
      href: "/discovery"
    });
    expect(status.setupSteps.find((step) => step.id === "scan")).toMatchObject({
      state: "pass",
      detail: "7 files checked, 0 records imported."
    });
  });
});
