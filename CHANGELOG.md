# Changelog

All notable changes to TokenTrace are documented here.

## Unreleased

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
