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
    timeout: 90_000,
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

function parseToolPayload(response: { result: { content: Array<{ text: string }> } }) {
  const [firstContent] = response.result.content;
  if (!firstContent) throw new Error("expected tool response content");
  return JSON.parse(firstContent.text);
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
      "get_agent_guide",
      "get_capabilities",
      "get_status",
      "get_preflight",
      "run_doctor",
      "get_evidence",
      "get_repair_queue",
      "get_handoff",
      "get_report",
      "run_scan",
      "get_anomalies",
      "query_usage",
      "get_classifications"
    ]);
  });

  it("returns preflight guidance through an enveloped MCP tool call", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_preflight", arguments: {} }
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("preflight");
    expect(payload.confidence).toBe("high");
    expect(payload.requiresHumanConfirmation).toBe(false);
    expect(payload.data.schemaVersion).toBe("tokentrace.preflight.v1");
    expect(["proceed", "caution", "blocked"]).toContain(payload.data.decision);
  });

  it("returns deterministic classification suggestions through an enveloped MCP tool call", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_classifications", arguments: { minConfidence: 0.5 } }
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("classification suggestions");
    expect(payload.confidence).toBe("high");
    expect(payload.data).toHaveProperty("suggestions");
    expect(payload.data).toHaveProperty("summary");
    expect(payload.data.minConfidence).toBe(0.5);
  });

  it("runs query_usage with structured args through an enveloped MCP tool call", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "query_usage",
            arguments: { groupBy: "model", metric: "cost", topN: 5 }
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("structured local usage query");
    expect(payload.confidence).toBe("high");
    expect(payload.data.groupBy).toBe("model");
    expect(payload.data.metric).toBe("cost");
    expect(Array.isArray(payload.data.rows)).toBe(true);
    expect(payload.data.topN).toBe(5);
  });

  it("returns the local anomaly report through an enveloped MCP tool call", async () => {
    const home = await tempDir();
    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_anomalies", arguments: {} }
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("anomaly");
    expect(payload.confidence).toBe("high");
    expect(payload.requiresHumanConfirmation).toBe(false);
    expect(payload.data).toHaveProperty("anomalies");
    expect(payload.data).toHaveProperty("summary");
    expect(payload.data.summary).toHaveProperty("total");
  });

  it("returns an agent guide with MCP registry install snippets and copy-paste repo instructions", async () => {
    const blockedHome = path.join(await tempDir(), "not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = runMcp(
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_agent_guide", arguments: {} }
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("recommended TokenTrace MCP operating loop");
    expect(payload.confidence).toBe("high");
    expect(payload.requiresHumanConfirmation).toBe(false);
    expect(payload.nextActions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("get_preflight"),
        expect.stringContaining("get_status"),
        expect.stringContaining("run_doctor"),
        expect.stringContaining("get_evidence")
      ])
    );
    expect(payload.data.registryName).toBe("io.github.abhiyoheswaran1/tokentrace");
    expect(payload.data.npmCommand).toEqual(["npx", "tokentrace", "mcp"]);
    expect(payload.data.agentsMdBlock).toContain("Before reporting AI token, cost, model, or session usage");
    expect(payload.data.workflow.map((step: { tool: string }) => step.tool)).toEqual([
      "get_capabilities",
      "get_preflight",
      "get_status",
      "run_doctor",
      "get_evidence",
      "get_repair_queue",
      "get_handoff",
      "get_report",
      "run_scan"
    ]);
  });

  it("returns agent capabilities through an enveloped MCP tool call", async () => {
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("agent discovery manifest");
    expect(payload.confidence).toBe("high");
    expect(payload.nextActions).toEqual(expect.arrayContaining([expect.stringContaining("run_doctor")]));
    expect(payload.warnings).toEqual([]);
    expect(payload.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: ["tokentrace", "agent", "--json"] })
      ])
    );
    expect(payload.requiresHumanConfirmation).toBe(false);
    expect(payload.data.schemaVersion).toBe(1);
    expect(payload.data.product.name).toBe("TokenTrace");
    expect(payload.data.privacy.localFirst).toBe(true);
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("confirmLocalScan");
    expect(payload.requiresHumanConfirmation).toBe(true);
    expect(payload.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("local file reads and local database writes")])
    );
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
    const payload = parseToolPayload(result.responses[1]);
    expect(payload.summary).toContain("Local scan completed");
    expect(payload.requiresHumanConfirmation).toBe(false);
    expect(payload.data.filesScanned).toBeGreaterThanOrEqual(1);
    expect(payload.data.recordsImported).toBeGreaterThanOrEqual(1);
  });

  it("self-tests the MCP server without initializing app data or scanning files", async () => {
    const blockedHome = path.join(await tempDir(), "not-a-directory");
    await fs.writeFile(blockedHome, "blocked");

    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "mcp", "selftest", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 45_000,
      env: {
        ...process.env,
        TOKENTRACE_HOME: blockedHome,
        TOKENTRACE_DB: path.join(blockedHome, "tokentrace.db"),
        DATABASE_URL: `file:${path.join(blockedHome, "tokentrace.db")}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.checks.map((check: { id: string }) => check.id)).toEqual([
      "initialize",
      "tools-list",
      "agent-guide",
      "scan-confirmation-refusal"
    ]);
    expect(payload.mutatedLocalState).toBe(false);
  });
});
