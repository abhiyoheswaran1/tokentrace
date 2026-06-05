import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-settings-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, settings, { sqlite }] = await Promise.all([
    import("@/app/api/settings/route"),
    import("@/src/db/settings"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...settings, sqlite, dbPath };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function putRequest(body: unknown) {
  return new Request("http://localhost/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/settings", () => {
  it("GET returns default settings and the active database path", async () => {
    const { GET, dbPath } = await loadRoute();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.databasePath).toBe(dbPath);
    expect(body.customFolders).toEqual([]);
    expect(body.storeRawMessageContent).toBe(false);
    expect(body.usageGuardrails).toEqual({
      monthlyCostLimitUsd: null,
      monthlyTokenLimit: null,
      scoped: []
    });
    expect(body.scanSchedule).toMatchObject({ mode: "manual" });
    expect(Array.isArray(body.importProfiles)).toBe(true);
    expect(body.importProfiles.length).toBeGreaterThan(0);
  });

  it("PUT persists normalized settings that GET reflects", async () => {
    const { GET, PUT } = await loadRoute();

    const putResponse = await PUT(
      putRequest({
        customFolders: [" /tmp/usage ", "", 42, "/tmp/other"],
        storeRawMessageContent: true,
        usageGuardrails: {
          monthlyCostLimitUsd: 100,
          monthlyTokenLimit: "not-a-number",
          scoped: [
            {
              scope: "tool",
              name: "Claude Code",
              monthlyCostLimitUsd: 25,
              warningThreshold: 0.5
            }
          ]
        }
      })
    );
    const saved = await putResponse.json();

    expect(putResponse.status).toBe(200);
    expect(saved.customFolders).toEqual(["/tmp/usage", "/tmp/other"]);
    expect(saved.storeRawMessageContent).toBe(true);
    expect(saved.usageGuardrails.monthlyCostLimitUsd).toBe(100);
    expect(saved.usageGuardrails.monthlyTokenLimit).toBeNull();
    expect(saved.usageGuardrails.scoped).toEqual([
      {
        id: "tool-claude-code",
        scope: "tool",
        name: "Claude Code",
        monthlyCostLimitUsd: 25,
        monthlyTokenLimit: null,
        warningThreshold: 0.5
      }
    ]);

    const fetched = await (await GET()).json();
    expect(fetched.customFolders).toEqual(["/tmp/usage", "/tmp/other"]);
    expect(fetched.storeRawMessageContent).toBe(true);
    expect(fetched.usageGuardrails.monthlyCostLimitUsd).toBe(100);
  });

  it("PUT rejects malformed JSON without saving settings", async () => {
    const { GET, PUT } = await loadRoute();

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be valid JSON" });

    const fetched = await (await GET()).json();
    expect(fetched.customFolders).toEqual([]);
    expect(fetched.storeRawMessageContent).toBe(false);
  });
});
