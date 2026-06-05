import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "@/package.json";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-operating-metadata-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, settings, { sqlite }] = await Promise.all([
    import("@/app/api/operating-metadata/route"),
    import("@/src/db/settings"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...settings, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("/api/operating-metadata", () => {
  it("GET exports privacy-safe operating metadata with a download header", async () => {
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-operating-metadata.json"'
    );
    expect(body.schemaVersion).toBe("tokentrace.operating-metadata.v1");
    expect(body.rawUsageIncluded).toBe(false);
    expect(body.rawContentIncluded).toBe(false);
    expect(body.settings).toMatchObject({
      customFolders: [],
      storeRawMessageContent: false
    });
    expect(Array.isArray(body.sourceCatalog.entries)).toBe(true);
    expect(body.sourceCatalog.entries.length).toBeGreaterThan(0);
    expect(Array.isArray(body.reportDefinitions)).toBe(true);
    expect(body.roadmap.packageVersion).toBe(packageJson.version);
  });

  it("GET reflects persisted settings", async () => {
    const { GET, getAppSettings, saveAppSettings } = await loadRoute();

    saveAppSettings({
      ...getAppSettings(),
      customFolders: ["/tmp/usage-logs"]
    });

    const body = await (await GET()).json();

    expect(body.settings.customFolders).toEqual(["/tmp/usage-logs"]);
  });
});
