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

  it("keeps each settings domain's state in its own section hook", () => {
    const panel = read("components/settings-panel.tsx");
    const expectedHooks = [
      "components/settings/use-settings-status.ts",
      "components/settings/use-storage-section.ts",
      "components/settings/use-guardrails-section.ts",
      "components/settings/use-scan-schedule-section.ts",
      "components/settings/use-folders-section.ts",
      "components/settings/use-import-profiles-section.ts",
      "components/settings/use-scan-controls-section.ts"
    ];

    for (const file of expectedHooks) {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    }

    expect(panel).toContain("useSettingsStatus()");
    expect(panel).toContain("useStorageSection(");
    expect(panel).toContain("useGuardrailsSection(");
    expect(panel).toContain("useScanScheduleSection(");
    expect(panel).toContain("useFoldersSection(");
    expect(panel).toContain("useImportProfilesSection(");
    expect(panel).toContain("useScanControlsSection(");

    // The coordinator no longer owns per-domain state or request plumbing.
    expect(panel).not.toContain("useState(");
    expect(panel).not.toContain("useTransition");
    expect(panel).not.toContain("fetch(");

    // Shared async plumbing goes through the one JSON-request helper.
    const status = read("components/settings/use-settings-status.ts");
    expect(status).toContain("@/components/hooks/use-json-request");

    // ID slugs are built by one shared helper instead of repeated regexes.
    const formValues = read("components/settings/form-values.ts");
    expect(formValues).toContain("export function slugifyId");
    expect(formValues).toContain("export function parseLimitInput");
  });
});
