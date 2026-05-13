# Changelog

All notable changes to TokenTrace are documented here.

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
