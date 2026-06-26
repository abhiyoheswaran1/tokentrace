import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("browser issue guard", () => {
  it("checks console errors, page errors, dev overlay issues, blank charts, and mobile overflow", () => {
    const script = read("scripts/browser-issue-guard.mjs");
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

    expect(script).toContain("BROWSER_GUARD_BASE_URL");
    expect(script).toContain("console errors");
    expect(script).toContain("page errors");
    expect(script).toContain("dev overlay");
    expect(script).toContain("blank charts");
    expect(script).toContain("mobile overflow");
    expect(script).toContain("/repair");
    expect(script).toContain("/pricing");
    expect(script).toContain("/sessions");
    expect(script).toContain("/settings");
    expect(packageJson.scripts["browser:guard"]).toBe("node scripts/browser-issue-guard.mjs");
  });
});

describe("visual smoke", () => {
  it("captures screenshots without mutating input caret styles before hydration", () => {
    const script = read("scripts/visual-smoke.mjs");

    expect(script).toContain('from "playwright"');
    expect(script).toContain("waitForLoadState");
    expect(script).toContain('caret: "initial"');
    expect(script).not.toContain("playwright@latest");
    expect(script).not.toContain('"screenshot", "--full-page"');
  });
});
