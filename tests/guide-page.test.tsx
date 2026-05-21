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
    expect(html).toContain('href="https://www.abhiyoheswaran.com/apps/tokentrace"');
    expect(text).toContain("Product website");
    expect(text).toContain("Setup status");
    expect(text).toContain("7 records");
    expect(text).toContain("3 unknown costs");
    expect(text).toContain("42 rated models");
    expect(text).toContain("Start here");
    expect(text).toContain("Daily loop");
    expect(text).toContain("Agent handoff");
    expect(text).toContain("Run your first scan");
    expect(html).toContain('aria-label="Run local scan now"');
    expect(html).not.toContain('href="/settings">Scan now');
    expect(text).toContain("Agent discovery");
    expect(text).toContain("Agent quickstart");
    expect(text).toContain("MCP for agents");
    expect(text).toContain("io.github.abhiyoheswaran1/tokentrace");
    expect(text).toContain("tokentrace mcp");
    expect(text).toContain("get_agent_guide");
    expect(text).toContain("tokentrace mcp selftest --json");
    expect(text).toContain("confirmLocalScan=true");
    expect(text).toContain("docs/agent-adoption.md");
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
    expect(html).toContain('href="#start"');
    expect(html).toContain('href="#daily-loop"');
    expect(html).toContain('href="#status-line"');
    expect(html).toContain('href="#agent-handoff"');
    expect(html).toContain('href="#troubleshooting"');
    expect(html).toContain("lg:sticky");
    expect(html).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
    expect(html).toContain("lg:max-h-[calc(100vh-2rem)]");
    expect(html).toContain("lg:overflow-y-auto");
    expect(html).not.toContain("This guide reads local scan health");
    expect(html).not.toContain("Use these pages as a local evidence trail rather than a generic dashboard");
  });

  it("places Guide in the support area instead of the primary product navigation", () => {
    const desktop = renderToStaticMarkup(<Sidebar appVersion="0.10.0" />);
    const mobile = renderToStaticMarkup(<MobileNav />);
    const desktopText = textFrom(desktop);
    const guideIndex = desktopText.indexOf("Guide");
    const settingsIndex = desktopText.indexOf("Settings");
    const versionIndex = desktopText.indexOf("v0.10.0");

    expect(desktop).toContain('aria-label="Primary navigation"');
    expect(desktop).toContain('aria-label="Help navigation"');
    expect(desktop).toContain('aria-label="Help navigation" class="p-3"');
    expect(desktop).toContain('href="/guide"');
    expect(desktop).not.toContain('aria-label="Help navigation" class="border-t');
    expect(desktopText).not.toContain("Help");
    expect(guideIndex).toBeGreaterThan(settingsIndex);
    expect(guideIndex).toBeLessThan(versionIndex);
    expect(mobile).toContain('href="/guide"');
    expect(textFrom(mobile)).toContain("Guide");
    expect(mobile).toContain('aria-label="Mobile navigation"');
  });
});
