import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Settings decomposition", () => {
  it("keeps SettingsPanel as orchestration over focused section files", () => {
    const panel = read("components/settings-panel.tsx");
    const expectedFiles = [
      "components/settings/scan-section.tsx",
      "components/settings/import-profiles-section.tsx",
      "components/settings/guardrails-section.tsx",
      "components/settings/package-trust-section.tsx",
      "components/settings/exports-section.tsx",
      "components/settings/storage-section.tsx"
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    }

    expect(panel).toContain("ScanSection");
    expect(panel).toContain("ImportProfilesSection");
    expect(panel).toContain("GuardrailsSection");
    expect(panel).toContain("PackageTrustSection");
    expect(panel).toContain("ExportsSection");
    expect(panel).not.toContain("<CardTitle>Import Profiles</CardTitle>");
    expect(panel).not.toContain("<CardTitle>Local Usage Guardrails</CardTitle>");
    expect(panel).not.toContain("<CardTitle>Local Exports</CardTitle>");
  });
});
