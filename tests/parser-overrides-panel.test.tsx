import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParserOverridesPanel } from "@/components/parser-debug/parser-overrides-panel";
import { adapters } from "@/src/ingestion/adapters";

describe("ParserOverridesPanel", () => {
  it("renders the empty state when no overrides exist", () => {
    const html = renderToStaticMarkup(
      <ParserOverridesPanel
        initialOverrides={[]}
        parsers={adapters.map((adapter) => ({ id: adapter.id, displayName: adapter.displayName }))}
      />
    );

    expect(html).toContain("No parser overrides set");
    expect(html).toContain("Add override");
  });

  it("lists existing overrides with clear controls", () => {
    const html = renderToStaticMarkup(
      <ParserOverridesPanel
        initialOverrides={[
          {
            path: "/tmp/x.jsonl",
            parserId: "generic-jsonl",
            excluded: false,
            note: null,
            createdAt: "2026-05-23T00:00:00.000Z",
            updatedAt: "2026-05-23T00:00:00.000Z"
          },
          {
            path: "/tmp/skip.jsonl",
            parserId: null,
            excluded: true,
            note: "binary",
            createdAt: "2026-05-23T00:00:00.000Z",
            updatedAt: "2026-05-23T00:00:00.000Z"
          }
        ]}
        parsers={adapters.map((adapter) => ({ id: adapter.id, displayName: adapter.displayName }))}
      />
    );

    expect(html).toContain("/tmp/x.jsonl");
    expect(html).toContain("generic-jsonl");
    expect(html).toContain("/tmp/skip.jsonl");
    expect(html).toContain("Excluded");
    expect(html).toContain("binary");
    // Two clear buttons, one per row.
    const clearMatches = html.match(/Clear/g) ?? [];
    expect(clearMatches.length).toBeGreaterThanOrEqual(2);
  });
});
