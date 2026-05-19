# Changelog

All notable changes to TokenTrace are documented here.

## Unreleased

## [0.12.0] - 2026-05-19

### Added

- 0.12.0 Local Sources & Trust roadmap, rolling the 0.13.0 Evidence Portability, 0.14.0 Local Operations, 0.15.0 Governance & Guardrails, 0.16.0 Parser Studio, 0.17.0 Reports, and 0.18.0 Agent Handoff themes into one larger release.
- Native structured usage log ingestion for local wrappers and team JSONL/NDJSON logs with session, model, token, and source-cost fields.
- Native Cursor-style chat/composer export ingestion with local source evidence and no raw prompt storage by default.
- Source Catalog and Source Coverage in Scan Health so users can distinguish native, profile-assisted, fallback, and unsupported local files.
- Privacy-safe Evidence Packs exported as JSON or Markdown with totals, confidence drivers, source files, parser notes, model-rate state, repair links, and an explicit redaction manifest.
- Local scan scheduling settings for manual-only, on-open, hourly, and daily scans, plus scan-history retention and last scheduled scan status.
- Scoped project/model/tool guardrails with per-guardrail warning thresholds and anomaly notes.
- Import Profile preview for sampling a local file, checking parser fit, reviewing detected fields, and applying recommended matchers without exposing raw content.
- Saved report definitions and export endpoints for weekly usage, high-cost sessions, unknown-cost repair, confidence trends, guardrail status, and source coverage in Markdown, JSON, and CSV.
- Operating metadata export for settings, source catalog, schedules, guardrails, report definitions, and roadmap status without raw usage records.
- Agent-readable Roadmap V2 with current release, next planned release, rolled-up release themes, action recipes, evidence paths, verification gates, and release status.

### Changed

- Settings now includes Scan Scheduling, Scoped Guardrails, Import Profile preview, and Local Exports.
- Evidence pages now offer one-click JSON and Markdown evidence-pack exports.
- Evidence remains a contextual drill-down from Overview, Sessions, Repair, and exports, with direct-entry guidance for users who open `/evidence` manually.
- Scan, setup, guardrail, package-trust, folder, import-profile, and export CTAs now deep-link to the exact Settings section instead of dropping users at the top of Settings.
- Settings scan feedback now reports files checked, records imported, warnings, errors, recalculated costs, unknown cost, stale support imports, model aliases, and next-step links to Scan Health, Repair, Discovery, and Model Rates.
- Browser-triggered Scan now responses now return compact warning/error previews with full counts, keeping large duplicate-file scans from shipping megabytes of warning text back to the UI.
- Settings now has sticky section navigation, and Scan Controls shows a persisted Last scan result from local scan history after reload.
- Overview now includes a compact Last verified trust strip near the accounting totals for latest scan, package IOC, model-rate coverage, and evidence-pack availability.
- Evidence pages now include opened-from breadcrumbs, safe return behavior, and explicit Export JSON pack / Export Markdown pack actions.
- Route transitions now show a subtle top loading bar, and route loading states explain what is happening plus the next useful action.
- Scan and evidence follow-up actions now consistently use Scan now, Open Scan Health, Open repair, Set model rate, View evidence, and Export pack language.
- Period filters stay attached to the current page, preserve Evidence context, and keep desktop controls in one compact row while retaining horizontal scrolling for narrow widths.
- Chart cards now show lightweight loading placeholders during client hydration instead of appearing blank while Recharts initializes.
- Session Explorer now paginates large local result sets to keep dense session tables responsive.
- Repair now opens as a capped workbench of the top visible unknown-cost groups, while keeping full summary counts and focused repair links for deep review.
- Roadmap CLI/API now report the 0.12.0 Local Sources & Trust release contract and the next planned 0.19.0 direction.

### Fixed

