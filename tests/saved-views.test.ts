import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadSavedViews() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-views-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [savedViews, { sqlite }] = await Promise.all([
    import("@/src/lib/saved-views"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...savedViews, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("saved local views", () => {
  it("ships deterministic built-in views for common local review workflows", async () => {
    const { getSavedViews } = await loadSavedViews();

    const views = getSavedViews(new Date("2026-05-13T12:00:00Z"));

    expect(views.builtIn.map((view) => view.id)).toEqual([
      "unknown-cost",
      "high-cost-sessions",
      "claude-this-month",
      "codex-this-month",
      "estimated-tokens",
      "guardrail-review",
      "parser-review"
    ]);
    expect(views.builtIn.find((view) => view.id === "codex-this-month")?.href).toBe(
      "/sessions?tool=Codex+CLI&from=2026-05-01&to=2026-05-13"
    );
  });

  it("persists, lists, and deletes user-created local views without remote state", async () => {
    const { deleteSavedView, getSavedViews, saveSavedView, sqlite } = await loadSavedViews();

    const saved = saveSavedView({
      name: "Codex unknown cost",
      filters: {
        tool: "Codex CLI",
        cost: "unknown",
        highCost: true
      }
    });

    expect(saved.id).toMatch(/^view-/);
    expect(saved.href).toBe("/sessions?tool=Codex+CLI&cost=unknown&highCost=1");
    expect(getSavedViews().custom).toEqual([saved]);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM saved_views").get()
    ).toEqual({ count: 1 });

    deleteSavedView(saved.id);
    expect(getSavedViews().custom).toEqual([]);
  });

  it("rejects blank names and unsupported filter values before writing", async () => {
    const { saveSavedView, sqlite } = await loadSavedViews();

    expect(() => saveSavedView({ name: " ", filters: { cost: "broken" } })).toThrow("name is required");
    expect(() => saveSavedView({ name: "Bad cost", filters: { cost: "broken" } })).toThrow("unsupported cost filter");
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM saved_views").get()
    ).toEqual({ count: 0 });
  });
});
