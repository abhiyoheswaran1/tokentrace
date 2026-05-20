import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("documents the 0.13.0 product polish release", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.13.0");
    expect(changelog).toContain("## [0.13.0] - 2026-05-20");
    expect(changelog).toContain(
      "Overview trend aggregation now avoids SQLite localtime bucketing so large local databases load the first dashboard view much faster."
    );
    expect(changelog).toContain(
      "Repair and Model Rates now use mobile card layouts on narrow screens instead of forcing wide table workflows."
    );
    expect(changelog).toContain(
      "Added `npm run browser:guard` to fail browser smoke runs on console errors, page errors, Next dev overlay issues, blank charts, and severe mobile overflow."
    );
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