- Overview, Evidence, and Settings now avoid full raw-row scans and oversized scan-health payloads on large local databases by using covering indexes, scoped scan-file reads, and a summary session path on Overview.
- Repair no longer serializes the entire unknown-cost queue on first load and uses a dedicated cost-repair index for large local databases.
- Scan Health no longer loads all scan-file evidence and full session details just to render summary panels.
- Overview no longer blocks initial render on due scheduled scans, so opening localhost does not wait for scan work before showing the dashboard.

## [0.11.0] - 2026-05-18

### Added

- `npm run security:ioc` scans project files and local Claude/VS Code hook files for high-signal Mini Shai-Hulud/TanStack supply-chain indicators before release.
- Tokenizer-backed estimates for recognized OpenAI/Codex and Claude-family model names, with explicit `tokenizer estimate` and `simple estimate` confidence labels.
- Native SQLite history ingestion for local usage databases with usage-shaped tables, source-file evidence, import-profile metadata, and source-provided cost preservation.
- Data Confidence scoring on Overview, Projects, Sessions, and Session Timeline views, combining token source, cost coverage, parser confidence, and scan freshness.
- Import Profiles in Settings so users can define safe local wrapper-log matchers without writing parser code.
- Repair Workbench bulk actions for marking visible unknown-cost groups verified, parser-review, ignored, or reopened.
- Supply-chain IOC status in Scan Health, backed by the same local `security:ioc` scanner used by release checks.

### Changed

- Session Timeline pages now explain token spikes, model changes, cache activity, cost coverage, confidence drivers, and direct unknown-cost repair links.
- Scan Health now distinguishes exact, tokenizer-estimated, simple-estimated, high-confidence, low-confidence, and unknown token rows.
- The roadmap API and CLI now report the 0.11.0 Accuracy & Evidence release contract.

### Fixed

- Source-provided interaction costs are no longer overwritten as unknown during post-scan cost recalculation when model rates are missing.

## [0.10.1] - 2026-05-18

### Changed

- Guide now uses a manual-style layout with section navigation, compact setup status, workflow rows, command tables, and tighter troubleshooting copy.
- Sidebar Guide access now lives in a Help area above the version footer so it reads as documentation instead of a product feature.
- Guide section navigation now sticks while scrolling on desktop widths, and the standalone sidebar Guide link no longer shows redundant Help chrome.
- Guide Scan now controls now run the local scan directly with inline feedback instead of linking to Settings.
- Overview now groups processed, fresh, and cached token metrics into one Token Accounting card with direct evidence pivots.
- Evidence pages now include metric tabs and drill-down actions for source files, sessions, parser confidence, and model-rate or repair follow-up.
- User-facing model price configuration is now labeled Model Rates so it is not mistaken for TokenTrace product pricing.
- Overview Usage Pulse now labels current, previous, and change values explicitly inside each metric block.
- Overview now groups cost and sessions into one split card with a shared help tooltip, compact pane labels, and aligned trust notes/actions.
- Overview trend charts now default all-time views to the latest 30 days, while keeping 60-day, 90-day, and All history options available.
- Overview now compacts below-chart diagnostics into Review Status and Top repair items strips, with the full unknown-cost table moved to the Repair page.
- Evidence, repair, parser, and model-rate links now use consistent action labels: View evidence, Open repair, Set model rate, and Review parser.
- Sidebar navigation now shows the active page, first-run empty states point to the next useful action, direct scans return richer result feedback, and repair/evidence pages guide users through the next drill-down.
- Page names now stay aligned around Parsers, Discovery, Insights, Scan Health, Model Rates, and privacy-oriented Raw Data copy.
- User-facing diagnostic copy now uses Scan Health consistently instead of older mixed diagnostic wording.
- Product metadata, README, Guide, and agent discovery now point to the TokenTrace product website while creator attribution points to Abhi Yoheswaran's homepage.
- Period filters use a mobile-friendly preset scroller with custom dates on a compact second row, and trend controls now say Display window with a showing-latest badge.
- README screenshots were refreshed from a guarded public-safe screenshot database seeded by `npm run screenshots:seed`.

