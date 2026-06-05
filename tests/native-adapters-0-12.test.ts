import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cursorChatAdapter } from "@/src/ingestion/adapters/cursor-chat";
import { structuredUsageLogAdapter } from "@/src/ingestion/adapters/structured-usage-log";
import type { FileCandidate } from "@/src/ingestion/types";

const tempDirs: string[] = [];

async function tempFile(name: string, content: string): Promise<FileCandidate> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-native-adapter-"));
  tempDirs.push(dir);
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content);
  const stat = await fs.stat(filePath);
  return {
    path: filePath,
    modifiedTime: stat.mtime,
    sizeBytes: stat.size
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("0.12 native source adapters", () => {
  it("imports structured local usage logs with source-provided costs", async () => {
    const file = await tempFile(
      "team-ai-usage.jsonl",
      `${JSON.stringify({
        type: "ai.usage",
        session_id: "team-session-1",
        id: "event-1",
        timestamp: "2026-05-19T08:00:00.000Z",
        provider: "OpenAI",
        tool: "Team Wrapper",
        cwd: "/repo/token-usage",
        role: "assistant",
        model: "gpt-5.4",
        content: "Private answer text should only be previewed.",
        usage: {
          input_tokens: 120,
          output_tokens: 45,
          cache_read_input_tokens: 30
        },
        cost_usd: 0.42
      })}\n`
    );

    await expect(structuredUsageLogAdapter.detect(file)).resolves.toMatchObject({
      detected: true,
      confidence: expect.any(Number)
    });

    const result = await structuredUsageLogAdapter.parse(file, { storeRawMessageContent: false });

    expect(result.errors).toEqual([]);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      externalId: "team-session-1",
      provider: { id: "openai", name: "OpenAI" },
      tool: { id: "team-wrapper", name: "Team Wrapper" },
      projectPath: "/repo/token-usage"
    });
    expect(result.sessions[0]!.interactions[0]).toMatchObject({
      modelName: "gpt-5.4",
      totalTokens: 195,
      tokenConfidence: "exact",
      costUsd: 0.42
    });
    expect(result.sessions[0]!.interactions[0]!.rawText).toBeNull();
  });

  it("imports Cursor-style chat exports as native local source evidence", async () => {
    const file = await tempFile(
      "cursor-chat-export.json",
      JSON.stringify({
        conversations: [
          {
            id: "cursor-session-1",
            title: "Refactor plan",
            workspacePath: "/repo/token-usage",
            messages: [
              {
                id: "msg-1",
                role: "assistant",
                createdAt: "2026-05-19T09:00:00.000Z",
                modelName: "claude-4-opus",
                text: "Private Cursor export message.",
                usage: {
                  prompt_tokens: 50,
                  completion_tokens: 75
                }
              }
            ]
          }
        ]
      })
    );

    await expect(cursorChatAdapter.detect(file)).resolves.toMatchObject({
      detected: true,
      confidence: expect.any(Number)
    });

    const result = await cursorChatAdapter.parse(file, { storeRawMessageContent: false });

    expect(result.errors).toEqual([]);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      externalId: "cursor-session-1",
      provider: { id: "cursor", name: "Cursor" },
      tool: { id: "cursor", name: "Cursor" },
      projectPath: "/repo/token-usage",
      title: "Refactor plan"
    });
    expect(result.sessions[0]!.interactions[0]).toMatchObject({
      externalId: "msg-1",
      modelName: "claude-4-opus",
      totalTokens: 125,
      tokenConfidence: "exact"
    });
  });
});
