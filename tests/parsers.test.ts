import path from "node:path";
import { describe, expect, it } from "vitest";
import { genericJsonlAdapter } from "@/src/ingestion/adapters/generic-jsonl";
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

describe("model aliases", () => {
  it("maps dated Claude model names to pricing candidates", () => {
    expect(modelNameCandidates("claude-haiku-4-5-20251001")).toContain("claude-haiku-4-5");
    expect(modelNameCandidates("claude-3-5-haiku-20241022")).toContain("claude-haiku-3-5");
  });
});

describe("provider inference", () => {
  it("maps common model names to providers", () => {
    expect(inferProviderFromModel("gemini-2.5-pro")?.id).toBe("google");
    expect(inferProviderFromModel("grok-4.3")?.id).toBe("xai");
    expect(inferProviderFromModel("deepseek-chat")?.id).toBe("deepseek");
    expect(inferProviderFromModel("mistral-large-3")?.id).toBe("mistral");
    expect(inferProviderFromModel("command-r-plus")?.id).toBe("cohere");
  });
});
