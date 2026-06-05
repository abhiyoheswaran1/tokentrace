import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-evidence-pack-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/evidence-pack/route"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function seedUsage(sqlite: BetterSqliteDatabase) {
  const startedAt = Date.now() - 60_000;
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite
    .prepare(
      `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency)
       VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO sessions (id, source_id, tool_id, started_at, ended_at, title, source_file)
       VALUES ('session-1', 'source-session-1', 'claude-code', ?, ?, 'Seeded session', '/tmp/claude/a.jsonl')`
    )
    .run(startedAt, startedAt + 30_000);
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens,
         token_confidence, cost, raw_text, raw_text_preview)
       VALUES ('i1', 'i1-source', 'session-1', ?, 'assistant', 'sonnet', 100, 50, 150, 'exact', 0.5,
         'super secret prompt text', 'super secret prompt text')`
    )
    .run(startedAt + 1_000);
}

function packRequest(query = "") {
  return new Request(`http://localhost/api/evidence-pack${query}`, { method: "GET" });
}

describe("/api/evidence-pack", () => {
  it("GET exports a JSON evidence pack with download headers and no raw content", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(packRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-processed-tokens-evidence.json"'
    );
    expect(body.schemaVersion).toBe("tokentrace.evidence-pack.v1");
    expect(body.scope).toMatchObject({ type: "metric", id: "processed-tokens" });
    expect(body.redaction).toMatchObject({ rawContentIncluded: false });
    expect(body.records).toHaveLength(1);
    expect(body.records[0]).toMatchObject({
      id: "session-1",
      role: "session",
      sourceFile: "/tmp/claude/a.jsonl",
      totalTokens: 150
    });
    expect(JSON.stringify(body)).not.toContain("super secret prompt text");
  });

  it("GET renders a markdown evidence pack for a selected metric", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(packRequest("?format=markdown&metric=sessions"));
    const markdown = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-sessions-evidence.md"'
    );
    expect(markdown).toContain("# TokenTrace Evidence Pack");
    expect(markdown).not.toContain("super secret prompt text");
  });

  it("GET falls back to the processed-tokens metric for unknown metric params", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(packRequest("?metric=bogus-metric"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scope.id).toBe("processed-tokens");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-processed-tokens-evidence.json"'
    );
  });

  it("GET returns an empty pack on a fresh database", async () => {
    const { GET } = await loadRoute();

    const response = await GET(packRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toEqual([]);
    expect(body.totals).toMatchObject({ sessions: 0, interactions: 0 });
  });
});
