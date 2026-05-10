import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-serve-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("serve command", () => {
  it("prints serve-specific help without starting the server", async () => {
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "serve", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: await tempHome()
      }
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("tokentrace serve --port 3210");
    expect(result.stdout).toContain("--no-open");
    expect(result.stderr).toBe("");
  });
});
