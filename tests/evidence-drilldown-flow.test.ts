import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Evidence drill-down flow", () => {
  it("lets users pivot between related evidence metrics and continue deeper", () => {
    const page = read("app/evidence/page.tsx");
    const pageData = read("app/evidence/evidence-page-data.ts");
    const workbench = read("app/evidence/evidence-workbench.tsx");
    const contextPanel = read("app/evidence/evidence-context-panel.tsx");

    expect(workbench).toContain("function EvidenceMetricTabs");
    expect(workbench).toContain("function EvidenceDrilldownStrip");
    expect(workbench).toContain("Evidence Workbench");
    expect(workbench).toContain("You are viewing");
    expect(workbench).toContain("Processed");
    expect(workbench).toContain("Fresh / non-cache");
    expect(workbench).toContain("Cache");
    expect(contextPanel).toContain("function EvidenceContextPanel");
    expect(contextPanel).toContain("contextual drill-down");
    expect(contextPanel).toContain("opened this page directly");
    expect(page).toContain("Return to where you came from");
    expect(page).toContain("Open Sessions");
    expect(page).toContain("Open repair");
    expect(page).toContain("Set model rate");
    expect(page).toContain("/settings#scan-controls");
    expect(pageData).toContain("Top source files");
    expect(pageData).toContain("Largest sessions");
    expect(pageData).toContain("Parser confidence");
    expect(pageData).toContain("Set model rate");
  });
});
