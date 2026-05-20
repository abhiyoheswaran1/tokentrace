import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("settings lazy sections", () => {
  it("defers dense settings sections while keeping anchors stable", () => {
    const panel = read("components/settings-panel.tsx");
    const helper = read("components/settings/lazy-settings-section.tsx");

    expect(panel).toContain("@/components/settings/lazy-settings-section");
    expect(panel).toMatch(/<LazySettingsSection[\s\S]*id="package-trust"/);
    expect(panel).toMatch(/<LazySettingsSection[\s\S]*id="usage-guardrails"/);
    expect(panel).toMatch(/<LazySettingsSection[\s\S]*id="import-profiles"/);
    expect(panel).toMatch(/<LazySettingsSection[\s\S]*id="local-exports"/);
    expect(helper).toContain("IntersectionObserver");
    expect(helper).toContain("requestIdleCallback");
    expect(helper).toContain("data-settings-lazy-section");
  });
});
