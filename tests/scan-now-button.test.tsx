import React from "react";
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
});
