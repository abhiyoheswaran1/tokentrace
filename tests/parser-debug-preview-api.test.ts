import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadPreviewRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-preview-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [{ POST }, { sqlite }] = await Promise.all([
    import("@/app/api/parser-debug/preview/route"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { POST, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

function request(body: unknown) {
  return new Request("http://localhost/api/parser-debug/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/parser-debug/preview", () => {
  it("returns predicted parse output for a file under an alternate parser without writing", async () => {
    const { POST, sqlite } = await loadPreviewRoute();
    const fixturePath = path.resolve("fixtures/generic-jsonl/sample.jsonl");

    const before = sqlite.prepare("SELECT COUNT(*) AS count FROM interactions").get() as { count: number };

    const response = await POST(request({ path: fixturePath, parserId: "generic-jsonl" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.parserId).toBe("generic-jsonl");
    expect(body.sessions.length).toBeGreaterThan(0);
    expect(body.predictedInteractions).toBeGreaterThan(0);
    expect(body.predictedTotalTokens).toBeGreaterThan(0);

    const after = sqlite.prepare("SELECT COUNT(*) AS count FROM interactions").get() as { count: number };
    expect(after.count).toBe(before.count);
  });

  it("returns 400 when path is missing", async () => {
    const { POST } = await loadPreviewRoute();

    const response = await POST(request({ parserId: "generic-jsonl" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/path/i);
  });

  it("returns 400 when parserId is missing", async () => {
    const { POST } = await loadPreviewRoute();

    const response = await POST(request({ path: "/tmp/x" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/parserId/i);
  });

  it("returns 404 when parserId is not registered", async () => {
    const { POST } = await loadPreviewRoute();
    const fixturePath = path.resolve("fixtures/generic-jsonl/sample.jsonl");

    const response = await POST(request({ path: fixturePath, parserId: "made-up" }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/parser.*made-up/i);
  });

  it("returns 404 when the file does not exist", async () => {
    const { POST } = await loadPreviewRoute();

    const response = await POST(request({ path: "/tmp/does-not-exist.jsonl", parserId: "generic-jsonl" }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/file/i);
  });

  it("refuses to read files outside the allowed import roots", async () => {
    const { POST } = await loadPreviewRoute();

    const response = await POST(request({ path: "/etc/hosts", parserId: "generic-json" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/outside the allowed/i);
  });

  it("rejects a relative path before touching the filesystem", async () => {
    const { POST } = await loadPreviewRoute();

    const response = await POST(request({ path: "../../etc/hosts", parserId: "generic-json" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/absolute/i);
  });
});
