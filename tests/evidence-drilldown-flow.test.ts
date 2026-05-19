import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Evidence drill-down flow", () => {
  it("lets users pivot between related evidence metrics and continue deeper", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/evidence/page.tsx"), "utf8");

    expect(source).toContain("function EvidenceMetricTabs");
    expect(source).toContain("function EvidenceDrilldownStrip");
    expect(source).toContain("function EvidenceContextPanel");
    expect(source).toContain("Evidence Workbench");
    expect(source).toContain("You are viewing");
    expect(source).toContain("contextual drill-down");
    expect(source).toContain("opened this page directly");
    expect(source).toContain("Processed");
    expect(source).toContain("Fresh / non-cache");
    expect(source).toContain("Cache");
    expect(source).toContain("Return to where you came from");
    expect(source).toContain("Open Sessions");
    expect(source).toContain("Open repair");
    expect(source).toContain("Set model rate");
    expect(source).toContain("/settings#scan-controls");
    expect(source).toContain("Top source files");
    expect(source).toContain("Largest sessions");
    expect(source).toContain("Parser confidence");
    expect(source).toContain("Set model rate");
  });
});
