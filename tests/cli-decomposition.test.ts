import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("CLI decomposition", () => {
  it("keeps the executable bin as a thin entrypoint over focused runtime modules", () => {
    const bin = read("bin/tokentrace.js");
    const lineCount = bin.trimEnd().split("\n").length;

    expect(lineCount).toBeLessThan(180);
    expect(bin).toContain("dist/cli/main.mjs");
    expect(bin).toContain("src/cli/main.ts");
    expect(bin).toContain("tsx/esm/api");
    expect(bin).not.toContain("get-port");
    expect(bin).not.toContain('from "open"');
    expect(bin).not.toContain("node:readline/promises");
    expect(bin).not.toContain("node:crypto");

    for (const modulePath of [
      "src/cli/main.ts",
      "src/cli/context.ts",
      "src/cli/help.ts",
      "src/cli/runtime.ts",
      "src/cli/serve.ts",
      "src/cli/commands.ts"
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), modulePath)), modulePath).toBe(true);
    }
  });
});
