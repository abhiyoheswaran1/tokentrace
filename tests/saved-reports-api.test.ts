import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-reports-api-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [list, item, store, { sqlite }] = await Promise.all([
    import("@/app/api/saved-reports/route"),
    import("@/app/api/saved-reports/[id]/route"),
    import("@/src/lib/saved-reports-store"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { list, item, ...store, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

function jsonReq(method: "POST" | "PUT", body: unknown) {
  return new Request("http://localhost/api/saved-reports", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/saved-reports", () => {
  it("GET returns the empty list initially and rows after writes", async () => {
    const { list, createSavedReport } = await load();

    let response = await list.GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reports: [] });

    createSavedReport({ name: "Weekly", viewType: "overview" });
    response = await list.GET();
    const body = await response.json();
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0].name).toBe("Weekly");
  });

  it("POST creates a saved report", async () => {
    const { list, findSavedReportByName } = await load();
    const response = await list.POST(
      jsonReq("POST", { name: "Weekly", viewType: "overview", params: { range: "7d" } })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.report.name).toBe("Weekly");
    expect(findSavedReportByName("Weekly")?.id).toBe(body.report.id);
  });

  it("POST returns 400 for invalid input", async () => {
    const { list } = await load();
    const response = await list.POST(jsonReq("POST", { name: "" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/name/i);
  });

  it("POST returns 409 on duplicate name", async () => {
    const { list } = await load();
    await list.POST(jsonReq("POST", { name: "Weekly", viewType: "overview" }));
    const response = await list.POST(jsonReq("POST", { name: "weekly", viewType: "overview" }));
    expect(response.status).toBe(409);
  });

  it("DELETE [id] removes the report", async () => {
    const { list, item, createSavedReport, findSavedReportById } = await load();
    const created = createSavedReport({ name: "Weekly", viewType: "overview" });
    const response = await item.DELETE(
      new Request(`http://localhost/api/saved-reports/${created.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(response.status).toBe(200);
    expect(findSavedReportById(created.id)).toBeNull();
    expect(await list.GET().then((r) => r.json())).toEqual({ reports: [] });
  });

  it("DELETE [id] returns 404 when not found", async () => {
    const { item } = await load();
    const response = await item.DELETE(
      new Request("http://localhost/api/saved-reports/missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(response.status).toBe(404);
  });
});
