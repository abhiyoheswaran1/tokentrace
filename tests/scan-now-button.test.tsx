import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanNowButton } from "@/components/scan-now-button";

describe("ScanNowButton", () => {
  it("renders as a direct scan button with play icon semantics instead of a navigation link", () => {
    const html = renderToStaticMarkup(<ScanNowButton />);
    const text = html.replace(/<[^>]*>/g, " ");

    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Run local scan now"');
    expect(text).toContain("Scan now");
    expect(html).not.toContain('href="/settings"');
  });

  it("summarizes scan results with errors and model-rate follow-up links", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scan-now-button.tsx"), "utf8");

    expect(source).toContain("errors");
    expect(source).toContain("Costs recalculated");
    expect(source).toContain("Stale support imports removed");
    expect(source).toContain("Set model rate");
    expect(source).toContain("compact: true");
    expect(source).toContain("warningCount");
    expect(source).toContain("errorCount");
  });
});
