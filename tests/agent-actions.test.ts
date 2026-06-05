import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load(env: Record<string, string> = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-agent-actions-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  vi.resetModules();
  const [actions, { sqlite }] = await Promise.all([
    import("@/src/lib/agent-actions"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...actions, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
  delete process.env.TOKENTRACE_AGENT_ACTION_LOG_MAX;
});

describe("agent action log", () => {
  it("records a CLI action and reads it back via listAgentActions", async () => {
    const { recordAgentAction, listAgentActions } = await load();

    recordAgentAction({
      surface: "cli",
      command: "scan",
      outcome: "ok",
      summary: "imported 12 records from 4 files"
    });

    const rows = listAgentActions();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      surface: "cli",
      command: "scan",
      outcome: "ok",
      summary: "imported 12 records from 4 files",
      payload: {}
    });
    expect(rows[0]!.ts).toBeTruthy();
    expect(typeof rows[0]!.id).toBe("number");
  });

  it("records optional payload", async () => {
    const { recordAgentAction, listAgentActions } = await load();
    recordAgentAction({
      surface: "mcp",
      command: "get_status",
      outcome: "ok",
      summary: "returned local status",
      payload: { sessionCount: 7 }
    });
    const [row] = listAgentActions();
    expect(row).toBeDefined();
    expect(row!.payload).toEqual({ sessionCount: 7 });
  });

  it("returns rows in newest-first order", async () => {
    const { recordAgentAction, listAgentActions } = await load();

    recordAgentAction({ surface: "cli", command: "scan", outcome: "ok", summary: "first" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    recordAgentAction({ surface: "cli", command: "doctor", outcome: "ok", summary: "second" });

    const rows = listAgentActions();
    expect(rows.map((row) => row.summary)).toEqual(["second", "first"]);
  });

  it("respects --limit", async () => {
    const { recordAgentAction, listAgentActions } = await load();
    for (let index = 0; index < 5; index += 1) {
      recordAgentAction({
        surface: "cli",
        command: "noop",
        outcome: "ok",
        summary: `entry ${index}`
      });
    }
    expect(listAgentActions({ limit: 3 })).toHaveLength(3);
  });

  it("enforces a bounded retention configurable via env", async () => {
    const { recordAgentAction, listAgentActions } = await load({
      TOKENTRACE_AGENT_ACTION_LOG_MAX: "4"
    });

    for (let index = 0; index < 8; index += 1) {
      recordAgentAction({
        surface: "cli",
        command: "noop",
        outcome: "ok",
        summary: `entry ${index}`
      });
    }

    const rows = listAgentActions();
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.summary)).toEqual([
      "entry 7",
      "entry 6",
      "entry 5",
      "entry 4"
    ]);
  });

  it("redacts bearer-token-shaped strings before write", async () => {
    const { recordAgentAction, listAgentActions } = await load();
    recordAgentAction({
      surface: "mcp",
      command: "noop",
      outcome: "ok",
      summary: "Bearer sk-abc1234567890DEFGHIJklmnopqrst",
      payload: { authHeader: "Bearer sk-abc1234567890DEFGHIJklmnopqrst" }
    });

    const row = listAgentActions()[0];
    expect(row).toBeDefined();
    expect(row!.summary).not.toContain("sk-abc1234567890DEFGHIJklmnopqrst");
    expect(row!.summary).toContain("[REDACTED]");
    expect(JSON.stringify(row!.payload)).not.toContain("sk-abc1234567890DEFGHIJklmnopqrst");
  });

  it("never throws even if the DB is unavailable", async () => {
    const { safeRecordAgentAction } = await load();
    activeSqlite?.close(); // simulate DB closed mid-flight

    expect(() =>
      safeRecordAgentAction({
        surface: "cli",
        command: "scan",
        outcome: "ok",
        summary: "after close"
      })
    ).not.toThrow();
  });
});
