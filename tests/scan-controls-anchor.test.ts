import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("scan controls navigation", () => {
  it("sends scan and setup actions directly to the relevant Settings sections", () => {
    const overview = read("app/page.tsx");
    const settingsPanel = read("components/settings-panel.tsx");
    const firstRun = read("src/lib/first-run-status.ts");
    const scanHealth = read("src/lib/scan-health.ts");
    const doctor = read("src/lib/doctor.ts");
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
