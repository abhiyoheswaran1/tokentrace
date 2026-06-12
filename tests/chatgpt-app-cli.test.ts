import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-chatgpt-app-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("tokentrace chatgpt-app", () => {
  it("runs the prototype self-test through the CLI", async () => {
    const home = await tempDir();
    const dbPath = path.join(home, "tokentrace.db");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "chatgpt-app", "selftest", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: dbPath,
        DATABASE_URL: `file:${dbPath}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.tools).toContain("get_redacted_evidence_pack");
    expect(parsed.mutatedLocalState).toBe(false);
  });

  it("lists the ChatGPT app command in top-level help", () => {
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("tokentrace chatgpt-app");
    expect(result.stdout).toContain("Start the private ChatGPT app prototype");
  });
});

