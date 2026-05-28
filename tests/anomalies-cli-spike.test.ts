import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-anomalies-spike-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function dayAt(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

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

function seedSpike(sqlite: Database.Database) {
  sqlite
    .prepare("INSERT OR IGNORE INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')")
    .run();
  sqlite
    .prepare("INSERT OR IGNORE INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')")
    .run();
  sqlite
    .prepare(
      "INSERT OR IGNORE INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('anomaly-spike-model', 'openai', 'spike-model', 1, 1, 'USD')"
    )
    .run();
  sqlite
    .prepare(
      "INSERT OR IGNORE INTO sessions (id, source_id, tool_id, source_file) VALUES ('anomaly-session', 'anomaly-source-id', 'codex-cli', '/tmp/anomaly-test.jsonl')"
    )
    .run();

  const insert = sqlite.prepare(
    `INSERT INTO interactions
       (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
     VALUES (?, ?, 'anomaly-session', ?, 'assistant', 'anomaly-spike-model', ?, 0, 0, 'exact', ?)`
  );

  // 14 baseline days alternating 90 / 110 tokens (median=100, MAD=10).
  for (let i = 0; i < 14; i += 1) {
    const tokens = i % 2 === 0 ? 90 : 110;
    insert.run(`anomaly-i-${i}`, `anomaly-src-${i}`, dayAt(2026, 5, i + 1), tokens, tokens * 0.01);
  }
  // Spike day at value 1000 — z ≈ 60, severe.
  insert.run("anomaly-i-spike", "anomaly-src-spike", dayAt(2026, 5, 15), 1000, 10);
}

describe("tokentrace anomalies CLI detects a planted spike", () => {
  it("returns the planted spike date with severity='severe'", async () => {
    const home = await tempHome();
    const dbPath = path.join(home, "tokentrace.db");

    await migrate(dbPath);

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);
    try {
      seedSpike(db);
    } finally {
      db.close();
    }

    const result = spawnSync(
      process.execPath,
      ["bin/tokentrace.js", "anomalies", "--json"],
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
    expect(parsed.summary.total).toBeGreaterThan(0);
    const spike = parsed.anomalies.find(
      (entry: { date: string; metric: string }) =>
        entry.date === "2026-05-15" && entry.metric === "tokens"
    );
    expect(spike, "expected the planted spike on 2026-05-15 to be detected").toBeDefined();
    expect(spike.severity).toBe("severe");
    expect(spike.value).toBe(1000);
  });
});
