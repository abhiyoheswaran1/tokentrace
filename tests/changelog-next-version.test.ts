import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("moves Local Sources & Trust work into the 0.12.0 release section", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.12.0");
    expect(changelog).toContain("## [0.12.0] - 2026-05-19");
    expect(changelog).toContain("Native structured usage log ingestion");
    expect(changelog).toContain("Agent-readable Roadmap V2");
    expect(changelog).toContain("Evidence remains a contextual drill-down");
    expect(changelog).toContain("Scan, setup, guardrail, package-trust, folder, import-profile, and export CTAs");
    expect(changelog).toContain("Settings scan feedback now reports files checked");
  });
});
