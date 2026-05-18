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
    expect(html).toContain("bg-primary/10");
    expect(html).toContain("text-primary");
  });

  it("marks nested routes through the owning mobile navigation item", () => {
    currentPath = "/sessions/session-1";
    const html = renderToStaticMarkup(<MobileNav />);

    expect(html).toContain('href="/sessions"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("shadow-sm");
  });
});
