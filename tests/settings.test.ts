import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadSettings() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-settings-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ getAppSettings }, { sqlite }] = await Promise.all([
    import("@/src/db/settings"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getAppSettings, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("app settings normalization", () => {
  it("sanitizes persisted custom folders and raw storage flags", async () => {
    const { getAppSettings, sqlite } = await loadSettings();
    sqlite
      .prepare("INSERT INTO settings (key, value) VALUES ('app', ?)")
      .run(JSON.stringify({
        customFolders: [" /tmp/usage ", "", "   ", 42, "/tmp/other"],
        storeRawMessageContent: "false",
        usageGuardrails: {
          monthlyCostLimitUsd: "6000",
          monthlyTokenLimit: "10000000"
        }
      }));

    expect(getAppSettings()).toEqual({
      customFolders: ["/tmp/usage", "/tmp/other"],
      storeRawMessageContent: false,
      usageGuardrails: {
        monthlyCostLimitUsd: 6000,
        monthlyTokenLimit: 10000000,
        scoped: []
      },
      importProfiles: expect.arrayContaining([
        expect.objectContaining({ id: "structured-usage-log", enabled: true }),
        expect.objectContaining({ id: "cursor-chat-export", enabled: true }),
        expect.objectContaining({ id: "generic-jsonl", enabled: true }),
        expect.objectContaining({ id: "generic-text-log", enabled: true }),
        expect.objectContaining({ id: "sqlite-history", enabled: true })
      ]),
      scanSchedule: {
        mode: "manual",
        retentionRuns: 30,
        lastScheduledScanAt: null,
        lastScheduledScanStatus: null,
        lastScheduledScanMessage: null
      }
    });
  });
});
