import { describe, expect, it } from "vitest";
import { buildEvidencePack, renderEvidencePackMarkdown } from "@/src/lib/evidence-pack";

describe("evidence packs", () => {
  it("exports deterministic privacy-safe evidence without raw prompt text", () => {
    const pack = buildEvidencePack({
      scope: { type: "session", id: "session-1", label: "Refactor session" },
      generatedAt: "2026-05-19T10:00:00.000Z",
      totals: {
        tokens: 125,
        cost: 0.42,
        sessions: 1,
        interactions: 1,
        unknownCostInteractions: 0
      },
      confidenceDrivers: ["1 exact interaction", "Cost covered by source-provided cost"],
      sourceFiles: ["/repo/.cursor/chat.json"],
      parserNotes: ["cursor-chat-export imported 1 record"],
      modelRateState: ["gpt-5.4 priced"],
      repairLinks: ["/repair?source=chat.json"],
      records: [
        {
          id: "interaction-1",
          role: "assistant",
          model: "gpt-5.4",
          rawText: "do not export this private prompt",
          rawTextPreview: "do not export this private prompt"
        }
      ]
    });

    expect(pack.redaction).toMatchObject({
      rawContentIncluded: false,
      rawContentPolicy: "excluded by default"
    });
    expect(JSON.stringify(pack)).not.toContain("private prompt");
    expect(pack.records[0]).toEqual({
      id: "interaction-1",
      role: "assistant",
      model: "gpt-5.4"
    });
    expect(renderEvidencePackMarkdown(pack)).toContain("# TokenTrace Evidence Pack");
    expect(renderEvidencePackMarkdown(pack)).not.toContain("private prompt");
  });
});
