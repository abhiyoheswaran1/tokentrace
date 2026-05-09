import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "@/components/sidebar";

describe("Sidebar version display", () => {
  it("keeps privacy status near the product name and version plus credit in the footer", () => {
    const html = renderToStaticMarkup(<Sidebar appVersion="0.4.0" />);
    const text = html.replace(/<[^>]*>/g, "");

    expect(text).toContain("Local only");
    expect(text).toContain("No telemetry");
    expect(text).toContain("v0.4.0");
    expect(text).toContain("Open source by Abhi Yoheswaran.");
    expect(html).toContain('href="https://github.com/abhiyoheswaran1"');
  });
});
