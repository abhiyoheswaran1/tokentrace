import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-repair-items-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, repair, { sqlite }] = await Promise.all([
    import("@/app/api/repair-items/route"),
    import("@/src/lib/unknown-cost-repair"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...repair, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function seedUnknownCostUsage(sqlite: BetterSqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite
    .prepare(
      `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
        ('model-a', 'anthropic', 'mystery-model-a', NULL, NULL, 'USD'),
        ('model-b', 'anthropic', 'mystery-model-b', NULL, NULL, 'USD')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
        ('session-1', 'source-1', 'claude-code', 10, 'Gap one', '/tmp/claude/a.jsonl'),
        ('session-2', 'source-2', 'claude-code', 20, 'Gap two', '/tmp/claude/b.jsonl')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES
        ('i1', 'i1-source', 'session-1', 'assistant', 'model-a', 100, 50, 150, 'exact', NULL),
        ('i2', 'i2-source', 'session-2', 'assistant', 'model-b', 20, 30, 50, 'exact', NULL)`
    )
    .run();
}

function putRequest(body: unknown) {
  return new Request("http://localhost/api/repair-items", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/repair-items", () => {
  it("GET returns an empty workbench on a fresh database", async () => {
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.groups).toEqual([]);
    expect(body.totalGroups).toBe(0);
    expect(body.summary).toMatchObject({ unresolved: 0, totalInteractions: 0 });
  });

  it("GET groups unknown-cost interactions into the workbench", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUnknownCostUsage(sqlite);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalGroups).toBe(2);
    expect(body.summary.unresolved).toBe(2);
    expect(body.summary.totalInteractions).toBe(2);
    const models = body.groups.map((group: { model: string }) => group.model).sort();
    expect(models).toEqual(["mystery-model-a", "mystery-model-b"]);
    expect(body.groups[0].key).toMatch(/^repair:v1:/);
  });

  it("PUT updates a single repair item review by workbench key", async () => {
    const { GET, PUT, getUnknownCostReview, sqlite } = await loadRoute();
    seedUnknownCostUsage(sqlite);

    const workbench = await (await GET()).json();
    const group = workbench.groups.find(
      (candidate: { model: string }) => candidate.model === "mystery-model-a"
    );
    expect(group).toBeDefined();

    const response = await PUT(
      putRequest({ key: group!.key, status: "ignored", notes: "Known sandbox model." })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.review).toMatchObject({
      key: group!.key,
      status: "ignored",
      notes: "Known sandbox model.",
      model: "mystery-model-a",
      sourceFile: "/tmp/claude/a.jsonl"
    });
    expect(getUnknownCostReview(group!.key)).toMatchObject({ status: "ignored" });
  });

  it("PUT bulk-updates several repair items at once", async () => {
    const { GET, PUT, sqlite } = await loadRoute();
    seedUnknownCostUsage(sqlite);

    const workbench = await (await GET()).json();
    const keys = workbench.groups.map((group: { key: string }) => group.key);
    expect(keys).toHaveLength(2);

    const response = await PUT(putRequest({ keys, status: "resolved", notes: "Batch resolved." }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updated).toBe(2);
    expect(body.reviews).toHaveLength(2);

    const refreshed = await (await GET()).json();
    expect(refreshed.summary.resolved).toBe(2);
    expect(refreshed.summary.unresolved).toBe(0);
  });

  it("PUT returns 400 when the key is missing", async () => {
    const { PUT } = await loadRoute();

    const response = await PUT(putRequest({ status: "ignored" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/key is required/i);
  });

  it("PUT returns 400 for unsupported review states", async () => {
    const { GET, PUT, sqlite } = await loadRoute();
    seedUnknownCostUsage(sqlite);
    const workbench = await (await GET()).json();
    expect(workbench.groups.length).toBeGreaterThan(0);

    const response = await PUT(putRequest({ key: workbench.groups[0].key, status: "archived" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/status must be/i);
  });

  it("PUT returns 404 when bulk keys are not in the current workbench", async () => {
    const { PUT, sqlite } = await loadRoute();
    seedUnknownCostUsage(sqlite);

    const response = await PUT(
      putRequest({ keys: ["repair:v1:missing%20pricing:Fake:Tool:fake:%2Ftmp%2Fnope"], status: "resolved" })
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/not found/i);
  });
});
