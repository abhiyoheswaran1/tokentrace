import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-reports-item-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [item, store, { sqlite }] = await Promise.all([
    import("@/app/api/saved-reports/[id]/route"),
    import("@/src/lib/saved-reports-store"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { item, ...store, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function getRequest(id: string) {
  return new Request(`http://localhost/api/saved-reports/${id}`, { method: "GET" });
}

describe("/api/saved-reports/[id]", () => {
  it("GET returns the stored report", async () => {
    const { item, createSavedReport } = await loadRoute();
    const created = createSavedReport({ name: "Weekly", viewType: "overview" });

    const response = await item.GET(getRequest(created.id), {
      params: Promise.resolve({ id: created.id })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report).toMatchObject({ id: created.id, name: "Weekly", viewType: "overview" });
  });

  it("GET returns 404 when the report does not exist", async () => {
    const { item } = await loadRoute();

    const response = await item.GET(getRequest("missing"), {
      params: Promise.resolve({ id: "missing" })
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/not found/i);
  });

  it("DELETE removes the report and returns 404 afterwards", async () => {
    const { item, createSavedReport, findSavedReportById } = await loadRoute();
    const created = createSavedReport({ name: "Weekly", viewType: "overview" });

    const deleteResponse = await item.DELETE(
      new Request(`http://localhost/api/saved-reports/${created.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ removed: true, id: created.id });
    expect(findSavedReportById(created.id)).toBeNull();

    const getResponse = await item.GET(getRequest(created.id), {
      params: Promise.resolve({ id: created.id })
    });
    expect(getResponse.status).toBe(404);
  });
});
