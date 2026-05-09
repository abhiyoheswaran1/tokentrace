import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "@/components/sidebar";

describe("Sidebar version display", () => {
  it("renders the running app version in the footer", () => {
    const html = renderToStaticMarkup(<Sidebar appVersion="0.4.0" />);

    expect(html).toContain("TokenTrace version");
    expect(html).toContain("v0.4.0");
  });
});
