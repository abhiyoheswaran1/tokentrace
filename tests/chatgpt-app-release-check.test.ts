import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import packageJson from "@/package.json";
import { afterEach, describe, expect, it, vi } from "vitest";

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-chatgpt-release-"));
  tempDirs.push(dir);
  return dir;
}

function runReleaseCheck(args: string[], env: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(process.execPath, ["scripts/chatgpt-app-release-check.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 90_000,
    env: {
      ...process.env,
      ...env
    }
  });
}

function runReleaseCheckAsync(args: string[], env: Partial<NodeJS.ProcessEnv> = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/chatgpt-app-release-check.mjs", ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      }
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("chatgpt-app release check timed out"));
    }, 90_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    });
  });
}

afterEach(async () => {
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ChatGPT app release check", () => {
  it("wires a non-publishing ChatGPT app gate into release automation", () => {
    const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/npm-publish.yml"), "utf8");

    expect(packageJson.scripts["release:chatgpt:check"]).toBe("node scripts/chatgpt-app-release-check.mjs");
    expect(packageJson.scripts["release:check"]).toContain("npm run release:chatgpt:check");
    expect(workflow).toContain("CHATGPT_APP_MCP_URL");
    expect(workflow).toContain("npm run release:chatgpt:check -- --mcp-url");
    expect(workflow).toContain("OpenAI Dashboard");
  });

  it("documents the personal-account Dashboard release path and manual publish gate", () => {
    const doc = readFileSync(path.join(process.cwd(), "docs/CHATGPT_APP_RELEASE.md"), "utf8");

    expect(doc).toContain("personal OpenAI account");
    expect(doc).toContain("OpenAI Platform Dashboard");
    expect(doc).toContain("Owner role or `api.apps.write`");
    expect(doc).toContain("CHATGPT_APP_MCP_URL");
    expect(doc).toContain("npm run release:chatgpt:check -- --mcp-url");
    expect(doc).toContain("privacy policy");
    expect(doc).toContain("does not submit or publish");
  });

  it("rejects localhost and non-HTTPS targets unless local allowance is explicit", () => {
    const result = runReleaseCheck(["--mcp-url", "http://127.0.0.1:8787/mcp", "--json"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.checks).toContainEqual(
      expect.objectContaining({
        id: "release-target",
        ok: false,
        error: expect.stringMatching(/https|localhost|local/i)
      })
    );
  });

  it("runs the local submission-readiness checks without a hosted endpoint", async () => {
    const home = await tempDir();
    const dbPath = path.join(home, "tokentrace.db");

    const result = runReleaseCheck(["--json"], {
      TOKENTRACE_HOME: home,
      TOKENTRACE_DB: dbPath,
      DATABASE_URL: `file:${dbPath}`
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toMatchObject({
      ok: true,
      mode: "local-readiness",
      submissionRequired: true,
      dashboardManualGate: true
    });
    expect(parsed.checks).toContainEqual(
      expect.objectContaining({
        id: "prototype-selftest",
        ok: true
      })
    );
    expect(parsed.checklist).toContainEqual(
      expect.objectContaining({
        id: "dashboard-review",
        status: "manual"
      })
    );
  });

  it("verifies a hosted MCP endpoint contract before Dashboard submission", async () => {
    const home = await tempDir();
    const dbPath = path.join(home, "tokentrace.db");
    process.env.TOKENTRACE_DB = dbPath;
    process.env.DATABASE_URL = `file:${dbPath}`;
    vi.resetModules();
    const { listenChatGptAppServer } = await import("@/src/lib/chatgpt-app/server");
    const running = await listenChatGptAppServer({ hostname: "127.0.0.1", port: 0 });

    try {
      const result = await runReleaseCheckAsync(["--allow-local", "--mcp-url", running.mcpUrl, "--json"], {
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: dbPath,
        DATABASE_URL: `file:${dbPath}`
      });

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.stderr).toBe("");
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toMatchObject({
        ok: true,
        mode: "hosted-endpoint",
        mcpUrl: running.mcpUrl,
        dashboardManualGate: true
      });
      expect(parsed.checks).toContainEqual(
        expect.objectContaining({
          id: "hosted-tools-list",
          ok: true
        })
      );
      expect(parsed.checks).toContainEqual(
        expect.objectContaining({
          id: "hosted-tool-call-redaction",
          ok: true
        })
      );
    } finally {
      await running.close();
    }
  });
});
