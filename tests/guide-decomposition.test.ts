import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Guide page decomposition", () => {
  it("keeps the route focused on setup-status logic and section composition", () => {
    const page = read("app/guide/page.tsx");

    expect(page.trimEnd().split("\n").length).toBeLessThan(170);
    expect(page).toContain("@/app/guide/sections/setup-status-section");
    expect(page).toContain("@/app/guide/sections/guide-nav");
    expect(page).toContain("@/app/guide/sections/start-section");
    expect(page).toContain("@/app/guide/sections/daily-loop-section");
    expect(page).toContain("@/app/guide/sections/status-line-section");
    expect(page).toContain("@/app/guide/sections/agent-handoff-section");
    expect(page).toContain("@/app/guide/sections/troubleshooting-section");

    expect(read("app/guide/guide-content.ts")).toContain("export const guideNav");
    expect(read("app/guide/guide-content.ts")).toContain("export const dailyLoop");
    expect(read("app/guide/guide-content.ts")).toContain("export const statusLineTerms");
    expect(read("app/guide/guide-content.ts")).toContain("export const pageMap");
    expect(read("app/guide/guide-content.ts")).toContain("export const emptyStatePlaybook");
    expect(read("app/guide/section-title.tsx")).toContain("export function SectionTitle");
    expect(read("app/guide/command-block.tsx")).toContain("export function CommandBlock");
    expect(read("app/guide/sections/setup-status-section.tsx")).toContain("export function SetupStatusSection");
    expect(read("app/guide/sections/guide-nav.tsx")).toContain("export function GuideNavSidebar");
    expect(read("app/guide/sections/start-section.tsx")).toContain("export function StartSection");
    expect(read("app/guide/sections/daily-loop-section.tsx")).toContain("export function DailyLoopSection");
    expect(read("app/guide/sections/status-line-section.tsx")).toContain("export function StatusLineSection");
    expect(read("app/guide/sections/agent-handoff-section.tsx")).toContain("export function AgentHandoffSection");
    expect(read("app/guide/sections/troubleshooting-section.tsx")).toContain("export function TroubleshootingSection");
  });
});
