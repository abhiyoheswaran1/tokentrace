import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRunScan() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-scan-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  const scanDir = path.join(tempDir, "scan-root");
  await fs.mkdir(scanDir);
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ runScan }, { importSessions }, { sqlite }] = await Promise.all([
    import("@/src/ingestion/scan"),
    import("@/src/ingestion/persist"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { importSessions, runScan, scanDir, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("runScan result messages", () => {
  it("keeps existing source sessions when a replacement import fails", async () => {
    const { importSessions, sqlite } = await loadRunScan();
    const sourceFile = path.join(os.tmpdir(), "tokentrace-existing-source.jsonl");

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'codex-cli', 'project-1', ?)")
      .run(sourceFile);
    sqlite
      .prepare("INSERT INTO interactions (id, source_id, session_id, role, total_tokens) VALUES ('interaction-1', 'interaction-source-1', 'session-1', 'assistant', 42)")
      .run();

    expect(() =>
      importSessions(
        [
          {
            externalId: "replacement",
            sourceFile: path.join(os.tmpdir(), "tokentrace-missing-replacement.jsonl"),
            provider: { id: "openai", name: "OpenAI", type: "llm-provider" },
            tool: { id: "codex-cli", name: "Codex CLI" },
            title: "Replacement that cannot infer a project",
            interactions: []
          }
        ],
        { replaceSourceFile: sourceFile }
      )
    ).toThrow();

    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM sessions WHERE source_file = ?").get(sourceFile)).toEqual({
      count: 1
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM interactions WHERE session_id = 'session-1'").get()).toEqual({
      count: 1
    });
  });

  it("includes skipped unknown files in the returned error summary", async () => {
    const { runScan, scanDir } = await loadRunScan();
    const filePath = path.join(scanDir, "usage.sqlite");
    await fs.writeFile(filePath, "not a supported token log");

    const result = await runScan({ folders: [scanDir], includeDefaults: false });

    expect(result.filesScanned).toBe(1);
    expect(result.recordsImported).toBe(0);
    expect(result.errors).toEqual([
      `${filePath}: No parser detected a compatible format.`
    ]);
  });

  it("includes skipped duplicate files in the returned warning summary", async () => {
    const { runScan } = await loadRunScan();
    const fixturePath = path.join(process.cwd(), "fixtures", "generic-jsonl", "sample.jsonl");

    const first = await runScan({ folders: [fixturePath], includeDefaults: false });
    const second = await runScan({ folders: [fixturePath], includeDefaults: false });

    expect(first.recordsImported).toBe(2);
    expect(second.recordsImported).toBe(0);
    expect(second.warnings).toEqual([
      `${fixturePath}: File hash already imported. Use force rescan to parse again.`
    ]);
  });

  it("records ignored non-usage files without treating them as scan errors", async () => {
    const { runScan, scanDir } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".claude", "projects", "-Users-abhyoh-project", "session.jsonl");
    const ignoredPath = path.join(scanDir, ".claude", "cache", "my-closed-issues.json");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.mkdir(path.dirname(ignoredPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
        usage: { input_tokens: 10, output_tokens: 20 }
      }) + "\n"
    );
    await fs.writeFile(ignoredPath, JSON.stringify({ cached: true }));

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const rows = activeSqlite
      ?.prepare("SELECT path, status, raw_metadata AS rawMetadata FROM scan_files ORDER BY path")
      .all() as Array<{ path: string; status: string; rawMetadata: string }>;

    expect(result.filesScanned).toBe(2);
    expect(result.errors).toEqual([]);
    expect(rows.map((row) => [row.path, row.status])).toEqual([
      [ignoredPath, "ignored_non_usage"],
      [transcriptPath, "imported"]
    ]);
    expect(JSON.parse(rows[0].rawMetadata)).toMatchObject({
      ignoreReason: "Claude support file outside project transcripts"
    });
  });

  it("records bundled parser provenance for imported usage files", async () => {
    const { runScan, scanDir } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".claude", "projects", "-Users-abhyoh-project", "session.jsonl");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
        usage: { input_tokens: 10, output_tokens: 20 }
      }) + "\n"
    );

    await runScan({ folders: [scanDir], includeDefaults: false });
    const rows = activeSqlite
      ?.prepare("SELECT parser, raw_metadata AS rawMetadata FROM scan_files WHERE path = ?")
      .all(transcriptPath) as Array<{ parser: string; rawMetadata: string }>;

    expect(rows[0].parser).toBe("claude-code");
    expect(JSON.parse(rows[0].rawMetadata)).toMatchObject({
      parser: {
        id: "claude-code",
        displayName: "Claude Code",
        source: "bundled",
        version: 2
      }
    });
  });

  it("imports large Codex session artifacts instead of dropping them at discovery", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".codex", "sessions", "2026", "05", "13", "session.jsonl");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      [
        JSON.stringify({
          type: "session_meta",
          payload: { id: "codex-large-session", cwd: "/repo/tokentrace" }
        }),
        JSON.stringify({
          type: "turn_context",
          payload: { model: "gpt-5.5" }
        }),
        JSON.stringify({
          timestamp: "2026-05-13T06:00:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: {
                input_tokens: 1000,
                cached_input_tokens: 700,
                output_tokens: 100,
                reasoning_output_tokens: 40,
                total_tokens: 1100
              }
            }
          }
        })
      ].join("\n") + "\n"
    );
    await fs.truncate(transcriptPath, 26 * 1024 * 1024);

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const interaction = sqlite
      .prepare(
        `SELECT input_tokens AS inputTokens, cache_read_tokens AS cacheReadTokens,
          output_tokens AS outputTokens, reasoning_tokens AS reasoningTokens,
          total_tokens AS totalTokens
         FROM interactions`
      )
      .get() as
      | {
          inputTokens: number;
          cacheReadTokens: number;
          outputTokens: number;
          reasoningTokens: number;
          totalTokens: number;
        }
      | undefined;

    expect(result.recordsImported).toBe(1);
    expect(result.errors).toEqual([]);
    expect(interaction).toMatchObject({
      inputTokens: 1000,
      cacheReadTokens: 700,
      outputTokens: 60,
      reasoningTokens: 40,
      totalTokens: 1800
    });
  });

  it("imports large Claude project transcripts instead of dropping them at discovery", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".claude", "projects", "-repo-tokentrace", "session.jsonl");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
        usage: {
          input_tokens: 300,
          cache_read_input_tokens: 700,
          output_tokens: 100
        }
      }) + "\n"
    );
    await fs.truncate(transcriptPath, 26 * 1024 * 1024);

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const interaction = sqlite
      .prepare(
        `SELECT input_tokens AS inputTokens, cache_read_tokens AS cacheReadTokens,
          output_tokens AS outputTokens, total_tokens AS totalTokens
         FROM interactions`
      )
      .get() as
      | {
          inputTokens: number;
          cacheReadTokens: number;
          outputTokens: number;
          totalTokens: number;
        }
      | undefined;

    expect(result.recordsImported).toBe(1);
    expect(result.errors).toEqual([]);
    expect(interaction).toMatchObject({
      inputTokens: 300,
      cacheReadTokens: 700,
      outputTokens: 100,
      totalTokens: 1100
    });
  });

  it("persists OpenAI-style cached and reasoning details without double-counting", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const filePath = path.join(scanDir, "openai.jsonl");

    await fs.writeFile(
      filePath,
      JSON.stringify({
        session_id: "openai-session",
        model: "gpt-5.5",
        usage: {
          input_tokens: 1000,
          input_tokens_details: { cached_tokens: 700 },
          output_tokens: 200,
          output_tokens_details: { reasoning_tokens: 60 },
          total_tokens: 1200
        }
      }) + "\n"
    );

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const interaction = sqlite
      .prepare(
        `SELECT input_tokens AS inputTokens, cache_read_tokens AS cacheReadTokens,
          output_tokens AS outputTokens, reasoning_tokens AS reasoningTokens,
          total_tokens AS totalTokens
         FROM interactions`
      )
      .get() as
      | {
          inputTokens: number;
          cacheReadTokens: number;
          outputTokens: number;
          reasoningTokens: number;
          totalTokens: number;
        }
      | undefined;

    expect(result.recordsImported).toBe(1);
    expect(result.errors).toEqual([]);
    expect(interaction).toMatchObject({
      inputTokens: 300,
      cacheReadTokens: 700,
      outputTokens: 140,
      reasoningTokens: 60,
      totalTokens: 1200
    });
  });

  it("reprocesses stale parser-version imports and replaces old source-file rows", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const { hashContent } = await import("@/src/lib/ids");
    const transcriptPath = path.join(scanDir, ".codex", "sessions", "2026", "05", "13", "session.jsonl");
    const content = [
      JSON.stringify({
        type: "session_meta",
        payload: { id: "codex-stale-version", cwd: "/repo/tokentrace" }
      }),
      JSON.stringify({
        type: "turn_context",
        payload: { model: "gpt-5.5" }
      }),
      JSON.stringify({
        timestamp: "2026-05-13T06:00:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 1000,
              cached_input_tokens: 700,
              output_tokens: 100,
              reasoning_output_tokens: 40,
              total_tokens: 1100
            }
          }
        }
      })
    ].join("\n") + "\n";

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(transcriptPath, content);

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('old-session', 'old-source', 'codex-cli', ?)"
      )
      .run(transcriptPath);
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, input_tokens, total_tokens, token_confidence)
         VALUES ('old-interaction', 'old-interaction-source', 'old-session', 'assistant', 4, 4, 'low-confidence estimate')`
      )
      .run();
    sqlite
      .prepare("INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported) VALUES ('old-scan', 1, 2, 1, 1)")
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, modified_time, size_bytes, file_hash, parser, status,
           records_imported, warnings, errors, raw_metadata)
         VALUES ('old-scan-file', 'old-scan', ?, 1, ?, ?, 'codex-cli', 'imported', 1, '[]', '[]', ?)`
      )
      .run(
        transcriptPath,
        Buffer.byteLength(content),
        hashContent(content),
        JSON.stringify({ parser: { id: "codex-cli", version: 2 } })
      );

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const interactions = sqlite
      .prepare(
        `SELECT input_tokens AS inputTokens, cache_read_tokens AS cacheReadTokens,
          output_tokens AS outputTokens, reasoning_tokens AS reasoningTokens,
          total_tokens AS totalTokens
         FROM interactions`
      )
      .all() as Array<{
        inputTokens: number;
        cacheReadTokens: number;
        outputTokens: number;
        reasoningTokens: number;
        totalTokens: number;
      }>;

    expect(result.recordsImported).toBe(1);
    expect(result.warnings).not.toContain(
      `${transcriptPath}: File hash already imported. Use force rescan to parse again.`
    );
    expect(interactions).toEqual([
      {
        inputTokens: 1000,
        cacheReadTokens: 700,
        outputTokens: 60,
        reasoningTokens: 40,
        totalTokens: 1800
      }
    ]);
  });

  it("reuses an existing project row when the path already exists with a legacy id", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".codex", "sessions", "2026", "05", "13", "session.jsonl");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      [
        JSON.stringify({
          type: "session_meta",
          payload: { id: "codex-legacy-project", cwd: "/repo/tokentrace" }
        }),
        JSON.stringify({
          timestamp: "2026-05-13T06:00:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: {
                input_tokens: 100,
                cached_input_tokens: 40,
                output_tokens: 10,
                total_tokens: 110
              }
            }
          }
        })
      ].join("\n") + "\n"
    );
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('legacy-project', 'Legacy', '/repo/tokentrace')").run();

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const session = sqlite
      .prepare("SELECT project_id AS projectId FROM sessions WHERE source_file = ?")
      .get(transcriptPath) as { projectId: string } | undefined;

    expect(result.errors).toEqual([]);
    expect(result.recordsImported).toBe(1);
    expect(session?.projectId).toBe("legacy-project");
  });

  it("purges previously imported sessions from paths now classified as non-usage support files", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const stalePath = path.join(scanDir, ".claude", "plugins", "marketplace", "README.md");

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('generic', 'Generic', 'local-log')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('generic-log', 'generic', 'Generic Log')").run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('stale-session', 'stale-source', 'generic-log', ?)")
      .run(stalePath);
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, total_tokens, token_confidence)
         VALUES ('stale-interaction', 'stale-interaction-source', 'stale-session', 'assistant', 100, 'low-confidence estimate')`
      )
      .run();

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const sessions = sqlite.prepare("SELECT id FROM sessions").all();

    expect(result.staleNonUsageSessionsRemoved).toBe(1);
    expect(sessions).toEqual([]);
    expect(result.warnings).toContain(
      "Removed 1 previously imported session from paths now classified as non-usage support files."
    );
  });
});