## [0.10.0] - 2026-05-18

### Added

- In-app Guide page covering first scan setup, Claude Code status-line installation, status-line label meanings, page workflows, privacy, and troubleshooting.
- `tokentrace agent --json` and `tokentrace capabilities --json` for a read-only machine-readable discovery manifest that coding agents can use before scanning or opening the dashboard.
- Local dashboard discovery endpoints at `/api/agent` and `/api/capabilities` returning the same manifest.
- `tokentrace roadmap --json` and `/api/roadmap` for machine-readable 0.10.0 implementation status, evidence paths, verification gates, and release status.
- Package-level agent discovery references: `TOKENTRACE_AGENT.md`, `llms.txt`, and `docs/agent-discovery.schema.json`.
- Repo-level agent instructions for Codex and Claude Code requiring Superpowers, ProjScan, changelog discipline, and explicit maintainer approval before releases.
- 0.10.0 Guided Operator roadmap for in-app guidance, status-line clarity, trend continuity, release-safe agent workflow, and verification gates.
- First-run guided setup in Overview and Guide so new users can move from scan roots to first useful evidence without a separate tutorial mode.
- Guide release-readiness and empty-state sections covering roadmap gates, release status, no data, missing logs, unknown pricing, parser warnings, and sandbox smoke skips.

### Changed

- Guide now shows live local setup status for latest scan, imported records, unknown costs, and priced model coverage.
- Agent discovery follow-up commands are now structured as command arrays instead of shell strings.
- Claude Code status-line output now leads with live context and cost, then labels transcript totals as processed and cache usage to avoid confusing cumulative processed tokens with current context size.
- Package inspection and packed-install smoke now enforce the agent discovery docs, schema, executable CLI bin, and 0.10.0 release-status contract.
- Overview metric cards now show inline trust annotations explaining processed, non-cache, cached, cost, and session counts near the numbers.
- Overview Period defaults to All time again, while token and cost trend charts share one control bar that defaults chart history to the latest 60 days with 30-day, 90-day, and All options.
- Usage Pulse now suppresses extreme percentage labels when the previous comparison baseline is too small to be useful.

### Fixed

- Token and cost trend charts now include explicit zero-value calendar days between imported usage days instead of visually skipping idle periods.

## [0.9.0] - 2026-05-13

### Added

- Session Timeline pages for inspecting one imported CLI session as ordered interactions, model changes, token spikes, cache activity, tool calls, parser confidence, and unknown-cost events without exposing raw message bodies.
- Saved Local Views on Sessions, with built-in local filters for unknown cost, high-cost sessions, Claude/Codex this month, estimated tokens, guardrail review, and parser review, plus user-created SQLite-backed views.
- `tokentrace digest --since <last-scan|yesterday|YYYY-MM-DD>` for scoped local usage digests.
- `tokentrace report --markdown` and `tokentrace review --json` for deterministic local summaries covering digest data, post-session movement, accounting state, parser warnings, and expensive sessions.
- Overview Post-Session Review panel showing latest scan movement, unknown costs, parser follow-up, guardrail state, and expensive sessions.
- Accounting invariant checks that verify processed tokens balance against fresh input, output, reasoning, and cache buckets.

### Changed

- Claude status line output now includes context-window usage when Claude provides it and distinguishes priced sessions from pricing-repair states.
- Overview Data Readiness now includes token-bucket balance and keeps readiness tiles readable at normal desktop widths.

## [0.8.4] - 2026-05-13

### Changed

- Overview now shows Usage Pulse, top-level metric cards, and token/cost trend graphs before trust and Data Readiness diagnostics, so the first viewport focuses on primary usage status before repair-readiness details.

## [0.8.3] - 2026-05-13

### Fixed

- Codex CLI `token_count` JSON imports now subtract cached input from non-cached input and keep cached input separate, so processed Codex totals count cache exactly once instead of double-counting it.
- Codex parser provenance is bumped to version 4 so previously imported version-3 Codex session rows are reprocessed on the next scan with corrected token and cost totals.

