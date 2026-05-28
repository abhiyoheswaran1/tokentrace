import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  APPLY_MIN_CONFIDENCE_FLOOR,
  parseAutoClassifyArgs
} from "@/src/lib/unknown-cost-repair/auto-classify-cli";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-classify-apply-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function migrate(dbPath: string) {
  const result = spawnSync(process.execPath, ["bin/tokentrace.js", "doctor", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      TOKENTRACE_HOME: path.dirname(dbPath),
      TOKENTRACE_DB: dbPath
    },
    timeout: 60_000
  });
  expect(result.status, result.stderr).toBe(0);
}

function seedExactMatchScenario(sqlite: import("better-sqlite3").Database) {
  sqlite
    .prepare("INSERT OR IGNORE INTO providers (id, name, type) VALUES ('classify-openai', 'ClassifyOpenAI', 'llm-provider')")
    .run();
  sqlite
    .prepare("INSERT OR IGNORE INTO tools (id, provider_id, name) VALUES ('classify-codex', 'classify-openai', 'Classify Codex')")
    .run();
  sqlite
    .prepare(
      "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('classify-priced', 'classify-openai', 'classify-gpt-5', 2, 8, 'USD')"
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO models (id, provider_id, name, currency) VALUES ('classify-observed', 'classify-openai', 'CLASSIFY-GPT-5', 'USD')"
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('classify-session', 'classify-src', 'classify-codex', '/tmp/classify.jsonl')"
    )
    .run();
  // Seed one priced interaction so the model shows up as priced in the lookup.
  sqlite
    .prepare(
      `INSERT INTO interactions (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
       VALUES ('classify-priced-i', 'classify-priced-src', 'classify-session', 1700000000000, 'assistant', 'classify-priced', 1000, 600, 400, 'exact', 5)`
    )
    .run();
  // Seed two unknown-cost interactions on the observed (capitalized) model.
  sqlite
    .prepare(
      `INSERT INTO interactions (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
       VALUES ('classify-unknown-1', 'classify-unknown-src-1', 'classify-session', 1700000060000, 'assistant', 'classify-observed', 1000000, 1000000, 0, 'exact', NULL),
              ('classify-unknown-2', 'classify-unknown-src-2', 'classify-session', 1700000120000, 'assistant', 'classify-observed', 500000, 0, 500000, 'exact', NULL)`
    )
    .run();
}

describe("parseAutoClassifyArgs --apply gating", () => {
  it("rejects --apply without --min-confidence", () => {
    expect(() => parseAutoClassifyArgs(["--apply"])).toThrow(/--apply requires --min-confidence/);
  });

  it(`rejects --apply with --min-confidence below ${APPLY_MIN_CONFIDENCE_FLOOR}`, () => {
    expect(() =>
      parseAutoClassifyArgs(["--apply", "--min-confidence=0.5"])
    ).toThrow(/--apply requires --min-confidence >=/);
  });

  it("rejects --dry-run without --apply", () => {
    expect(() => parseAutoClassifyArgs(["--dry-run"])).toThrow(/--dry-run requires --apply/);
  });

  it("accepts --apply --min-confidence=0.9 [--dry-run]", () => {
    expect(parseAutoClassifyArgs(["--apply", "--min-confidence=0.9"])).toMatchObject({
      apply: true,
      dryRun: false,
      minConfidence: 0.9
    });
    expect(parseAutoClassifyArgs(["--apply", "--min-confidence=0.9", "--dry-run"])).toMatchObject({
      apply: true,
      dryRun: true,
      minConfidence: 0.9
    });
  });
});

describe("tokentrace repair auto-classify --apply", () => {
  it("dry-run reports aliases that would be written without changing the DB", async () => {
    const home = await tempHome();
    const dbPath = path.join(home, "tokentrace.db");
    await migrate(dbPath);

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);
    try {
      seedExactMatchScenario(db);
    } finally {
      db.close();
    }

    const result = spawnSync(
      process.execPath,
      [
        "bin/tokentrace.js",
        "repair",
        "auto-classify",
        "--apply",
        "--min-confidence=0.9",
        "--dry-run",
        "--json"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: dbPath
        },
        timeout: 60_000
      }
    );

    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.applied).toBeDefined();
    expect(parsed.applied.dryRun).toBe(true);
    expect(parsed.applied.aliasesWritten).toBeGreaterThanOrEqual(1);
    expect(parsed.applied.interactionsBackfilled).toBeGreaterThanOrEqual(2);

    const verifyDb = new Database(dbPath);
    try {
      const aliasCount = verifyDb.prepare("SELECT COUNT(*) AS n FROM model_aliases").get() as { n: number };
      expect(aliasCount.n).toBe(0);
      const unknownAfter = verifyDb
        .prepare("SELECT COUNT(*) AS n FROM interactions WHERE model_id = 'classify-observed' AND cost IS NULL")
        .get() as { n: number };
      expect(unknownAfter.n).toBe(2);
    } finally {
      verifyDb.close();
    }
  });

  it("commit writes aliases and backfills cost; second run is idempotent", async () => {
    const home = await tempHome();
    const dbPath = path.join(home, "tokentrace.db");
    await migrate(dbPath);

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);
    try {
      seedExactMatchScenario(db);
    } finally {
      db.close();
    }

    const first = spawnSync(
      process.execPath,
      [
        "bin/tokentrace.js",
        "repair",
        "auto-classify",
        "--apply",
        "--min-confidence=0.9",
        "--json"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: dbPath
        },
        timeout: 60_000
      }
    );
    expect(first.status, first.stderr).toBe(0);
    const firstParsed = JSON.parse(first.stdout);
    expect(firstParsed.applied.dryRun).toBe(false);
    expect(firstParsed.applied.aliasesWritten).toBeGreaterThanOrEqual(1);
    expect(firstParsed.applied.interactionsBackfilled).toBeGreaterThanOrEqual(2);
    expect(firstParsed.applied.totalCostBackfilled).toBeGreaterThan(0);

    const verifyDb = new Database(dbPath);
    try {
      const aliasCount = verifyDb.prepare("SELECT COUNT(*) AS n FROM model_aliases").get() as { n: number };
      expect(aliasCount.n).toBeGreaterThanOrEqual(1);
      const unknownAfter = verifyDb
        .prepare("SELECT COUNT(*) AS n FROM interactions WHERE model_id = 'classify-observed' AND cost IS NULL")
        .get() as { n: number };
      expect(unknownAfter.n).toBe(0);
    } finally {
      verifyDb.close();
    }

    // Second run: no new unknown-cost rows match (they're priced now), so backfill is 0.
    const second = spawnSync(
      process.execPath,
      [
        "bin/tokentrace.js",
        "repair",
        "auto-classify",
        "--apply",
        "--min-confidence=0.9",
        "--json"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: dbPath
        },
        timeout: 60_000
      }
    );
    expect(second.status, second.stderr).toBe(0);
    const secondParsed = JSON.parse(second.stdout);
    expect(secondParsed.applied.interactionsBackfilled).toBe(0);
  });
});
