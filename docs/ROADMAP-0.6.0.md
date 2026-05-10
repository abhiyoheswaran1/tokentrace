# TokenTrace 0.6.0 Roadmap

0.6.0 is the Stable Daily Tool release.

The release should make daily use boring and trustworthy:

- Users can tell which CLI sources are stable, best-effort, ignored, or unsupported.
- First-run and zero-data states explain what happened and what to do next.
- Scan Doctor exposes freshness, support status, parser coverage, pricing coverage, and repair paths.
- Model aliases and unknown-cost queues make missing cost repairable.
- Release gates prove CLI startup, package contents, audit status, and UI basics before publishing.

## Release Rules

- No desktop app scraping.
- No browser extension.
- No proxy, packet capture, network interception, cloud sync, or telemetry.
- No public tag, GitHub Release, or npm publish until the maintainer explicitly asks for release.
- GitHub Release notes must include the complete changelog section for the released version.

## 0.6.0 Cards

### TT-060-01 Stability Matrix

- Add stable, best-effort, ignored, and unsupported support levels.
- Surface the matrix in Scan Doctor and docs.
- Keep unsupported boundaries explicit: desktop apps, browser scraping, network capture, and telemetry.

### TT-060-02 Real-World Parser Fixtures

- Expand Claude Code and Codex CLI fixtures for valid, malformed, duplicate, ignored, and missing-field cases.
- Keep ignored support files out of usage imports.
- Add large fixture and repeated-scan tests.

### TT-060-03 First-Run And Zero-Data Experience

- Replace vague empty dashboard states with checklist-driven first-run guidance.
- Explain missing roots, no scans, no files, duplicate-only scans, ignored-only scans, and unsupported-only scans.

### TT-060-04 Evidence Trail V2

- Keep dashboard links pointed at sessions, parser evidence, pricing rows, and source files.
- Make scan freshness and support levels visible in Doctor.

### TT-060-05 Pricing And Model Repair

- Improve aliases for Claude, OpenAI, Codex, dated snapshots, provider-prefixed names, unknown rows, and synthetic rows.
- Keep unknown-cost causes grouped by missing model, missing price, missing token count, and other.

### TT-060-06 Scan Lifecycle And Data Integrity

- Track latest scan, last successful import, stale import state, duplicates, ignored files, unsupported files, failed files, and cleaned-up records.
- Add migration and repeated-scan smoke coverage before release.

### TT-060-07 Visual QA And Accessibility

- Verify Overview, Doctor, Sessions, Pricing, Discovery, Settings, and mobile Overview.
- Keep period filters single-line on desktop and horizontally scrollable under pressure.

### TT-060-08 CLI Reliability Smoke

- Smoke test `tokentrace scan`, `tokentrace serve --no-open`, `tokentrace doctor --json`, `tokentrace status --json`, `tokentrace statusline claude`, and `tokentrace watch --session --compact`.

### TT-060-09 Release Candidate

- Refresh README screenshots and changelog.
- Run `npm run release:check`, `npx projscan@latest doctor`, and packed install smoke before public release.

## Release Criteria

0.6.0 is not releasable until:

- `npm run release:check` passes.
- A packed install smoke passes.
- Production dependency audit reports zero high vulnerabilities.
- Scan Doctor explains stale scans, zero imports, unsupported files, ignored files, parser failures, unknown costs, and support levels.
- Overview first-run state is clear with no imported usage.
- GitHub Release body includes the complete 0.6.0 changelog section.
