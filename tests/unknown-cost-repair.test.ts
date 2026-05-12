import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadRepair() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-repair-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ getUnknownCostReview, saveUnknownCostReview }, { sqlite }] = await Promise.all([
    import("@/src/lib/unknown-cost-repair"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getUnknownCostReview, saveUnknownCostReview, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("unknown cost repair state", () => {
  it("persists local review state by stable repair key", async () => {
    const { getUnknownCostReview, saveUnknownCostReview } = await loadRepair();

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toEqual({
      key: "missing-pricing:Anthropic:claude-new",
      state: "unresolved",
      note: "",
      updatedAt: null
    });

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-new",
      state: "ignored",
      note: "Internal experimental model, not priced yet."
    });

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toMatchObject({
      key: "missing-pricing:Anthropic:claude-new",
      state: "ignored",
      note: "Internal experimental model, not priced yet."
    });
    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new").updatedAt).toEqual(expect.any(Number));
  });
});
