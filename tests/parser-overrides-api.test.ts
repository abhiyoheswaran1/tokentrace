import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-parser-overrides-api-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, overrides, { sqlite }] = await Promise.all([
    import("@/app/api/parser-overrides/route"),
    import("@/src/lib/parser-overrides"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...overrides, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

function request(method: "POST" | "DELETE" | "GET", body?: unknown) {
  return new Request("http://localhost/api/parser-overrides", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
}

describe("/api/parser-overrides", () => {
  it("GET returns the empty list initially and rows after writes", async () => {
    const { GET, POST } = await loadRoute();

    let response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ overrides: [] });

    await POST(request("POST", { path: "/tmp/a.jsonl", parserId: "generic-jsonl" }));

    response = await GET();
    const body = await response.json();
    expect(body.overrides).toHaveLength(1);
    expect(body.overrides[0]).toMatchObject({
      path: "/tmp/a.jsonl",
      parserId: "generic-jsonl",
      excluded: false
    });
  });

  it("POST upserts a parser override", async () => {
    const { POST, getParserOverride } = await loadRoute();

    const response = await POST(request("POST", { path: "/tmp/x.jsonl", parserId: "generic-jsonl" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.override.parserId).toBe("generic-jsonl");
    expect(getParserOverride("/tmp/x.jsonl")?.parserId).toBe("generic-jsonl");
  });

  it("POST upserts an exclusion override", async () => {
    const { POST, getParserOverride } = await loadRoute();

    await POST(request("POST", { path: "/tmp/skip.jsonl", excluded: true, note: "binary" }));

    const stored = getParserOverride("/tmp/skip.jsonl");
    expect(stored?.excluded).toBe(true);
    expect(stored?.note).toBe("binary");
  });

  it("POST returns 400 when path is missing", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request("POST", { parserId: "generic-jsonl" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/path/i);
  });

  it("POST returns 400 when neither parserId nor excluded provided", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request("POST", { path: "/tmp/a.jsonl" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/parserId or excluded/i);
  });

  it("DELETE clears the override", async () => {
    const { POST, DELETE, getParserOverride } = await loadRoute();

    await POST(request("POST", { path: "/tmp/x.jsonl", parserId: "generic-jsonl" }));
    const response = await DELETE(request("DELETE", { path: "/tmp/x.jsonl" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.removed).toBe(true);
    expect(getParserOverride("/tmp/x.jsonl")).toBeNull();
  });

  it("DELETE returns 400 when path is missing", async () => {
    const { DELETE } = await loadRoute();
    const response = await DELETE(request("DELETE", {}));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/path/i);
  });
});