## [0.8.2] - 2026-05-13

### Fixed

- Codex CLI `token_count` imports now preserve non-cached input tokens and add cached input tokens to processed totals, matching Codex's `input (+ cached)` session summary.
- Codex parser provenance is bumped to version 3 so previously imported Codex session files are reprocessed on the next scan instead of keeping stale undercounted rows.
- Generic text-log parsing now recognizes Codex `Token usage: total=... input=... (+ ... cached) output=...` summary lines as structured usage instead of weak text estimates.
- Overview and evidence token totals now switch to billions at large scales instead of displaying multi-thousand million values.
- Scan, settings, pricing, and pricing-refresh API writes now reject malformed JSON and avoid JavaScript truthiness coercion for boolean flags.
- Settings and scan custom folders are trimmed and blank entries are discarded before persistence or scan execution.
- Pricing manifest imports now ignore invalid, boolean, array, blank, and negative price values instead of coercing them into trusted numeric prices.

## [0.8.1] - 2026-05-13

### Fixed

- Codex CLI imports now read exact `token_count` totals, including cached input and reasoning output tokens, so cleared Codex sessions are no longer undercounted.
- Claude Code and Codex session artifacts can exceed the generic file-size cap without being skipped during discovery.
- OpenAI-style, Claude-style, and generic usage parsers now normalize cached, cache-write, and reasoning token fields without double-counting them.
- Parser-version-aware rescans now reprocess stale imports, and source-file replacement is atomic so a failed replacement cannot delete prior trusted sessions.
- Unknown-cost cause summaries now assign each interaction to one primary cause instead of overlapping buckets.
- Pricing, scan, settings, repair, and pricing-refresh APIs now reject malformed JSON with clean 400 responses.
- Manual pricing saves now reject blank model/provider names and invalid numeric prices instead of silently storing unknown prices.
- CLI commands now reject unknown flags across scan, pricing refresh, status, doctor, digest, and insights commands.
- Local release checks now run ProjScan through `projscan@latest`, matching the GitHub security workflow guardrail.

## [0.8.0] - 2026-05-12

### Added

- Evidence detail pages and `tokentrace evidence --json` for tracing metric totals back to sessions, source files, parser status, and pricing context.
- Unknown Cost Repair workbench and `tokentrace repair --json` for grouped local repair state, alias hints, parser review links, and pricing follow-up.
- Parser Trust Report and Scan History Diff panels in Diagnostics for latest scan parser coverage and scan-to-scan import changes.

### Changed

- Overview metric cards now link major totals to evidence trails and route unknown cost work to Unknown Cost Repair.
- Overview now places Token Trend and Cost Trend directly after Usage Pulse and the metric cards, with Monthly Guardrails and Recommended Next Actions below the charts.
- Dense evidence, repair, parser trust, and scan diff tables preserve horizontal scrolling and stable source-path truncation.
- Evidence and repair copy now states local-first behavior, support-file ignores, and parser-review requirements for unsupported files.
- README screenshots now use public-safe synthetic Evidence + Repair views, and obsolete screenshot assets were removed from the package payload.

### Fixed

- Overview custom period date fields now use an intentionally inset calendar icon while preserving native `type="date"` submission fields and the single-line desktop toolbar.
- The app shell now constrains page width on small screens so wide toolbars scroll internally instead of widening the whole page.
- `tokentrace statusline setup claude` and piped Claude status-line input no longer touch the TokenTrace app database or start the dashboard.

## [0.7.0] - 2026-05-12

### Added

