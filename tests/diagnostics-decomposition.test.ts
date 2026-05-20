import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Diagnostics decomposition", () => {
  it("keeps the Scan Health route focused on data assembly and panel composition", () => {
    const page = read("app/diagnostics/page.tsx");
    const pageLines = page.trimEnd().split("\n").length;

    expect(pageLines).toBeLessThan(180);
    expect(page).toContain("@/components/diagnostics/trust-checklist");
    expect(page).toContain("@/components/diagnostics/doctor-report-panel");
    expect(page).toContain("@/components/diagnostics/parser-panels");
    expect(page).toContain("@/components/diagnostics/local-recommendations-card");

    const files = [
      "components/diagnostics/trust-checklist.tsx",
      "components/diagnostics/doctor-report-panel.tsx",
      "components/diagnostics/parser-panels.tsx",
      "components/diagnostics/local-recommendations-card.tsx"
    ];

    for (const file of files) {
      expect(fs.existsSync(path.join(process.cwd(), file)), file).toBe(true);
    }

    expect(read("components/diagnostics/trust-checklist.tsx")).toContain("export function TrustChecklist");
    expect(read("components/diagnostics/doctor-report-panel.tsx")).toContain("export function DoctorReportPanel");
    expect(read("components/diagnostics/parser-panels.tsx")).toContain("export function ParserTrustPanel");
    expect(read("components/diagnostics/parser-panels.tsx")).toContain("export function SourceCoveragePanel");
    expect(read("components/diagnostics/local-recommendations-card.tsx")).toContain("export function LocalRecommendationsCard");
  });
});
