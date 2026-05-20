import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("User-facing health copy", () => {
  it("uses Scan Health as the single user-facing name for diagnostics", () => {
    const sidebar = read("components/sidebar.tsx");
    const diagnostics = read("app/diagnostics/page.tsx");
    const guide = read("app/guide/page.tsx");
    const firstRun = read("src/lib/first-run-status.ts");
    const settings = `${read("components/settings-panel.tsx")}\n${read("components/settings/scan-section.tsx")}`;
    const globalError = read("app/global-error.tsx");
    const scanNowButton = read("components/scan-now-button.tsx");
    const doctor = read("src/lib/doctor.ts");
    const readme = read("README.md");

    for (const source of [sidebar, diagnostics, guide, firstRun, settings, globalError, scanNowButton, doctor, readme]) {
      expect(source).not.toContain("Health Check");
      expect(source).not.toContain("health check");
      expect(source).not.toContain("Scan doctor");
      expect(source).not.toContain("scan doctor");
    }

    expect(sidebar).toContain('label: "Scan Health"');
    expect(sidebar).not.toContain('label: "Doctor"');
    expect(diagnostics).toContain('title="Scan Health"');
    expect(diagnostics).toContain("Scan Health report");
    expect(diagnostics).toContain("which files need review");
    expect(diagnostics).not.toContain('title="Scan Doctor"');
    expect(guide).toContain("Open Scan Health");
    expect(guide).not.toContain("Open Doctor");
    expect(firstRun).toContain("Open Scan Health");
    expect(firstRun).not.toContain("Open Doctor");
    expect(settings).toContain("Open Scan Health");
    expect(globalError).toContain("Open Scan Health");
    expect(scanNowButton).toContain("Check Scan Health");
    expect(readme).toContain("**Scan Health**");
  });
});
