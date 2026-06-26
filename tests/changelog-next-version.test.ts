import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("documents the 0.21.2 architecture health patch release", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.21.2");
    expect(changelog).toContain("## [0.21.2] - 2026-06-26");
    expect(changelog).toContain("ProjScan circular-import warnings removed");
    expect(changelog).toContain("import graph stays");
    expect(changelog).toContain("Low-risk dependency refresh");
    expect(changelog).toContain("## [0.21.1] - 2026-06-26");
    expect(changelog).toContain("README and website handoff now match the simplified product");
    expect(changelog).toContain("Playwright-captured `0.21.0` dashboard screenshots");
    expect(changelog).toContain("## [0.21.0] - 2026-06-26");
    expect(changelog).toContain("Local agent preflight");
    expect(changelog).toContain("Simpler dashboard shell");
    expect(changelog).toContain("First-run scan state uses latest scan evidence");
    expect(changelog).toContain("## [0.20.0] - 2026-06-12");
    expect(changelog).toContain("Overview and shell UI polish");
    expect(changelog).toContain("ChatGPT app feasibility documented");
    expect(changelog).toContain("Private ChatGPT app prototype");
    expect(changelog).toContain("ChatGPT app release readiness");
    expect(changelog).toContain("ChatGPT app submission kit");
    expect(changelog).toContain("## [0.19.2] - 2026-06-05");
    expect(changelog).toContain("MCP tools now run in-process");
    expect(changelog).toContain("Stricter compile-time safety");
    expect(changelog).toContain("CSV export keeps caller input out of header syntax");
    expect(changelog).toContain("## [0.19.1] - 2026-06-04");
    expect(changelog).toContain("Leaner npm package");
    expect(changelog).toContain("## [0.19.0] - 2026-06-04");
    expect(changelog).toContain("The local dashboard now enforces a request perimeter");
    expect(changelog).toContain("File-preview endpoints are now contained");
    expect(changelog).toContain("refuses non-loopback binds by default");
    expect(changelog).toContain("## [0.18.1] - 2026-05-28");
    expect(changelog).toContain("Scheduled scans now coalesce concurrent runs");
    expect(changelog).toContain("is now atomic");
    expect(changelog).toContain("## [0.18.0] - 2026-05-28");
    expect(changelog).toContain("Anomaly detection");
    expect(changelog).toContain("Structured query");
    expect(changelog).toContain("Auto-classifier");
    expect(changelog).toContain("Persistent model aliases");
    expect(changelog).toContain("Interactive Query page");
    expect(changelog).toContain("## [0.17.0] - 2026-05-23");
    expect(changelog).toContain("Runtime SQLite pragmas tuned for analytics");
    expect(changelog).toContain("Prepared-statement cache");
    expect(changelog).toContain("Streaming overview with two `<Suspense>` boundaries");
    expect(changelog).toContain("tokentrace doctor --timings");
    expect(changelog).toContain("Scan ingestion throughput");
    expect(changelog).toContain("Next bundle optimizations");
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
      "rolled-up release themes",
      "next planned release"
    ];

    for (const term of internalRoadmapTerms) {
      expect(changelog).not.toContain(term);
    }
  });
});
