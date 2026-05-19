import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function tempPath(name: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-statusline-cli-"));
  tempDirs.push(dir);
  return path.join(dir, name);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("statusline CLI safety", () => {
  it("prints agent discovery JSON without touching the TokenTrace app data directory", async () => {
    const blockedHome = await tempPath("not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "agent", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const manifest = JSON.parse(result.stdout);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.discoveryCommands).toContainEqual(["tokentrace", "agent", "--json"]);
    expect(manifest.privacy.localFirst).toBe(true);
  });

  it("prints roadmap status JSON without touching the TokenTrace app data directory", async () => {
    const blockedHome = await tempPath("not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "roadmap", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const roadmap = JSON.parse(result.stdout);
    expect(roadmap.version).toBe("0.12.0");
    expect(roadmap.release.releaseAllowed).toBe(true);
    expect(roadmap.cards).toHaveLength(10);
    expect(roadmap.handoff.schemaVersion).toBe("tokentrace.roadmap.v2");
  });

  it("prints Claude setup JSON without touching the TokenTrace app data directory", async () => {
    const blockedHome = await tempPath("not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "statusline", "setup", "claude"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("\"statusLine\"");
    expect(result.stdout).toContain("\"command\": \"tokentrace statusline claude\"");
  });

  it("treats piped Claude statusLine JSON as status-line input instead of starting the dashboard", async () => {
    const blockedHome = await tempPath("not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js"], {
      cwd: process.cwd(),
      encoding: "utf8",
      input: JSON.stringify({
        transcript_path: path.join(os.tmpdir(), "missing-token-trace-transcript.jsonl"),
        model: { display_name: "Claude" },
        cost: { total_cost_usd: 0.01 }
      }),
      timeout: 5000,
      env: {
        ...process.env,
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("TokenTrace | Claude");
    expect(result.stdout).not.toContain("Starting TokenTrace at");
  });
});
