export type SupportLevel = "stable" | "best-effort" | "ignored" | "unsupported";

export type SupportMatrixItem = {
  id: string;
  label: string;
  category: "source" | "pricing" | "live" | "package" | "boundary";
  level: SupportLevel;
  description: string;
  href?: string;
};

export type SupportMatrixSummary = {
  stable: number;
  bestEffort: number;
  ignored: number;
  unsupported: number;
};

export function getSupportMatrix(): SupportMatrixItem[] {
  return [
    {
      id: "claude-code",
      label: "Claude Code project transcripts",
      category: "source",
      level: "stable",
      description: "Local .claude project JSONL transcripts are the primary supported ingestion source.",
      href: "/discovery"
    },
    {
      id: "codex-cli",
      label: "Codex CLI session artifacts",
      category: "source",
      level: "best-effort",
      description: "Codex local session artifacts are parsed defensively because the CLI format can change.",
      href: "/discovery"
    },
    {
      id: "generic-jsonl-json-log",
      label: "Generic JSONL, JSON, and text logs",
      category: "source",
      level: "best-effort",
      description: "Generic adapters import only conservative usage-shaped records and mark estimates clearly.",
      href: "/parser-debug"
    },
    {
      id: "known-support-files",
      label: "Known CLI support files",
      category: "source",
      level: "ignored",
      description: "Claude and Codex cache, plugin, todo, config, and support files are tracked as ignored non-usage files.",
      href: "/discovery"
    },
    {
      id: "editable-pricing",
      label: "Editable model pricing",
      category: "pricing",
      level: "stable",
      description: "Costs are calculated from local editable pricing rows and keep unknown causes repairable.",
      href: "/pricing"
    },
    {
      id: "claude-status-line",
      label: "Claude Code status line",
      category: "live",
      level: "stable",
      description: "Claude Code statusLine stdin JSON is supported through tokentrace statusline claude.",
      href: "/diagnostics"
    },
    {
      id: "codex-watch-fallback",
      label: "Codex terminal split watch mode",
      category: "live",
      level: "best-effort",
      description: "Codex uses tokentrace watch --session --compact until a stable native status-line contract exists.",
      href: "/diagnostics"
    },
    {
      id: "trusted-npm-package",
      label: "Trusted npm package release",
      category: "package",
      level: "stable",
      description: "Releases use GitHub Trusted Publishing, no install scripts, package inspection, and production audit checks.",
      href: "/settings"
    },
    {
      id: "desktop-apps",
      label: "Desktop app scraping",
      category: "boundary",
      level: "unsupported",
      description: "TokenTrace intentionally does not scrape ChatGPT, Claude Desktop, browser, or other app data."
    },
    {
      id: "network-capture",
      label: "Proxy, packet capture, and telemetry",
      category: "boundary",
      level: "unsupported",
      description: "TokenTrace does not inspect network traffic, run a proxy, capture packets, or send telemetry."
    }
  ];
}

export function summarizeSupportMatrix(items: SupportMatrixItem[]): SupportMatrixSummary {
  return items.reduce<SupportMatrixSummary>(
    (summary, item) => {
      if (item.level === "stable") summary.stable += 1;
      if (item.level === "best-effort") summary.bestEffort += 1;
      if (item.level === "ignored") summary.ignored += 1;
      if (item.level === "unsupported") summary.unsupported += 1;
      return summary;
    },
    { stable: 0, bestEffort: 0, ignored: 0, unsupported: 0 }
  );
}
