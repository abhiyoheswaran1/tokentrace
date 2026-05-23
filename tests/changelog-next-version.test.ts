import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("documents the 0.16.0 parser overrides + saved reports + agent handoff release", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.16.0");
    expect(changelog).toContain("## [0.16.0] - 2026-05-23");
    expect(changelog).toContain("Parser overrides");
    expect(changelog).toContain("Saved reports");
    expect(changelog).toContain("Agent handoff");
    expect(changelog).toContain("tokentrace.handoff.v1");
    expect(changelog).toContain("## [0.15.2] - 2026-05-23");
    expect(changelog).toContain("Period filter presets");
    expect(changelog).toContain("## [0.15.1] - 2026-05-22");
    expect(changelog).toContain("## [0.15.0] - 2026-05-22");
    expect(changelog).toContain("## [0.14.2] - 2026-05-21");
    expect(changelog).toContain("## [0.14.1] - 2026-05-20");
  });

  it("keeps shipped Local Sources & Trust work in the 0.12.0 release section", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(changelog).toContain("## [0.12.0] - 2026-05-19");
    expect(changelog).toContain("Native structured usage log ingestion");
    expect(changelog).toContain("Agent-readable release status");
    expect(changelog).toContain("Evidence remains a contextual drill-down");
    expect(changelog).toContain("Scan, setup, guardrail, package-trust, folder, import-profile, and export CTAs");
    expect(changelog).toContain("Settings scan feedback now reports files checked");
  });

  it("keeps unreleased roadmap themes out of public release notes", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
    const internalRoadmapTerms = [
      "0.13.0 Evidence Portability",
      "0.14.0 Local Operations",
      "0.15.0 Governance & Guardrails",
      "0.16.0 Parser Studio",
      "0.17.0 Reports",
      "0.18.0 Agent Handoff",
      "0.19.0",
      "rolled-up release themes",
      "next planned release"
    ];

    for (const term of internalRoadmapTerms) {
      expect(changelog).not.toContain(term);
    }
  });
});
