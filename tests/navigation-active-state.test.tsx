import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MobileNav, Sidebar } from "@/components/sidebar";

let currentPath = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath
}));

describe("active navigation state", () => {
  it("marks the current desktop route without changing route URLs", () => {
    currentPath = "/repair";
    const html = renderToStaticMarkup(<Sidebar appVersion="0.10.0" />);

    expect(html).toContain('href="/repair"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("bg-muted");
    expect(html).toContain("text-primary");
  });

  it("groups desktop navigation into task areas without changing route URLs", () => {
    currentPath = "/repair";
    const html = renderToStaticMarkup(<Sidebar appVersion="0.10.0" />);
    const text = html.replace(/<[^>]*>/g, "");

    expect(text).toContain("Daily loop");
    expect(text).toContain("Operate");
    expect(text).toContain("Advanced");
    expect(text).toContain("Reference");
    expect(html).toContain('aria-label="Daily loop navigation"');
    expect(html).toContain('aria-label="Advanced navigation"');
    expect(html).toContain('href="/repair"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("bg-muted");
    expect(html).toContain("text-primary");
  });

  it("marks nested routes through the owning mobile navigation item", () => {
    currentPath = "/sessions/session-1";
    const html = renderToStaticMarkup(<MobileNav />);

    expect(html).toContain('href="/sessions"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("shadow-xs");
  });
});
