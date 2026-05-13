import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { claudeCodeAdapter } from "@/src/ingestion/adapters/claude-code";
import { codexCliAdapter } from "@/src/ingestion/adapters/codex-cli";
import { genericJsonlAdapter } from "@/src/ingestion/adapters/generic-jsonl";
import { genericLogAdapter } from "@/src/ingestion/adapters/generic-log";
import { parseTimestamp } from "@/src/ingestion/adapters/helpers";
import { modelNameCandidates } from "@/src/lib/model-aliases";
import { inferProviderFromModel } from "@/src/lib/provider-inference";

describe("generic JSONL adapter", () => {
  const fixturePath = path.join(process.cwd(), "fixtures", "generic-jsonl", "sample.jsonl");

  it("detects and parses normalized sessions", async () => {
    const file = {
      path: fixturePath,
      modifiedTime: new Date("2026-01-02T10:00:04.000Z"),
      sizeBytes: 512
    };
    const detection = await genericJsonlAdapter.detect(file);
    const parsed = await genericJsonlAdapter.parse(file, { storeRawMessageContent: false });

    expect(detection.detected).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0].interactions).toHaveLength(2);
    expect(parsed.sessions[0].interactions[1].outputTokens).toBe(85);
    expect(parsed.sessions[0].interactions[1].tokenConfidence).toBe("exact");
    expect(parsed.sessions[0].interactions[1].toolCalls?.[0].name).toBe("read_file");
    expect(parsed.sessions[0].interactions[0].rawText).toBeNull();
  });

  it("does not double-count cached or reasoning details included in OpenAI-style totals", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-openai-details-"));
    try {
      const filePath = path.join(tempDir, "openai.jsonl");
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
      const stat = await fs.stat(filePath);

      const parsed = await genericJsonlAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions[0]).toMatchObject({
        inputTokens: 300,
        cacheReadTokens: 700,
        outputTokens: 140,
        reasoningTokens: 60,
        totalTokens: 1200,
        tokenConfidence: "exact"
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("generic text log adapter", () => {
  it("parses comma-formatted token counts as structured tokens", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-log-"));
    try {
      const filePath = path.join(tempDir, "usage.log");
      await fs.writeFile(
        filePath,
        "2026-01-02T10:00:00Z model: gpt-4o input_tokens: 1,234 output_tokens: 567\n"
      );
      const stat = await fs.stat(filePath);

      const parsed = await genericLogAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions[0].inputTokens).toBe(1234);
      expect(parsed.sessions[0].interactions[0].outputTokens).toBe(567);
      expect(parsed.sessions[0].interactions[0].estimatedTokens).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("parses cache and reasoning aliases in text logs without double-counting", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-log-details-"));
    try {
      const filePath = path.join(tempDir, "usage.log");
      await fs.writeFile(
        filePath,
        "2026-05-13T06:00:00Z model: gpt-5.5 input_tokens: 1,000 cached_input_tokens: 700 output_tokens: 200 reasoning_output_tokens: 60 total_tokens: 1,200\n"
      );
      const stat = await fs.stat(filePath);

      const parsed = await genericLogAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions[0]).toMatchObject({
        inputTokens: 300,
        cacheReadTokens: 700,
        outputTokens: 140,
        reasoningTokens: 60,
        totalTokens: 1200,
        estimatedTokens: false
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("parses Codex token usage summary lines with cached tokens kept separate", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-log-codex-summary-"));
    try {
      const filePath = path.join(tempDir, "codex-summary.log");
      await fs.writeFile(
        filePath,
        "Token usage: total=1,100 input=1,000 (+ 700 cached) output=100 (reasoning 40)\n"
      );
      const stat = await fs.stat(filePath);

      const parsed = await genericLogAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions[0]).toMatchObject({
        inputTokens: 1000,
        cacheReadTokens: 700,
        outputTokens: 60,
        reasoningTokens: 40,
        totalTokens: 1800,
        estimatedTokens: false
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not treat Claude support markdown as usage logs", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-support-"));
    try {
      const filePath = path.join(tempDir, ".claude", "plugins", "marketplace", "README.md");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        "This plugin mentions tokens, model, session, and cost, but it is documentation.\n"
      );
      const stat = await fs.stat(filePath);

      const detection = await genericLogAdapter.detect({
        path: filePath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });

      expect(detection.detected).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Claude Code adapter", () => {
  it("does not claim Claude cache JSON as usage data", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-cache-"));
    try {
      const filePath = path.join(tempDir, ".claude", "cache", "my-closed-issues.json");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ cached: true, notes: "not a transcript" }));
      const stat = await fs.stat(filePath);

      const detection = await claudeCodeAdapter.detect({
        path: filePath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });

      expect(detection.detected).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("detects Claude project JSONL transcripts", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-project-"));
    try {
      const filePath = path.join(tempDir, ".claude", "projects", "-Users-abhyoh-project", "session.jsonl");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        JSON.stringify({
          type: "assistant",
          message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
          usage: { input_tokens: 10, output_tokens: 20 }
        }) + "\n"
      );
      const stat = await fs.stat(filePath);

      const detection = await claudeCodeAdapter.detect({
        path: filePath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });

      expect(detection.detected).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0.9);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps valid Claude JSONL records when a transcript has a malformed line", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-claude-malformed-"));
    try {
      const filePath = path.join(tempDir, ".claude", "projects", "-Users-abhyoh-project", "session.jsonl");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        [
          JSON.stringify({
            type: "assistant",
            message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
            usage: { input_tokens: 10, output_tokens: 20 }
          }),
          "{not-json",
          JSON.stringify({
            type: "user",
            message: { role: "user", content: "please inspect this" }
          })
        ].join("\n")
      );
      const stat = await fs.stat(filePath);

      const parsed = await claudeCodeAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.warnings).toContain("Line 2 is not a JSON object.");
      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions).toHaveLength(2);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Codex CLI adapter", () => {
  it("does not claim Codex support JSON as usage data", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-codex-support-"));
    try {
      const filePath = path.join(tempDir, ".codex", "history.json");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ history: [] }));
      const stat = await fs.stat(filePath);

      const detection = await codexCliAdapter.detect({
        path: filePath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });

      expect(detection.detected).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("detects Codex session JSONL artifacts", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-codex-session-"));
    try {
      const filePath = path.join(tempDir, ".codex", "sessions", "2026", "05", "09", "session.jsonl");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ type: "response.completed", payload: { model: "gpt-5.5" } }) + "\n");
      const stat = await fs.stat(filePath);

      const detection = await codexCliAdapter.detect({
        path: filePath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });

      expect(detection.detected).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0.9);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps valid Codex JSONL records when a session has a malformed line", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-codex-malformed-"));
    try {
      const filePath = path.join(tempDir, ".codex", "sessions", "2026", "05", "09", "session.jsonl");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        [
          JSON.stringify({
            type: "response.completed",
            payload: {
              response: {
                id: "resp-1",
                model: "openai/gpt-4.1-2025-04-14",
                usage: { input_tokens: 12, output_tokens: 34 }
              }
            }
          }),
          "not json",
          JSON.stringify({
            type: "message",
            payload: { role: "user", content: "summarize this" }
          })
        ].join("\n")
      );
      const stat = await fs.stat(filePath);

      const parsed = await codexCliAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.warnings).toContain("Line 2 is not a JSON object.");
      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions[0].interactions).toHaveLength(2);
      expect(parsed.sessions[0].interactions[0].modelName).toBe("openai/gpt-4.1-2025-04-14");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("parses Codex token_count events as exact deltas without importing tool-output estimates", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-codex-token-count-"));
    try {
      const filePath = path.join(tempDir, ".codex", "sessions", "2026", "05", "13", "session.jsonl");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        [
          JSON.stringify({
            type: "session_meta",
            payload: {
              id: "codex-session-1",
              cwd: "/repo/tokentrace"
            }
          }),
          JSON.stringify({
            type: "turn_context",
            payload: {
              model: "gpt-5.5"
            }
          }),
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "function_call_output",
              output: "A large command output that should not be estimated when exact token counts exist."
            }
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
          }),
          JSON.stringify({
            timestamp: "2026-05-13T06:00:01.000Z",
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
          }),
          JSON.stringify({
            timestamp: "2026-05-13T06:00:02.000Z",
            type: "event_msg",
            payload: {
              type: "token_count",
              info: {
                total_token_usage: {
                  input_tokens: 1500,
                  cached_input_tokens: 900,
                  output_tokens: 200,
                  reasoning_output_tokens: 60,
                  total_tokens: 1700
                }
              }
            }
          })
        ].join("\n")
      );
      const stat = await fs.stat(filePath);

      const parsed = await codexCliAdapter.parse(
        {
          path: filePath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        },
        { storeRawMessageContent: false }
      );

      expect(parsed.errors).toEqual([]);
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0]).toMatchObject({
        externalId: "codex-session-1",
        projectPath: "/repo/tokentrace"
      });
      expect(parsed.sessions[0].interactions).toHaveLength(2);
      expect(parsed.sessions[0].interactions[0]).toMatchObject({
        modelName: "gpt-5.5",
        inputTokens: 300,
        cacheReadTokens: 700,
        outputTokens: 60,
        reasoningTokens: 40,
        totalTokens: 1100,
        tokenConfidence: "exact"
      });
      expect(parsed.sessions[0].interactions[1]).toMatchObject({
        inputTokens: 300,
        cacheReadTokens: 200,
        outputTokens: 80,
        reasoningTokens: 20,
        totalTokens: 600,
        tokenConfidence: "exact"
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("parser helpers", () => {
  it("treats numeric timestamp strings like numeric timestamps", () => {
    expect(parseTimestamp("1710000000")?.getTime()).toBe(1_710_000_000_000);
    expect(parseTimestamp("1710000000000")?.getTime()).toBe(1_710_000_000_000);
  });
});

describe("model aliases", () => {
  it("maps dated Claude model names to pricing candidates", () => {
    expect(modelNameCandidates("claude-haiku-4-5-20251001")).toContain("claude-haiku-4-5");
    expect(modelNameCandidates("claude-3-5-haiku-20241022")).toContain("claude-haiku-3-5");
  });

  it("maps OpenAI snapshot and provider-prefixed model names to pricing candidates", () => {
    expect(modelNameCandidates("openai/gpt-4.1-2025-04-14")).toContain("gpt-4.1");
    expect(modelNameCandidates("gpt-5.1-codex-20260110")).toContain("gpt-5.1-codex");
  });
});

describe("provider inference", () => {
  it("maps common model names to providers", () => {
    expect(inferProviderFromModel("o3")?.id).toBe("openai");
    expect(inferProviderFromModel("gemini-2.5-pro")?.id).toBe("google");
    expect(inferProviderFromModel("grok-4.3")?.id).toBe("xai");
    expect(inferProviderFromModel("deepseek-chat")?.id).toBe("deepseek");
    expect(inferProviderFromModel("mistral-large-3")?.id).toBe("mistral");
    expect(inferProviderFromModel("command-r-plus")?.id).toBe("cohere");
  });
});
