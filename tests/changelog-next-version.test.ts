import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("next release scope", () => {
  it("moves Accuracy & Evidence work into the 0.11.0 release section", () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");

    expect(packageJson.version).toBe("0.11.0");
    expect(changelog).toContain("## [0.11.0] - 2026-05-18");
    expect(changelog).toContain("Tokenizer-backed estimates");
  });
});
