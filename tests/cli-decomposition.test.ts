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
    expect(bin).toContain('import { createCliContext } from "../src/cli/context.js";');
    expect(bin).toContain('import { runCliCommand } from "../src/cli/commands.js";');
    expect(bin).not.toContain("get-port");
    expect(bin).not.toContain('from "open"');
    expect(bin).not.toContain("node:readline/promises");
    expect(bin).not.toContain("node:crypto");

    for (const modulePath of [
      "src/cli/context.js",
      "src/cli/help.js",
      "src/cli/runtime.js",
      "src/cli/serve.js",
      "src/cli/commands.js"
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), modulePath)), modulePath).toBe(true);
    }
  });
});