- 0.7.0 Usage Intelligence roadmap for local guardrails, savings review, session comparison, project intelligence, and daily digest work.
- Local monthly cost and token guardrails stored in Settings.
- Overview Monthly Guardrails panel showing month-to-date local usage against configured limits.
- Recommendation rules for monthly guardrails that are near or over limit.
- Evidence-backed Review Queue on Insights, ranked from guardrails, unknown cost repair, high-impact sessions, dominant projects, model review, and cache reuse.
- `tokentrace insights --json` now includes the Review Queue for local automation.
- `tokentrace digest` and `tokentrace digest --json` for current-month local usage, guardrails, top review item, unknown-cost count, top project, and latest scan status.
- Session Comparison Flags on Sessions to highlight token and cost outliers compared with matching project, tool, and primary-model peers.
- Project Signals on Projects for dominant usage, unknown cost, estimated-token confidence, and model concentration patterns.

### Changed

- Renamed the Insights page header to Usage Intelligence to match the 0.7.0 product theme.
- Refreshed README screenshots for Overview, Usage Intelligence, Sessions, Projects, and local guardrail Settings using public-safe synthetic local data.

### Fixed

- Increased the forced packed-install smoke test timeout so native SQLite dependency installation is not killed on slower machines.

## [0.6.0] - 2026-05-10

### Added

- 0.6.0 Stable Daily Tool roadmap with explicit release cards and gates.
- Support matrix for stable, best-effort, ignored, and unsupported TokenTrace surfaces.
- Scan Doctor support matrix and scan freshness status.
- Overview first-run checklist that explains missing roots, no scans, zero imports, and next actions.
- `npm run smoke:cli` for clean-home CLI checks across scan, serve, doctor, status, Claude status-line, and watch-mode commands.
- `npm run smoke:packed` for installing the packed tarball into a temp project and verifying the published CLI entrypoint.

### Changed

- Claude Code and Codex JSONL parsers now keep valid records when a transcript contains malformed lines.
- Model alias suggestions now handle OpenAI/Codex provider-prefixed and dated snapshot names.
- Overview period filter keeps the custom date fields and Apply button visible on desktop while presets absorb overflow.
- Local development config declares localhost/127.0.0.1 dev origins and disables the standard Next.js dev indicator preference.
- README documents the support matrix and unsupported product boundaries.
- `npm run release:check` now includes CLI and packed-install smoke checks before package security inspection.
- The npm package now excludes generated `.next` output and prepares the dashboard build in the user's TokenTrace app-data directory on first `tokentrace serve`.
- Package trust inspection now verifies the publish tarball directly and fails if generated Next.js build output is included.
- Packed-install smoke now starts `tokentrace serve` from the packed tarball and allows dependency install scripts needed by native SQLite bindings while keeping TokenTrace itself free of lifecycle scripts.
- Dev security posture is cleaner: Vitest is updated to the Node 18-compatible patched line, and the unused `drizzle-kit` dev dependency has been removed.
- `npm run security:package` now audits the full dependency graph at moderate-or-higher severity instead of checking only production high-severity advisories.

### Fixed

- Package inspection no longer depends on the user's global npm cache, which can contain root-owned files on some machines.
- First-run dashboard preparation from a packed install no longer hits SQLite `database is locked` errors while Next.js imports API routes during build.
- `tokentrace serve` now exits nonzero when the underlying Next.js server fails before readiness.

## [0.5.1] - 2026-05-10

### Added

- TokenTrace logo SVG asset and Next.js app icon.

### Changed

- App shell and README now use the TokenTrace logo instead of the generic chart mark.

## [0.5.0] - 2026-05-10

### Added

- Package trust inspection that fails if generated Next.js route bundles look packed or unreadable.
- GitHub Actions Trusted Publishing workflow for provenance-backed npm releases from version tags.
- GitHub security workflow with package verification, production dependency audit, and ProjScan doctor checks.
- Release-note extraction for publishing full changelog sections into GitHub Releases.
- Security policy documenting local-only behavior, package install guarantees, and vulnerability reporting.
- Package trust documentation for Socket, npm, maintainers, and users.
- ESLint, Prettier, EditorConfig, and ProjScan configuration for cleaner automated review.
- `npm run lint` in the verification path.
- `tokentrace serve --port`, `--hostname`, and `--no-open` options for predictable local and package smoke tests.
- 0.5.0 roadmap, design spec, and implementation plan for package trust and usage intelligence.
- Overview Usage Pulse comparing token, cost, session, and unknown-cost movement against the previous period.
- Scan Doctor recent scan history.
- Settings package trust panel summarizing install-script, network, and release guarantees.

