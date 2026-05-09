# Changelog

All notable changes to TokenTrace are documented here.

## Unreleased

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
