import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverFiles, discoverFilesWithIgnored } from "@/src/ingestion/discovery";

describe("file discovery", () => {
  it("keeps Claude project transcripts and ignores Claude support files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-discovery-"));
    try {
      const claudeRoot = path.join(tempDir, ".claude");
      const transcript = path.join(claudeRoot, "projects", "-Users-abhyoh-project", "session.jsonl");
      const cacheJson = path.join(claudeRoot, "cache", "my-closed-issues.json");
      const pluginDoc = path.join(claudeRoot, "plugins", "marketplace", "README.md");
      const todoJson = path.join(claudeRoot, "todos", "todo.json");

      await fs.mkdir(path.dirname(transcript), { recursive: true });
      await fs.mkdir(path.dirname(cacheJson), { recursive: true });
      await fs.mkdir(path.dirname(pluginDoc), { recursive: true });
      await fs.mkdir(path.dirname(todoJson), { recursive: true });

      await fs.writeFile(transcript, JSON.stringify({ type: "assistant" }) + "\n");
      await fs.writeFile(cacheJson, JSON.stringify({ cached: true }));
      await fs.writeFile(pluginDoc, "tokens model session cost");
      await fs.writeFile(todoJson, JSON.stringify({ todos: [] }));

      const files = await discoverFiles([claudeRoot]);
      const paths = files.map((file) => file.path);

      expect(paths).toEqual([transcript]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("reports ignored Claude and Codex support files separately from usage candidates", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-discovery-detail-"));
    try {
      const claudeRoot = path.join(tempDir, ".claude");
      const claudeTranscript = path.join(claudeRoot, "projects", "-Users-abhyoh-project", "session.jsonl");
      const claudeCache = path.join(claudeRoot, "cache", "my-closed-issues.json");
      const codexRoot = path.join(tempDir, ".codex");
      const codexSession = path.join(codexRoot, "sessions", "2026", "05", "09", "session.jsonl");
      const codexConfig = path.join(codexRoot, "history.json");

      await fs.mkdir(path.dirname(claudeTranscript), { recursive: true });
      await fs.mkdir(path.dirname(claudeCache), { recursive: true });
      await fs.mkdir(path.dirname(codexSession), { recursive: true });
      await fs.mkdir(path.dirname(codexConfig), { recursive: true });

      await fs.writeFile(claudeTranscript, JSON.stringify({ type: "assistant" }) + "\n");
      await fs.writeFile(claudeCache, JSON.stringify({ cached: true }));
      await fs.writeFile(codexSession, JSON.stringify({ type: "response.completed" }) + "\n");
      await fs.writeFile(codexConfig, JSON.stringify({ history: [] }));

      const discovery = await discoverFilesWithIgnored([claudeRoot, codexRoot]);

      expect(discovery.candidates.map((file) => file.path)).toEqual([claudeTranscript, codexSession]);
      expect(discovery.ignored.map((file) => [file.path, file.ignoreReason])).toEqual([
        [claudeCache, "Claude support file outside project transcripts"],
        [codexConfig, "Codex support file outside session artifacts"]
      ]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
