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
