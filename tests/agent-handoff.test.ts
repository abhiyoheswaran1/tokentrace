import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-handoff-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [handoff, actions, { sqlite }] = await Promise.all([
    import("@/src/lib/handoff"),
    import("@/src/lib/agent-actions"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...handoff, ...actions, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("agent handoff envelope", () => {
  it("returns the v1 schema with the required top-level keys", async () => {
    const { buildHandoffEnvelope } = await load();
    const envelope = buildHandoffEnvelope();

    expect(envelope.$schema).toBe("tokentrace.handoff.v1");
    expect(envelope.generatedAt).toBeTruthy();
    expect(envelope.scan).toBeDefined();
    expect(envelope.repairQueue).toBeDefined();
    expect(envelope.confidence).toBeDefined();
    expect(envelope.recentActions).toEqual(expect.any(Array));
    expect(envelope.suggestedNextActions).toEqual(expect.any(Array));
  });

  it("includes the most recent agent actions (newest first, capped)", async () => {
    const { buildHandoffEnvelope, recordAgentAction } = await load();

    for (let index = 0; index < 25; index += 1) {
      recordAgentAction({
        surface: "cli",
        command: "noop",
        outcome: "ok",
        summary: `entry ${index}`
      });
    }

    const envelope = buildHandoffEnvelope();
    expect(envelope.recentActions.length).toBeLessThanOrEqual(20);
    expect(envelope.recentActions[0].summary).toBe("entry 24");
  });

  it("recommends running scan when no scan has happened yet", async () => {
    const { buildHandoffEnvelope } = await load();
    const envelope = buildHandoffEnvelope();
    expect(
      envelope.suggestedNextActions.some((action) =>
        /scan/i.test(action.label) || /scan/i.test(action.command)
      )
    ).toBe(true);
  });

  it("does not trigger a scan as a side effect", async () => {
    const { buildHandoffEnvelope, sqlite } = await load();
    const before = sqlite.prepare("SELECT COUNT(*) AS count FROM interactions").get() as { count: number };
    buildHandoffEnvelope();
    const after = sqlite.prepare("SELECT COUNT(*) AS count FROM interactions").get() as { count: number };
    expect(after.count).toBe(before.count);
  });
});
