import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-mcp-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function runMcp(messages: unknown[], env: Partial<NodeJS.ProcessEnv> = {}) {
  const input = `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`;
  const result = spawnSync(process.execPath, ["bin/tokentrace.js", "mcp"], {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    timeout: 10_000,
    env: {
      ...process.env,
      ...env
    }
  });

  return {
    ...result,
    responses: result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  };
}

describe("TokenTrace MCP server", () => {
  it("lists local-first tools without initializing app data", async () => {
    const blockedHome = path.join(await tempDir(), "not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = runMcp(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "vitest", version: "0" }
          }
        },
        { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }
      ],
      {
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.responses).toHaveLength(2);
    expect(result.responses[0].result.serverInfo.name).toBe("tokentrace");
    expect(result.responses[0].result.capabilities.tools).toEqual({});
    expect(result.responses[1].result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "get_capabilities",
      "get_status",
      "run_doctor",
      "get_evidence",
      "get_repair_queue",
      "get_report",
      "run_scan"
    ]);
  });

  it("returns agent capabilities through an MCP tool call", async () => {
    const blockedHome = path.join(await tempDir(), "not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_capabilities", arguments: {} }
        }
      ],
      {
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.responses[1].result.content[0].text);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.product.name).toBe("TokenTrace");
    expect(payload.privacy.localFirst).toBe(true);
  });

  it("requires an explicit acknowledgement before scanning local files", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "run_scan", arguments: { folders: ["fixtures/generic-jsonl"] } }
        }
      ],
      {
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(home, "tokentrace.db")}`
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.responses[1].result.isError).toBe(true);
    expect(result.responses[1].result.content[0].text).toContain("confirmLocalScan");
  });

  it("runs a local fixture scan only after explicit acknowledgement", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "run_scan",
            arguments: {
              confirmLocalScan: true,
              folders: ["fixtures/generic-jsonl"]
            }
          }
        }
      ],
      {
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(home, "tokentrace.db")}`
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.responses[1].result.isError).toBeUndefined();
    const payload = JSON.parse(result.responses[1].result.content[0].text);
    expect(payload.filesScanned).toBeGreaterThanOrEqual(1);
    expect(payload.recordsImported).toBeGreaterThanOrEqual(1);
  });
});
