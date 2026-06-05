import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-import-preview-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/import-profile-preview/route"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, sqlite, dir };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function previewRequest(body: unknown) {
  return new Request("http://localhost/api/import-profile-preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/import-profile-preview", () => {
  it("POST previews a readable usage log without leaking raw content", async () => {
    const { POST, dir } = await loadRoute();
    const filePath = path.join(dir, "team-ai-usage.jsonl");
    await fs.writeFile(
      filePath,
      `${JSON.stringify({
        session_id: "session-1",
        role: "assistant",
        model: "gpt-5.4",
        content: "secret prompt content",
        usage: { input_tokens: 10, output_tokens: 5 }
      })}\n`
    );

    const response = await POST(previewRequest({ filePath }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      detected: true,
      preview: { sessions: 1, interactions: 1 }
    });
    expect(JSON.stringify(body)).not.toContain("secret prompt content");
  });

  it("POST rejects a missing filePath", async () => {
    const { POST } = await loadRoute();

    const response = await POST(previewRequest({}));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/filePath/i);
  });

  it("POST rejects relative paths", async () => {
    const { POST } = await loadRoute();

    const response = await POST(previewRequest({ filePath: "relative/usage.jsonl" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/absolute/i);
  });

  it("POST returns 404 for files that do not exist", async () => {
    const { POST, dir } = await loadRoute();

    const response = await POST(previewRequest({ filePath: path.join(dir, "missing.jsonl") }));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/not found/i);
  });

  it("POST returns 403 for paths outside the allowed read roots", async () => {
    const { POST } = await loadRoute();

    const response = await POST(previewRequest({ filePath: "/etc/hosts" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/outside the allowed/i);
  });

  it("POST rejects malformed JSON", async () => {
    const { POST } = await loadRoute();

    const response = await POST(
      new Request("http://localhost/api/import-profile-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be valid JSON" });
  });
});
