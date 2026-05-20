import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Settings scan feedback", () => {
  it("shows scan result metrics and clear follow-up actions after a manual scan", () => {
    const source = [
      "components/settings-panel.tsx",
      "components/settings/scan-section.tsx"
    ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");

    expect(source).toContain("Scan result");
    expect(source).toContain("Files checked");
    expect(source).toContain("Records imported");
    expect(source).toContain("Warnings");
    expect(source).toContain("Errors");
    expect(source).toContain("Costs recalculated");
    expect(source).toContain("Unknown cost");
    expect(source).toContain("Stale support imports removed");
    expect(source).toContain("Open Scan Health");
    expect(source).toContain("Open repair");
    expect(source).toContain("Open Discovery");
    expect(source).toContain("Set model rate");
    expect(source).toContain("compact: true");
    expect(source).toContain("warningCount");
    expect(source).toContain("errorCount");
  });
});
