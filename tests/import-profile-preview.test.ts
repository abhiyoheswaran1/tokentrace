import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildImportProfilePreview } from "@/src/lib/import-profile-preview";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("import profile preview", () => {
  it("previews parser fit and recommended matchers without raw content", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-profile-preview-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "team-ai-usage.jsonl");
    await fs.writeFile(
      filePath,
      `${JSON.stringify({
        session_id: "session-1",
        role: "assistant",
        model: "gpt-5.4",
        content: "secret prompt content",
        usage: { input_tokens: 10, output_tokens: 5 }
      })}\n`
    );

    const preview = await buildImportProfilePreview({
      filePath,
      storeRawMessageContent: false
    });

    expect(preview).toMatchObject({
      filePath,
      detected: true,
      recommendedMatchers: expect.arrayContaining([".jsonl"]),
      fields: expect.arrayContaining(["model", "session_id", "usage"]),
      preview: {
        sessions: 1,
        interactions: 1
      }
    });
    expect(JSON.stringify(preview)).not.toContain("secret prompt content");
  });
});