### Changed

- Published Next.js server bundles are no longer server-minified so package scanners can inspect generated runtime code.
- Raised the declared Next.js dependency floor to `^15.5.18` to match the patched locked runtime.
- Raised the declared `drizzle-orm` dependency floor to `^0.45.2` and forced patched `postcss` resolution through npm overrides.
- Updated release documentation so future npm publishes happen through GitHub Trusted Publishing after tag verification.
- `npm run verify` now runs Vitest, TypeScript, and ESLint.

### Removed

- Removed the unused `date-fns` dependency from the published package graph.

## [0.4.0] - 2026-05-09

### Added

- Visible running TokenTrace version in the desktop sidebar, mobile header, and Settings.
- 0.4.0 roadmap and release checklist documenting internal milestones without intermediate public releases.
- `tokentrace doctor --json` plus a shared Doctor report model for scan health and repair recommendations.
- Bundled parser provenance metadata on imported scan files, including parser id, display name, source, and version.
- Unknown-cost repair queue on Overview, grouped by cause, model, tool, source file, and repair path.
- Deterministic local recommendations on Overview, Doctor, and `tokentrace insights --json`.
- Compact and wide live status output modes for `tokentrace statusline claude` and `tokentrace watch --session`.
- Codex integration spike documentation confirming terminal split/watch mode as the supported 0.4.0 fallback.
- Scan cleanup for previously imported sessions whose source paths are now classified as non-usage Claude/Codex support files.
- Scan Doctor health now uses the full latest scan-file set instead of the Raw Data table preview limit.
- Moved the Overview unknown-cost repair queue below the dashboard charts and current mix section.
- Refreshed README screenshots for Overview, Scan Doctor, Sessions, Discovery, Pricing, and mobile Overview.

### Changed

- Flattened dashboard, Doctor, Settings, Sessions, Insights, and scan-health layouts so nested mini-cards became divider-based sections.
- Updated dashboard typography with an explicit UI font stack plus monospace numeric treatment for analytics tables.
- Kept the mobile app header aligned with the desktop trust copy: local only and no telemetry.

### Fixed

- Restored the Overview period filter as a single-line toolbar after custom dates are applied, with horizontal overflow instead of wrapping.
- Improved badge and button styling so labels and controls remain visible without being detected as card-like nested surfaces.
- Fixed heading hierarchy across card-based pages by using second-level card headings under page titles.
- Darkened the primary teal to meet contrast requirements on muted surfaces.
- Fixed packed global installs serving production builds when `next` is hoisted outside the package folder.

## [0.3.0] - 2026-05-09

### Added

- Claude Code live status-line support through `tokentrace statusline claude`.
- `tokentrace status --json` for machine-readable local usage status.
- `tokentrace watch --session` for a terminal-split live status fallback while Codex status-line support remains under review.
- `tokentrace statusline setup claude` to print the Claude Code `statusLine` configuration block.
- Claude Code status-line README documentation and preview image.
- Vitest coverage for live status snapshots, Claude status-line stdin rendering, period filter layout, scan discovery, scan health UI, tooltip rendering, and unknown-cost causes.
- `npm run verify` as the standard Vitest plus TypeScript verification command.
- Scan Doctor trust checklist covering pricing, roots, discovered files, imported records, unknown prices, parser warnings, and next action.
- Ignored non-usage file tracking for local CLI support files.

### Changed

