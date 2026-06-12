import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadPrototype() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-chatgpt-app-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [prototype, { sqlite }] = await Promise.all([
    import("@/src/lib/chatgpt-app/prototype"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return prototype;
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ChatGPT app prototype", () => {
  it("declares a read-only evidence-pack tool with Apps SDK widget metadata", async () => {
    const prototype = await loadPrototype();
    const tools = prototype.chatGptAppToolDescriptors();
    const [tool] = tools;

    expect(tools).toHaveLength(1);
    if (!tool) throw new Error("expected ChatGPT app tool descriptor");
    expect(tool).toMatchObject({
      name: "get_redacted_evidence_pack",
      title: "Get redacted evidence pack",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false
      },
      _meta: {
        ui: { resourceUri: "ui://tokentrace/evidence-pack.html" },
        "openai/outputTemplate": "ui://tokentrace/evidence-pack.html"
      }
    });
    expect(JSON.stringify(tool.inputSchema)).toContain("processed-tokens");
    expect(JSON.stringify(tool.outputSchema)).toContain("tokentrace.evidence-pack.v1");
  });

  it("returns a model-visible redacted evidence pack and widget-only metadata", async () => {
    const prototype = await loadPrototype();

    const result = await prototype.buildChatGptEvidencePackToolResult({ metric: "sessions" });

    expect(result.structuredContent.pack.schemaVersion).toBe("tokentrace.evidence-pack.v1");
    expect(result.structuredContent.pack.scope).toMatchObject({ type: "metric", id: "sessions" });
    expect(result.structuredContent.pack.redaction).toMatchObject({
      rawContentIncluded: false,
      rawContentPolicy: "excluded by default"
    });
    expect(result.structuredContent.summary).toMatch(/redacted/i);
    const [content] = result.content;
    if (!content) throw new Error("expected ChatGPT app text content");
    expect(content.text).toMatch(/redacted evidence pack/i);
    expect(result._meta).toMatchObject({
      rawContentIncluded: false,
      widgetMode: "evidence-pack-summary"
    });
  });

  it("serves a single-file widget resource for the MCP Apps iframe bridge", async () => {
    const prototype = await loadPrototype();

    const resource = prototype.chatGptAppWidgetResource();

    expect(resource.uri).toBe("ui://tokentrace/evidence-pack.html");
    expect(resource.mimeType).toBe("text/html;profile=mcp-app");
    expect(resource.text).toContain("ui/notifications/tool-result");
    expect(resource.text).toContain("window.openai");
    expect(resource.text).toContain("rawContentIncluded");
    expect(resource._meta).toMatchObject({
      ui: {
        csp: {
          connectDomains: [],
          resourceDomains: []
        }
      },
      "openai/widgetDescription": expect.stringMatching(/redacted TokenTrace evidence/i)
    });
  });

  it("self-tests the private prototype without scanning local files", async () => {
    const prototype = await loadPrototype();

    const result = await prototype.runChatGptAppSelfTest();

    expect(result.ok).toBe(true);
    expect(result.mutatedLocalState).toBe(false);
    expect(result.tools).toContain("get_redacted_evidence_pack");
    expect(result.checks.every((check: { ok: boolean }) => check.ok)).toBe(true);
  });

  it("shows browser-readable guidance for direct /mcp visits", async () => {
    const { listenChatGptAppServer } = await import("@/src/lib/chatgpt-app/server");
    const running = await listenChatGptAppServer({ hostname: "127.0.0.1", port: 0 });

    try {
      const response = await fetch(running.mcpUrl);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(text).toContain("TokenTrace ChatGPT app prototype");
      expect(text).toContain("MCP endpoint");
      expect(text).toContain("text/event-stream");
    } finally {
      await running.close();
    }
  });
});
