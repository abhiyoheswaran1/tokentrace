import { describe, expect, it } from "vitest";
import { preflightImportSessions } from "@/src/ingestion/persist-guardrails";
import { importSessions } from "@/src/ingestion/persist";
import type { NormalizedSession } from "@/src/ingestion/types";

function session(patch: Partial<NormalizedSession> = {}): NormalizedSession {
  return {
    externalId: patch.externalId ?? "session-1",
    provider: patch.provider ?? { id: "openai", name: "OpenAI", type: "llm-provider" },
    tool: patch.tool ?? { id: "codex-cli", name: "Codex CLI" },
    projectPath: patch.projectPath ?? "/tmp/tokentrace",
    title: patch.title ?? "Codex session",
    sourceFile: patch.sourceFile ?? "/tmp/codex.jsonl",
    interactions: patch.interactions ?? [
      {
        externalId: "interaction-1",
        role: "assistant",
        modelName: "gpt-5.5",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        estimatedTokens: false
      }
    ]
  };
}

describe("ingestion persistence guardrails", () => {
  it("surfaces empty parser output as a recovery warning instead of a silent no-op", () => {
    expect(preflightImportSessions([]).warnings).toContain(
      "No normalized sessions were provided for import; check parser warnings or malformed local files."
    );
    expect(importSessions([]).warnings).toContain(
      "No normalized sessions were provided for import; check parser warnings or malformed local files."
    );
  });

  it("diagnoses duplicate normalized sessions before INSERT OR IGNORE drops rows", () => {
    expect(preflightImportSessions([session({ externalId: "same" }), session({ externalId: "same" })]).warnings).toContain(
      "Duplicate normalized sessions detected for codex-cli / /tmp/codex.jsonl / same; import keeps the first copy and ignores later duplicates."
    );
  });

  it("warns when replaceSourceFile does not match parsed source files", () => {
    expect(
      preflightImportSessions(
        [session({ sourceFile: "/tmp/other.jsonl" })],
        { replaceSourceFile: "/tmp/codex.jsonl" }
      ).warnings
    ).toContain(
      "Replace requested for /tmp/codex.jsonl, but parsed sessions came from /tmp/other.jsonl. Existing rows for the parsed file will not be purged."
    );
  });
});
