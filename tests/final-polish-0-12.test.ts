import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("0.12 final polish", () => {
  it("shows route transition feedback before slow pages finish rendering", () => {
    const layout = read("app/layout.tsx");
    const progress = read("components/navigation-progress.tsx");

    expect(layout).toContain("NavigationProgress");
    expect(progress).toContain("usePathname");
    expect(progress).toContain("useSearchParams");
    expect(progress).toContain("route-progress");
    expect(progress).toContain("aria-live=\"polite\"");
    expect(progress).toContain("Loading next TokenTrace view");
  });

  it("adds sticky Settings section navigation and persisted last-scan summary", () => {
    const source = read("components/settings-panel.tsx");

    expect(source).toContain("function SettingsSectionNav");
    expect(source).toContain("Settings sections");
    expect(source).toContain("Scan Controls");
    expect(source).toContain("Custom Folders");
    expect(source).toContain("Import Profiles");
    expect(source).toContain("Guardrails");
    expect(source).toContain("Package Trust");
    expect(source).toContain("Exports");
    expect(source).toContain("function LastScanResultPanel");
    expect(source).toContain("Last scan result");
    expect(source).toContain("initialScanHealth.latestRun");
    expect(source).toContain("Open Scan Health");
    expect(source).toContain("Open repair");
    expect(source).toContain("Set model rate");
  });

  it("adds a quiet Overview trust footer near the accounting totals", () => {
    const source = read("app/page.tsx");

    expect(source).toContain("function OverviewTrustFooter");
    expect(source).toContain("Last verified");
    expect(source).toContain("Latest scan");
    expect(source).toContain("Package IOC");
    expect(source).toContain("Model rates");
    expect(source).toContain("Evidence packs");
    expect(source).toContain("<OverviewTrustFooter");
  });

  it("keeps Evidence contextual with breadcrumbs, safe return, and export-pack actions", () => {
    const source = read("app/evidence/page.tsx");

    expect(source).toContain("function EvidenceBreadcrumbs");
    expect(source).toContain("safeReturnTo");
    expect(source).toContain("Opened from");
    expect(source).toContain("Return to where you came from");
    expect(source).toContain("Export JSON pack");
    expect(source).toContain("Export Markdown pack");
  });

  it("uses unambiguous action vocabulary in scan and evidence surfaces", () => {
    const scanNow = read("components/scan-now-button.tsx");
    const settings = read("components/settings-panel.tsx");
    const evidence = read("app/evidence/page.tsx");

    for (const source of [scanNow, settings, evidence]) {
      expect(source).toContain("Open Scan Health");
      expect(source).toContain("Open repair");
      expect(source).toContain("Set model rate");
    }
    expect(scanNow).not.toContain(">Repair<");
    expect(settings).not.toContain("Open Repair");
    expect(evidence).not.toContain("Open Repair");
    expect(evidence).not.toContain("Set Model Rate");
  });

  it("explains loading states with what is happening and the next step", () => {
    const source = read("app/loading.tsx");

    expect(source).toContain("What is happening");
    expect(source).toContain("Next step");
    expect(source).toContain("View evidence");
    expect(source).toContain("Open Scan Health");
    expect(source).toContain("Local database only");
    expect(source).toContain("No telemetry is sent while this view loads.");
  });
});
