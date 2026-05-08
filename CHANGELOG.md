# Changelog

All notable changes to TokenTrace are documented here.

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
