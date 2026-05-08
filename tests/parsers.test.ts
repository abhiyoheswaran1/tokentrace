import path from "node:path";
import { describe, expect, it } from "vitest";
import { genericJsonlAdapter } from "@/src/ingestion/adapters/generic-jsonl";

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
