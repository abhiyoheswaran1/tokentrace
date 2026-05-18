import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileNav, Sidebar } from "@/components/sidebar";

function textFrom(html: string) {
  return html.replace(/<[^>]*>/g, " ");
}

function mockGuideAnalytics() {
  vi.doMock("@/src/lib/analytics", () => ({
    getScanTrustData: () => ({
      pricedModelCount: 42,
      health: {
        latestRun: {
          id: "scan-1",
          startedAt: 1000,
          completedAt: 2000,
          filesScanned: 12,
          recordsImported: 7,
          warnings: [],
          errors: []
        },
        costCoverage: {
          unknown: 3
        },
        latestWarnings: [],
        latestErrors: []
      }
    })
  }));
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@/src/lib/analytics");
});

describe("Guide page", () => {
  it("documents setup, daily use, status line labels, privacy, and troubleshooting", async () => {
    mockGuideAnalytics();
    const { default: GuidePage } = await import("@/app/guide/page");
    const html = renderToStaticMarkup(<GuidePage />);
    const text = textFrom(html);

    expect(text).toContain("TokenTrace Guide");
    expect(text).toContain("Your setup status");
    expect(text).toContain("7 records");
    expect(text).toContain("3 unknown costs");
    expect(text).toContain("42 priced models");
    expect(text).toContain("First-run guided setup");
    expect(text).toContain("Run your first scan");
    expect(text).toContain("Agent discovery");
    expect(text).toContain("Agent quickstart");
    expect(text).toContain("Mutates local state");
    expect(text).toContain("tokentrace agent --json");
    expect(text).toContain("tokentrace capabilities --json");
    expect(text).toContain("TOKENTRACE_AGENT.md");
    expect(text).toContain("docs/agent-discovery.schema.json");
    expect(text).toContain("/api/agent");
    expect(text).toContain("/api/capabilities");
    expect(text).toContain("tokentrace roadmap --json");
    expect(text).toContain("/api/roadmap");
    expect(text).toContain("Release readiness");
    expect(text).toContain("releaseAllowed: true");
    expect(text).toContain("npm run release:check");
    expect(text).toContain("tokentrace statusline setup claude");
    expect(text).toContain("ctx");
    expect(text).toContain("processed");
    expect(text).toContain("cache");
    expect(text).toContain("No telemetry");
    expect(text).toContain("Unknown cost");
    expect(text).toContain("Parser warnings");
    expect(text).toContain("No logs found");
    expect(text).toContain("Sandbox smoke skipped");
  });

  it("adds Guide to desktop and mobile navigation", () => {
    const desktop = renderToStaticMarkup(<Sidebar appVersion="0.10.0" />);
    const mobile = renderToStaticMarkup(<MobileNav />);

    expect(desktop).toContain('href="/guide"');
    expect(textFrom(desktop)).toContain("Guide");
    expect(mobile).toContain('href="/guide"');
    expect(textFrom(mobile)).toContain("Guide");
  });
});
