import { describe, expect, it } from "vitest";
import { buildSourceCatalog, summarizeSourceCoverage } from "@/src/lib/source-catalog";

describe("source catalog", () => {
  it("lists native, profile-assisted, and fallback import paths with next actions", () => {
    const catalog = buildSourceCatalog();

    expect(catalog.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "structured-usage-log",
        "cursor-chat-export",
        "sqlite-history",
        "generic-jsonl",
        "generic-log"
      ])
    );
    expect(catalog.entries.find((entry) => entry.id === "cursor-chat-export")).toMatchObject({
      tier: "native",
      nextAction: "scan"
    });
    expect(catalog.entries.find((entry) => entry.id === "generic-log")).toMatchObject({
      tier: "fallback",
      nextAction: "preview-profile"
    });
  });

  it("summarizes source coverage from scan-file metadata", () => {
    const coverage = summarizeSourceCoverage([
      {
        parser: "structured-usage-log",
        status: "imported",
        recordsImported: 2,
        rawMetadata: { sourceCatalog: { tier: "native" } }
      },
      {
        parser: "generic-jsonl",
        status: "imported",
        recordsImported: 1,
        rawMetadata: { importProfile: { id: "custom-team", builtIn: false } }
      },
      {
        parser: "generic-log",
        status: "skipped_unknown",
        recordsImported: 0,
        rawMetadata: {}
      }
    ]);

    expect(coverage).toMatchObject({
      nativeFiles: 1,
      profileAssistedFiles: 1,
      fallbackFiles: 1,
      importedRecords: 3
    });
  });
});
