# TokenTrace Website Update Prompt

Use this to update `https://www.abhiyoheswaran.com/apps/tokentrace` so the website matches the current app and README.

## Positioning

TokenTrace is local-first AI CLI usage analytics for developers using Claude Code, Codex, OpenAI, and other local AI CLI tools.

Primary message:

> Local-first AI CLI usage analytics.

Supporting copy:

> TokenTrace scans local AI CLI artifacts, normalizes token usage, estimates missing counts when necessary, and shows cost, model, project, session, parser, and repair evidence in a local dashboard. No cloud account, no telemetry, no proxying.

0.13.0 release message:

> Product polish and performance: faster first dashboard loads, clearer repair guidance, mobile card layouts for Repair and Model Rates, denser Session Explorer filtering, lazy Settings sections, stronger first-run setup, clearer CLI startup, and automated browser guardrails for console errors, blank charts, and mobile overflow.

0.14.0 release message:

> MCP-ready local analytics: TokenTrace now ships `tokentrace mcp`, a local stdio MCP server for capabilities, status, Scan Health, evidence, repair queue, reports, and explicit local scans with `confirmLocalScan=true`.

0.14.2 agent adoption and stabilization message:

> Agent-ready MCP adoption: TokenTrace is published as `io.github.abhiyoheswaran1/tokentrace`, exposes `get_agent_guide` as the first MCP call, returns agent-decisive response metadata, includes `tokentrace mcp selftest --json` for local validation without scanning files, and keeps data-backed CLI help safe on fresh or broken local databases.

0.15.0 platform & dependency hardening message:

> Platform and dependency hardening: TokenTrace now requires Node.js 20+ (Node 18 reached end of life), ships on a refreshed dependency stack (`better-sqlite3` v12, `lucide-react` v1, `open` v11), uses proper SQLite identifier quoting when reading user history databases, ships an explicit `eslint-plugin-react-hooks` so a clean install never breaks lint, and stabilizes CLI subprocess tests so flaky timeouts no longer block releases.

## Screenshots

Use the latest refreshed screenshots from this repo:

- `docs/assets/overview-0.12.0.png`
- `docs/assets/evidence-0.12.0.png`
- `docs/assets/repair-0.12.0.png`
- `docs/assets/scan-health-0.12.0.png`

## Sections

1. Hero: TokenTrace, local-first AI CLI usage analytics, `npx tokentrace`.
2. Evidence-first overview: pulse, token accounting, model rates, and trend charts.
3. Faster overview: trend aggregation avoids slow localtime bucketing, and overview data loading focuses on the first screen.
4. Local Sources & Trust: structured usage logs, Cursor-style chat exports, SQLite histories, source coverage, and Data Confidence.
5. Evidence Packs: JSON and Markdown exports with totals, confidence drivers, parser notes, model-rate state, and no raw prompts by default.
6. Scan Health: explain files checked, parser warnings, ignored support files, cost coverage, scheduling, and package IOC checks.
7. Repair workflow: top cause, next best repair, what changes after repair, resolved/ignored/parser-review states, and before/after repair deltas.
8. Mobile workflow polish: compact navigation plus card layouts for narrow Repair and Model Rates views.
9. Agent-ready entry points: `tokentrace agent --json`, `tokentrace capabilities --json`, `/api/agent`, `tokentrace roadmap --json`, and `docs/agent-adoption.md`.
10. MCP entry point: registry name `io.github.abhiyoheswaran1/tokentrace`, `tokentrace mcp` for local stdio clients, `get_agent_guide` as the first tool call, `tokentrace mcp selftest --json`, no scan on startup, and explicit scan confirmation.
11. Privacy: local files stay local; model-rate refresh fetches public rate data only.

## Copy Rules

- Use `Model Rates`, not `Pricing`.
- Use `Scan Health`, not health check or scan doctor.
- Use `Parsers`, not Parser Debug.
- Use `Insights`, not Usage Intelligence.
- Mention that processed tokens are cumulative processed usage, not current context size.
