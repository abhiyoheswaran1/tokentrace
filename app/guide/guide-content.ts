import { ClipboardList, Gauge, Search, Wrench } from "lucide-react";

export const PRODUCT_WEBSITE_URL = "https://www.baseframelabs.com/apps/tokentrace";

export const guideNav = [
  ["#start", "Start here", "First scan to first evidence"],
  ["#daily-loop", "Daily loop", "Where to look during normal use"],
  ["#status-line", "Claude Code status line", "ctx, cost, processed, cache"],
  ["#agent-handoff", "Agent handoff", "Machine-readable entry points"],
  ["#troubleshooting", "Troubleshooting", "Blank states and repair paths"]
];

export const dailyLoop = [
  {
    title: "Read the pulse",
    page: "Overview",
    detail: "Check current period usage, cost, sessions, unknown cost, and the latest trend window before chasing details.",
    href: "/",
    icon: Gauge
  },
  {
    title: "Open the evidence",
    page: "Evidence",
    detail: "Trace a total back to sessions, source files, parser confidence, and model-rate state.",
    href: "/evidence",
    icon: Search
  },
  {
    title: "Repair what blocks trust",
    page: "Repair",
    detail: "Unknown cost usually needs a known model name, nonzero tokens, or an editable provider model rate.",
    href: "/repair",
    icon: Wrench
  },
  {
    title: "Review Scan Health",
    page: "Scan Health",
    detail: "Use scan health when data looks stale, parser warnings appear, or a folder imported fewer records than expected.",
    href: "/diagnostics",
    icon: ClipboardList
  }
];

export const statusLineTerms = [
  {
    label: "ctx",
    meaning: "Current Claude context-window usage. Watch this when you are close to the context limit."
  },
  {
    label: "cost",
    meaning: "Claude Code's session cost value. TokenTrace displays it locally and does not recalculate that status-line cost."
  },
  {
    label: "processed",
    meaning: "Cumulative transcript usage for the current Claude session, including repeated cache reads."
  },
  {
    label: "cache",
    meaning: "Cache read and cache write tokens. A large processed total is often mostly cache activity."
  },
  {
    label: "priced",
    meaning: "Claude provided a usable status-line cost. If this says pricing repair, inspect Model Rates and Repair."
  }
];

export const agentSteps = [
  ["Discover", "tokentrace agent --json", "No", "Read capabilities, workflows, privacy rules, and guardrails."],
  ["Inspect aliases", "tokentrace capabilities --json", "No", "Return the same manifest for agents that look for capabilities first."],
  ["Import", "tokentrace scan --json", "Yes", "Refresh local usage data before making claims."],
  ["Verify", "tokentrace doctor --json", "No", "Check parser trust, model-rate coverage, scan freshness, and support status."],
  ["Explain", "tokentrace evidence --json", "No", "Trace aggregate numbers back to sessions, files, and model-rate rows."]
];

export const roadmapSteps = [
  ["Roadmap status", "tokentrace roadmap --json", "Read implemented cards, evidence paths, required checks, and release status."],
  ["Dashboard API", "/api/roadmap", "Fetch the same roadmap status from a running local dashboard."]
];

export const mcpAgentEntries = [
  ["Registry", "io.github.abhiyoheswaran1/tokentrace", "Use this name when an MCP client discovers TokenTrace from the registry."],
  ["Start", "tokentrace mcp", "Start the local stdio MCP server. Startup is read-only and does not scan files."],
  ["First tool", "get_agent_guide", "Return the recommended operating loop, install snippets, and AGENTS.md copy block."],
  ["Self-test", "tokentrace mcp selftest --json", "Verify MCP initialization, tool listing, guide output, and scan refusal."],
  ["Scan rule", "confirmLocalScan=true", "Only pass this to run_scan when the human expects a local filesystem scan."]
];

export const pageMap = [
  ["Overview", "Top-level totals, trends, repair queue, guardrails, and recommended next actions."],
  ["Sessions", "Per-session evidence with models, costs, cache activity, parser provenance, and tool calls."],
  ["Model Rates", "Editable provider model rates used for dashboard cost estimates and unknown-cost repair."],
  ["Scan Health", "First-run checklist, scan health, supply-chain IOC check, supported file types, and diagnostics for missing data."],
  ["Discovery", "Recently scanned files grouped by parser, source family, status, and import yield."],
  ["Parsers", "Adapter choices, warnings, confidence, and parser repair clues for local files."]
];

export const emptyStatePlaybook = [
  ["No data", "Run Scan now from Settings, then use Scan Health if records stay at zero."],
  ["No logs found", "Add a custom folder or use Claude Code, Codex, or another supported CLI before scanning again."],
  ["Unknown cost", "Open repair or Model Rates to decide whether the missing piece is model name, token count, or provider rate."],
  ["Parser warnings", "Open Discovery and Parsers to separate unsupported files from imported-with-errors rows."],
  ["Sandbox smoke skipped", "Local sandbox runs can skip server binding checks. Run the packed smoke or release check outside that constraint before release."]
];
