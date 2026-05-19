# TokenTrace 0.4.0 Roadmap

TokenTrace 0.4.0 is the Trust + Live CLI release. Development slice labels stay
out of public version bumps, tags, GitHub releases, and npm publishes until the
final 0.4.0 release.

## Release Rules

- Keep `package.json` at the current published development version until the
  final release bump.
- Record user-facing changes under `CHANGELOG.md` `Unreleased`.
- Commit development slices normally.
- Do not create public tags or GitHub releases for development slices.
- Do not run `npm publish` until the final 0.4.0 package is verified.

## Development Slices

### 0.3.1: Release Hygiene

- Add visible runtime version in the sidebar, mobile header, and Settings.
- Add a release smoke checklist.
- Keep npm release verification documented, but do not publish.

### 0.3.2: Parser Trust

- Expand Claude Code and Codex CLI parser fixtures.
- Keep support files out of usage ingestion.
- Improve duplicate and rescan summaries.
- Track parser metadata clearly in diagnostics.
- Group scan notes by reason with examples.

### 0.3.3: Doctor Becomes Central

- Make Doctor the primary repair surface.
- Show roots, discovered files, ignored files, duplicates, unsupported files,
  failed files, parser coverage, pricing coverage, and recommended fixes.
- Add `tokentrace doctor --json`.
- Explain zero-record scans directly.

### 0.3.4: Evidence Trail

- Let metrics point to sessions, source file, parser, confidence, and pricing row.
- Add unknown-cost queues by missing model, missing pricing, missing token count,
  and other causes.
- Add model alias suggestions.

### 0.3.5: Live CLI Polish

- Improve `tokentrace statusline claude` formatting.
- Add compact and wide modes.
- Show stale-scan and unknown-pricing indicators.
- Validate Claude Code setup instructions.
- Add `tokentrace watch --session --compact`.

### 0.3.6: Local Brain v1

- Add deterministic local recommendations.
- Surface the top recommendations in Overview, Doctor, and CLI JSON.
- Keep all recommendations explainable from local database facts.

### 0.3.7: Codex Integration Spike

- Verify the current Codex CLI integration surface.
- Implement only documented, stable integration points.
- Keep terminal split or wrapper watch mode as the safe fallback.

### 0.3.8: 0.4.0 Hardening

- Run visual checks for Overview, Doctor, Pricing, Sessions, and Discovery.
- Run clean-home CLI smoke tests.
- Run large fixture and migration checks.
- Refresh README screenshots and changelog.
- Run the final package test.

## 0.4.0 Release Gate

- `npm run package:test` passes.
- Fresh global install smoke works.
- `tokentrace scan`, `tokentrace serve`, `tokentrace doctor`,
  `tokentrace status --json`, and `tokentrace statusline claude` work from a
  clean temporary home.
- Doctor explains scan failures, zero imports, unsupported files, ignored files,
  duplicates, and unknown costs.
- Overview period selector and metric help tooltips remain visually correct.
- Claude Code status-line docs include a current screenshot.
- README and changelog are current.
- No app scraping, browser extension, proxy, packet capture, or cloud telemetry
  scope is included.
