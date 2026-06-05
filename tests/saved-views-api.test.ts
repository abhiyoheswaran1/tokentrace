import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoutes() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-views-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [list, item, store, { sqlite }] = await Promise.all([
    import("@/app/api/saved-views/route"),
    import("@/app/api/saved-views/[id]/route"),
    import("@/src/lib/saved-views"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { list, item, ...store, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/saved-views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function deleteRequest(id: string) {
  return new Request(`http://localhost/api/saved-views/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

describe("/api/saved-views", () => {
  it("GET returns built-in views and an empty custom list initially", async () => {
    const { list } = await loadRoutes();

    const response = await list.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.custom).toEqual([]);
    expect(body.builtIn.map((view: { id: string }) => view.id)).toEqual([
      "unknown-cost",
      "high-cost-sessions",
      "claude-this-month",
      "codex-this-month",
      "estimated-tokens",
      "guardrail-review",
      "parser-review"
    ]);
  });

  it("POST creates a custom view that GET lists", async () => {
    const { list } = await loadRoutes();

    const response = await list.POST(
      postRequest({
        name: "Codex unknown cost",
        filters: { tool: "Codex CLI", cost: "unknown", highCost: true }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.view).toMatchObject({
      name: "Codex unknown cost",
      filters: { tool: "Codex CLI", cost: "unknown", highCost: true },
      href: "/sessions?tool=Codex+CLI&cost=unknown&highCost=1",
      builtIn: false
    });

    const listed = await (await list.GET()).json();
    expect(listed.custom).toHaveLength(1);
    expect(listed.custom[0].id).toBe(body.view.id);
  });

  it("POST returns 400 when the name is blank", async () => {
    const { list } = await loadRoutes();

    const response = await list.POST(postRequest({ name: "   ", filters: {} }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/name/i);
  });

  it("POST returns 400 for unsupported filter values", async () => {
    const { list } = await loadRoutes();

    const response = await list.POST(postRequest({ name: "Bad cost", filters: { cost: "free" } }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/cost/i);
  });

  it("POST returns 400 for malformed JSON", async () => {
    const { list } = await loadRoutes();

    const response = await list.POST(
      new Request("http://localhost/api/saved-views", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be valid JSON" });
  });

  it("DELETE [id] removes the view and reports deleted false for unknown ids", async () => {
    const { list, item, getSavedViews } = await loadRoutes();

    const created = await (await list.POST(postRequest({ name: "Temp view", filters: {} }))).json();

    let response = await item.DELETE(deleteRequest(created.view.id), {
      params: Promise.resolve({ id: created.view.id })
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(getSavedViews().custom).toEqual([]);

    response = await item.DELETE(deleteRequest("view-missing"), {
      params: Promise.resolve({ id: "view-missing" })
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: false });
  });

  it("DELETE [id] returns 400 for blank ids", async () => {
    const { item } = await loadRoutes();

    const response = await item.DELETE(deleteRequest("%20"), {
      params: Promise.resolve({ id: "%20" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "view id is required" });
  });
});
