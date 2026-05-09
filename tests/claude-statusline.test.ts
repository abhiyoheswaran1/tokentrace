import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadStatusModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-status-module-"));
  tempDirs.push(tempDir);
  process.env.TOKENTRACE_DB = path.join(tempDir, "tokentrace.db");
  process.env.DATABASE_URL = `file:${process.env.TOKENTRACE_DB}`;
  vi.resetModules();

  const [liveStatus, { sqlite }] = await Promise.all([
    import("@/src/lib/live-status"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return liveStatus;
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("Claude status line integration", () => {
  it("summarizes a Claude transcript for live session token display", async () => {
    const { summarizeClaudeTranscript } = await loadStatusModule();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-statusline-"));
    tempDirs.push(tempDir);
    const transcriptPath = path.join(tempDir, "session.jsonl");
    await fs.writeFile(
      transcriptPath,
      [
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            model: "claude-sonnet-4-5",
            usage: {
              input_tokens: 100,
              output_tokens: 30,
              cache_read_input_tokens: 400,
              cache_creation_input_tokens: 50
            }
          }
        }),
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            model: "claude-sonnet-4-5",
            usage: {
              input_tokens: 25,
              output_tokens: 15
            }
          }
        })
      ].join("\n")
    );

    const summary = await summarizeClaudeTranscript(transcriptPath);

    expect(summary).toMatchObject({
      source: "transcript",
      model: "claude-sonnet-4-5",
      interactions: 2,
      totalTokens: 620,
      cachedTokens: 450
    });
  });

  it("renders one concise Claude Code status line from mocked statusLine stdin JSON", async () => {
    const { buildClaudeStatusLine } = await loadStatusModule();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-statusline-render-"));
    tempDirs.push(tempDir);
    const transcriptPath = path.join(tempDir, "session.jsonl");
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        message: {
          model: "claude-opus-4-7",
          usage: {
            input_tokens: 1000,
            output_tokens: 250,
            cache_read_input_tokens: 2000
          }
        }
      }) + "\n"
    );

    const line = await buildClaudeStatusLine({
      model: { id: "claude-opus-4-7", display_name: "Opus" },
      transcript_path: transcriptPath,
      cost: { total_cost_usd: 0.123456 },
      context_window: {
        used_percentage: 7,
        current_usage: {
          input_tokens: 1000,
          output_tokens: 250,
          cache_read_input_tokens: 2000,
          cache_creation_input_tokens: 0
        }
      }
    });

    expect(line).toBe("TokenTrace | Opus | session 3.3K tokens | cache 2.0K | cost $0.1235 | pricing unscanned");
  });

  it("prints Claude setup instructions without mutating user settings", async () => {
    const { claudeStatusLineSetupText } = await loadStatusModule();
    expect(claudeStatusLineSetupText()).toContain("\"statusLine\"");
    expect(claudeStatusLineSetupText()).toContain("tokentrace statusline claude");
    expect(claudeStatusLineSetupText()).toContain("\"refreshInterval\": 1");
  });
});
