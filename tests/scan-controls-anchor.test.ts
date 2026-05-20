import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("scan controls navigation", () => {
  it("sends scan and setup actions directly to the relevant Settings sections", () => {
    const overview = `${read("app/page.tsx")}\n${read("components/overview/guardrails-panel.tsx")}`;
    const settingsPanel = [
      "components/settings-panel.tsx",
      "components/settings/section-nav.tsx",
      "components/settings/scan-section.tsx",
      "components/settings/custom-folders-section.tsx",
      "components/settings/import-profiles-section.tsx",
      "components/settings/guardrails-section.tsx",
      "components/settings/package-trust-section.tsx",
      "components/settings/exports-section.tsx"
    ].map(read).join("\n");
    const firstRun = read("src/lib/first-run-status.ts");
    const scanHealth = `${read("src/lib/scan-health.ts")}\n${read("src/lib/scan-health-rules.ts")}`;
    const doctor = `${read("src/lib/doctor.ts")}\n${read("src/lib/doctor-recommendations.ts")}`;
    const discovery = read("app/discovery/page.tsx");
    const guide = read("app/guide/page.tsx");

    expect(overview).toContain('href="/settings#scan-controls"');
    expect(overview).toContain('href="/settings#usage-guardrails"');

    for (const id of [
      "usage-guardrails",
      "package-trust",
      "scan-scheduling",
      "custom-folders",
      "import-profiles",
      "scan-controls",
      "local-exports"
    ]) {
      expect(settingsPanel).toContain(`id="${id}"`);
    }

    expect(settingsPanel).toContain('id="scan-controls"');
    expect(settingsPanel).toContain("SETTINGS_SECTION_IDS");
    expect(settingsPanel).toContain("scrollIntoView");
    expect(firstRun).toContain('href: "/settings#custom-folders"');
    expect(firstRun).toContain('href: "/settings#scan-controls"');
    expect(scanHealth).toContain('"/settings#scan-controls"');
    expect(scanHealth).toContain('"/settings#custom-folders"');
    expect(doctor).toContain('"/settings#scan-controls"');
    expect(doctor).toContain('"/settings#custom-folders"');
    expect(discovery).toContain('href: "/settings#custom-folders"');
    expect(guide).toContain('href: "/settings#scan-controls"');
  });
});
