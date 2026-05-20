import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFirstRunStatus } from "@/src/lib/first-run-status";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("mobile navigation and first-run polish", () => {
  it("uses a compact mobile command menu with priority shortcuts", () => {
    const sidebar = read("components/sidebar.tsx");

    expect(sidebar).toContain("Command menu");
    expect(sidebar).toContain("activeMobileItem");
    expect(sidebar).toContain("priorityMobileItems");
    expect(sidebar).toContain("MobileIconLink");
    expect(sidebar).not.toContain('className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2 md:hidden"');
  });

  it("guides empty installs through local folders, model rates, scan, and Scan Health", () => {
    const status = buildFirstRunStatus({
      rootCount: 0,
      pricedModelCount: 0,
      latestScan: null,
      interactions: 0,
      unknownCostInteractions: 0
    });

    expect(status.description).toContain("local");
    expect(status.setupSteps.map((step) => step.id)).toEqual([
      "roots",
      "pricing",
      "scan",
      "health",
      "daily-review"
    ]);
    expect(status.setupSteps.find((step) => step.id === "pricing")).toMatchObject({
      label: "Seed model rates",
      href: "/pricing",
      action: "Open Model Rates"
    });
    expect(status.setupSteps.find((step) => step.id === "health")).toMatchObject({
      label: "Open Scan Health",
      href: "/diagnostics"
    });
  });

  it("does not introduce cloud or demo claims in first-run onboarding", () => {
    const firstRun = read("src/lib/first-run-status.ts");
    const panel = read("components/overview/first-run-panel.tsx");
    const copy = `${firstRun}\n${panel}`.toLowerCase();

    expect(copy).not.toContain("cloud sync");
    expect(copy).not.toContain("demo data");
    expect(copy).toContain("no telemetry");
    expect(copy).toContain("local");
  });
});
