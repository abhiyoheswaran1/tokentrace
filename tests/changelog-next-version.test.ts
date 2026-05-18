import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("moves Guide polish into the 0.10.1 release section", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.10.1");
    expect(changelog).toContain("## [0.10.1] - 2026-05-18");
    expect(changelog).toContain("Guide now uses a manual-style layout");
  });
});