- Tightened Claude and Codex discovery so known support folders and files are ignored instead of parsed as usage.
- Made generic JSON, JSONL, and log adapters skip known non-usage CLI support paths.
- Grouped noisy scan notes by reason and examples in Scan Doctor.
- Broke unknown-cost diagnostics into missing model name, missing pricing, missing token count, and other causes.
- Expanded parser and provider inference coverage for real-world CLI artifacts.
- Documented the repo verification flow in README and CONTRIBUTING.

### Fixed

- Kept the overview period selector on one desktop row after custom dates are applied, using horizontal overflow as the fallback.
- Made metric-card help tooltips visible with an opaque surface and accessible tooltip markup.
- Avoided treating Claude cache, plugin, and todo files as parser failures.
- Avoided importing broad Claude support Markdown or Codex support JSON as generic usage.
- Improved parsing of comma-formatted token counts and numeric timestamp strings.
- Rejected custom dates that roll over into a different calendar day.

## [0.2.1] - 2026-05-09

### Added

- Product and design reference docs for TokenTrace.
- Impeccable design metadata for local UI review.

### Changed

- Tighten dashboard typesetting with shared page headers, data values, monospace text, and denser table defaults.

### Fixed

- Restore the overview period toolbar layout so preset buttons stay grouped cleanly across desktop widths.

## [0.2.0] - 2026-05-09

### Added

- Scan health summary for post-scan trust, including parser review, confidence, pricing coverage, and recommended next actions.
- Diagnostics CSV export for scanned files and scan runs.

### Changed

- Polish Settings, Discovery, Parser Debug, Sessions, and Overview explainability around scan freshness, confidence, and unknown cost.

## [0.1.5] - 2026-05-09

### Changed

- Polish the overview period toolbar and five-card metric layout for denser desktop scanning.

## [0.1.4] - 2026-05-09

### Changed

- Clarify overview token metric cards by separating processed tokens, non-cache tokens, and cache read/write tokens.

## [0.1.3] - 2026-05-09

### Added

- Overview period controls for all-time, today, rolling windows, this month, and custom date ranges.
- Date-range-aware overview analytics so headline cards, trends, tool mix, model/project/session aggregates, and insights use the same selected period.

## [0.1.2] - 2026-05-09

### Fixed

- Recalculate imported interaction costs after scans, price refreshes, default seeding, and manual pricing edits.
- Apply configured pricing to duplicate records during force rescans by repricing existing imported interactions.
- Backfill pricing for observed dated Claude model names, such as `claude-haiku-4-5-20251001`, from matching base pricing rows.

## [0.1.1] - 2026-05-08

### Added

- Bundled public pricing catalog for OpenAI, Anthropic, Google Gemini, xAI, DeepSeek, Mistral, Cohere, and generic fallback models.
- Pricing refresh support from the public TokenTrace pricing manifest.
- Cache read and cache write pricing support in cost calculations and the Pricing UI.
- Provider inference for generic logs so model names such as `gemini`, `grok`, `deepseek`, `mistral`, and `command` map to the right pricing catalog.
- Product screenshots, CLI GIFs, and a more user-focused README.
- Subtle open-source attribution in the app, README, and npm package metadata.

### Changed

- Preserves manually edited pricing rows when refreshing managed default prices.
- Keeps public documentation focused on user setup, privacy, screenshots, pricing transparency, and extension points.

### Removed

- Internal publishing notes and source recording files from public documentation/package contents.

## [0.1.0] - 2026-05-08

### Added

- Initial local-first TokenTrace dashboard and `tokentrace` npm CLI.
- Local filesystem ingestion for AI CLI artifacts with adapter-based parsers.
- Best-effort adapters for Claude Code, Codex CLI, generic JSONL, generic JSON, and text logs.
- SQLite storage, migrations, seeding, and reset support.
- Dashboard pages for overview analytics, tool comparison, models, projects, sessions, optimisation insights, pricing, diagnostics, discovery, parser debugging, and raw data.
- Token estimation, confidence metadata, cost calculation, CSV export, and duplicate import handling.
- Optional `tokentrace run <command>` wrapper mode for local runtime diagnostics.
