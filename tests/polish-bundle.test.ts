import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("product polish bundle", () => {
  it("gives scan feedback enough detail to guide the next action", () => {
    const source = read("components/scan-now-button.tsx");

    expect(source).toContain("files checked");
    expect(source).toContain("records imported");
    expect(source).toContain("warnings");
    expect(source).toContain("unknown cost");
    expect(source).toContain("Open Scan Health");
    expect(source).toContain("Open repair");
    expect(source).toContain("Open Discovery");
  });

  it("uses action-oriented empty states for first-run pages", () => {
    const emptyState = read("components/empty-state.tsx");
    const tools = read("app/tools/page.tsx");
    const models = read("app/models/page.tsx");
    const projects = read("app/projects/page.tsx");
    const sessions = read("components/session-explorer.tsx");
    const repair = [
      read("app/repair/page.tsx"),
      read("components/repair/repair-items-table.tsx")
    ].join("\n");
    const evidence = read("app/evidence/page.tsx");

    expect(emptyState).toContain("actions");
    for (const source of [tools, models, projects, sessions, repair, evidence]) {
      expect(source).toContain("<EmptyState");
    }
    expect(tools).toContain("ScanNowButton");
    expect(models).toContain("Set model rate");
    expect(projects).toContain("Open Discovery");
    expect(sessions).toContain("Open Scan Health");
    expect(repair).toContain("Set model rate");
    expect(evidence).toContain("Open Sessions");
  });

  it("makes repair read as a guided workbench", () => {
    const repair = `${read("app/repair/page.tsx")}\n${read("components/repair/repair-guidance.tsx")}`;

    expect(repair).toContain("function RepairFlowSteps");
    expect(repair).toContain("Problem");
    expect(repair).toContain("Evidence");
    expect(repair).toContain("Fix");
    expect(repair).toContain("Recalculate");
    expect(repair).toContain("Verified");
    expect(repair).toContain("Guided repair flow");
  });

  it("answers why each evidence number is what it is", () => {
    const evidence = read("app/evidence/page.tsx");

    expect(evidence).toContain("Why this number");
    expect(evidence).toContain("Metric definition");
    expect(evidence).toContain("Source files explain");
    expect(evidence).toContain("Sessions explain");
    expect(evidence).toContain("Parser confidence explains");
    expect(evidence).toContain("Model-rate state explains");
  });

  it("keeps page names aligned with sidebar language", () => {
    expect(read("app/parser-debug/page.tsx")).toContain('title="Parsers"');
    expect(read("app/discovery/page.tsx")).toContain('title="Discovery"');
    expect(read("app/optimisation/page.tsx")).toContain('title="Insights"');
    expect(read("app/debug/page.tsx")).toContain("Local raw data");
    expect(read("app/debug/page.tsx")).toContain("Treat file paths and parser metadata as local sensitive data.");
  });

  it("keeps dense pages usable at small widths", () => {
    const overview = [
      read("app/page.tsx"),
      read("components/overview/current-mix-panel.tsx"),
      read("components/overview/summary-cards.tsx")
    ].join("\n");
    const guide = read("app/guide/page.tsx");
    const repair = [
      read("app/repair/page.tsx"),
      read("components/repair/repair-guidance.tsx"),
      read("components/repair/repair-items-table.tsx")
    ].join("\n");
    const evidence = read("app/evidence/page.tsx");
    const sessions = read("components/session-explorer.tsx");

    for (const source of [overview, guide, repair, evidence, sessions]) {
      expect(source).toContain("min-w-0");
    }
    expect(repair).toContain("overflow-x-auto");
    expect(evidence).toContain("overflow-x-auto");
    expect(sessions).toContain("overflow-x-auto");
  });

  it("keeps README and website copy aligned on product positioning", () => {
    const readme = read("README.md");
    const websitePrompt = read("docs/WEBSITE-UPDATE-PROMPT.md");

    expect(readme).toContain("Local-first AI CLI usage analytics");
    expect(readme).toContain("https://www.baseframelabs.com/apps/tokentrace");
    expect(websitePrompt).toContain("local-first AI CLI usage analytics");
    expect(websitePrompt).toContain("overview-0.12.0.png");
    expect(websitePrompt).toContain("scan-health-0.12.0.png");
    expect(websitePrompt).toContain("Local Sources & Trust");
  });
});
