import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-prices-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, pricing, { sqlite }] = await Promise.all([
    import("@/app/api/prices/route"),
    import("@/src/lib/pricing"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...pricing, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/prices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function seedUnpricedUsage(sqlite: BetterSqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite
    .prepare(
      `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency)
       VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', NULL, NULL, 'USD')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file)
       VALUES ('session-1', 'source-session-1', 'claude-code', 10, 'Unpriced session', '/tmp/claude/a.jsonl')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES ('i1', 'i1-source', 'session-1', 20, 'assistant', 'sonnet', 100, 50, 150, 'exact', NULL)`
    )
    .run();
}

describe("/api/prices", () => {
  it("GET returns the empty list initially and rows after a write", async () => {
    const { GET, POST } = await loadRoute();

    let response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);

    const createResponse = await POST(
      jsonRequest({
        providerId: "anthropic",
        providerName: "Anthropic",
        model: "claude-sonnet-4-5",
        inputTokenPrice: 3,
        outputTokenPrice: 15,
        currency: "USD"
      })
    );
    expect(createResponse.status).toBe(200);

    response = await GET();
    const rows = await response.json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      providerId: "anthropic",
      provider: "Anthropic",
      model: "claude-sonnet-4-5",
      inputTokenPrice: 3,
      outputTokenPrice: 15,
      currency: "USD"
    });
  });

  it("POST recalculates unknown interaction costs for the priced model", async () => {
    const { POST, sqlite } = await loadRoute();
    seedUnpricedUsage(sqlite);

    const response = await POST(
      jsonRequest({
        providerId: "anthropic",
        model: "claude-sonnet-4-5",
        inputTokenPrice: 3,
        outputTokenPrice: 15
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("sonnet");
    expect(body.costsRecalculated).toBeGreaterThanOrEqual(1);
    expect(body.unknownCostInteractions).toBe(0);

    const interaction = sqlite.prepare("SELECT cost FROM interactions WHERE id = 'i1'").get() as {
      cost: number | null;
    };
    expect(interaction.cost).not.toBeNull();
    expect(interaction.cost!).toBeGreaterThan(0);
  });

  it("POST treats blank price strings as cleared (null) prices", async () => {
    const { GET, POST } = await loadRoute();

    const response = await POST(
      jsonRequest({
        providerId: "openai",
        model: "gpt-test",
        inputTokenPrice: "",
        outputTokenPrice: "  "
      })
    );
    expect(response.status).toBe(200);

    const rows = await (await GET()).json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      model: "gpt-test",
      inputTokenPrice: null,
      outputTokenPrice: null
    });
  });

  it("POST rejects malformed JSON without writing a row", async () => {
    const { GET, POST } = await loadRoute();

    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be valid JSON" });
    expect(await (await GET()).json()).toEqual([]);
  });

  it("POST rejects missing provider and model without writing a row", async () => {
    const { GET, POST } = await loadRoute();

    const response = await POST(jsonRequest({ inputTokenPrice: 3, outputTokenPrice: 15 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "providerId and model are required" });
    expect(await (await GET()).json()).toEqual([]);
  });

  it("POST rejects negative prices without writing a row", async () => {
    const { GET, POST } = await loadRoute();

    const response = await POST(
      jsonRequest({ providerId: "openai", model: "gpt-test", inputTokenPrice: -1, outputTokenPrice: 15 })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "inputTokenPrice must be a non-negative number or empty"
    });
    expect(await (await GET()).json()).toEqual([]);
  });
});
