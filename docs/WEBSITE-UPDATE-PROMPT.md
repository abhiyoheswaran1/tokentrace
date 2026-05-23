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

0.15.1 platform upgrade bundle message:

> Platform upgrade bundle: TokenTrace 0.15.1 upgrades the full toolchain to Next.js 16, Tailwind CSS 4 (CSS-first `@theme` configuration), Recharts 3, Vitest 4, TypeScript 6, `tailwind-merge` 3, and the native flat ESLint config from `eslint-config-next` 16. Minimum Node.js is now 20.9.0. No user-facing behavior change; the dashboard renders the same with a faster, leaner build.

0.15.2 period filter hotfix message:

> Period filter hotfix: clicking any preset period (Today, 7 days, 30 days, 60 days, 90 days, This month, All time) on the production dashboard now navigates and filters correctly. The bug came from the preset links being rendered inside the custom-date form; Next.js 16 with React 19 was eating Link clicks inside enclosing forms. The preset links are now siblings of the form. Upgrade with `npm install -g tokentrace@latest` to pick up the fix.

0.16.0 parser overrides + saved reports + agent handoff message:

> 0.16.0 ships three local-first feature areas in one release. **Parser overrides**: force a specific parser for a file or exclude it from scans, from the dashboard or `tokentrace repair set-parser`; ingestion honors the override on the next scan, and a read-only preview endpoint shows what an alternate parser would extract before you commit. **Saved reports**: store reusable report templates locally on `/reports` and replay them with `tokentrace report --saved "<name>" --format json|markdown|html`. The standalone HTML export is XSS-safe and archivable. **Agent handoff**: the new `tokentrace agent --handoff` envelope (schema `tokentrace.handoff.v1`) and matching MCP tool `get_handoff` summarize local state and suggest next actions so multi-agent workflows can pass context cleanly. Every agent action is recorded to a bounded local log (last 500, redacts token-shaped strings, best-effort).

0.17.0 performance bundle message:

> Performance bundle: TokenTrace 0.17.0 is a pure-performance release that makes the local dashboard feel measurably snappier without changing any features. The runtime SQLite connection is now tuned for analytics (`journal_mode=WAL`, `synchronous=NORMAL`, `temp_store=MEMORY`, `cache_size=64MB`, `mmap_size=256MB`) and the hot analytics, repair, scheduled-scan, and ingestion helpers route through a process-wide prepared-statement cache so repeat queries skip the parse-and-plan cost. The overview page now runs its independent sub-queries through `Promise.all`, memoizes the fetch with `React.cache`, and streams in two `<Suspense>` boundaries — page shell and period filter paint immediately, the analytics block streams next, and the repair lane streams independently when the workbench query resolves. `TrendSection` and `RankBarChart` are lazy-loaded via `next/dynamic`, splitting the Recharts bundle out of the initial JS payload across the overview, projects, tools, and models routes. Scan rescans skip the read + SHA-256 step on files that haven't changed since the previous scan via a new `(path, size, mtime)`-keyed hash cache. Next 16 is now configured with `optimizePackageImports` for `lucide-react` and `recharts`, with an opt-in `@next/bundle-analyzer` integration gated on `ANALYZE=true`. Three additional hot-path fixes: O(rows × entries) → O(1) parser-tier lookup in source-catalog, parallel `fs.access` for default search roots, and a project-root cache in the importer. New CLI flag `tokentrace doctor --timings` (with `--json`) force-enables analytics timing capture and prints the slow-query report so you can measure the wins yourself. Upgrade with `npm install -g tokentrace@latest`.

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
