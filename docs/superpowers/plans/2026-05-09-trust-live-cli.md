# Trust + Live CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 0.4.0 Trust + Live CLI release without intermediate public version bumps.

**Architecture:** Keep work in focused local modules: package metadata in `src/lib`, scan/doctor logic in `src/lib` and `src/ingestion`, UI rendering in existing app pages/components, and CLI commands through `bin/tokentrace.js` plus script entrypoints. Each milestone must ship tests and changelog entries under `Unreleased`.

**Tech Stack:** Next.js App Router, React server/client components, SQLite through current database helpers, Vitest, TypeScript, and the existing npm CLI.

---

### Task 1: Version Visibility

**Files:**
- Create: `src/lib/app-version.ts`
- Modify: `components/sidebar.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `components/settings-panel.tsx`
- Test: `tests/app-version.test.ts`
- Test: `tests/sidebar-version.test.tsx`

- [ ] Add a package metadata helper that returns the current package version.
- [ ] Render the version in the desktop sidebar footer.
- [ ] Render the version in the mobile header.
- [ ] Render the version in Settings local storage metadata.
- [ ] Add Vitest coverage for the metadata helper and rendered sidebar markup.
- [ ] Add a changelog entry under `Unreleased`.
- [ ] Run `npm test`.

### Task 2: Release Hygiene

**Files:**
- Create: `docs/RELEASE_CHECKLIST.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] Document the no-intermediate-public-release process.
- [ ] Document final 0.4.0 release commands and npm OTP handoff.
- [ ] Add clean install smoke commands.
- [ ] Run `npm run verify`.

### Task 3: Parser Trust

**Files:**
- Modify: `src/ingestion/path-classifier.ts`
- Modify: `src/ingestion/discovery.ts`
- Modify: `src/ingestion/scan.ts`
- Modify: `src/ingestion/adapters/claude-code.ts`
- Modify: `src/ingestion/adapters/codex-cli.ts`
- Test: `tests/discovery.test.ts`
- Test: `tests/parsers.test.ts`
- Test: `tests/run-scan.test.ts`

- [ ] Add fixtures for valid Claude Code project JSONL and Codex session files.
- [ ] Add regression tests for ignored Claude cache/plugin/todo paths.
- [ ] Add regression tests for ignored Codex support JSON.
- [ ] Improve latest scan duplicate and ignored file summaries.
- [ ] Run parser and scan tests.

### Task 4: Doctor Centrality

**Files:**
- Modify: `src/lib/scan-health.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `app/diagnostics/page.tsx`
- Modify: `bin/tokentrace.js`
- Create: `scripts/doctor.ts`
- Test: `tests/scan-health.test.ts`
- Test: `tests/scan-health-summary.test.tsx`
- Test: `tests/doctor-cli.test.ts`

- [ ] Add a Doctor JSON payload builder.
- [ ] Add zero-import explanations.
- [ ] Add repair actions for roots, unsupported files, parser failures, duplicates, ignored files, and unknown costs.
- [ ] Add `tokentrace doctor --json`.
- [ ] Run Doctor tests.

### Task 5: Evidence Trail

**Files:**
- Modify: `src/lib/analytics.ts`
- Modify: `app/page.tsx`
- Modify: `app/sessions/page.tsx`
- Modify: `app/pricing/page.tsx`
- Test: `tests/analytics-evidence.test.ts`

- [ ] Add unknown-cost queues grouped by cause.
- [ ] Add metric drilldown links to sessions and pricing.
- [ ] Add pricing-row references where model pricing exists.
- [ ] Add model alias suggestions.
- [ ] Run analytics tests.

### Task 6: Live CLI Polish

**Files:**
- Modify: `src/lib/live-status.ts`
- Modify: `scripts/status.ts`
- Modify: `bin/tokentrace.js`
- Test: `tests/live-status.test.ts`
- Test: `tests/claude-statusline.test.ts`

- [ ] Add compact and wide status-line modes.
- [ ] Add stale-scan and unknown-pricing indicators.
- [ ] Add `tokentrace watch --session --compact`.
- [ ] Run live CLI tests.

### Task 7: Local Brain

**Files:**
- Create: `src/lib/recommendations.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `app/page.tsx`
- Modify: `app/diagnostics/page.tsx`
- Modify: `bin/tokentrace.js`
- Create: `scripts/insights.ts`
- Test: `tests/recommendations.test.ts`

- [ ] Add deterministic recommendation rules.
- [ ] Show top recommendations in Overview and Doctor.
- [ ] Add `tokentrace insights --json`.
- [ ] Run recommendation tests.

### Task 8: Hardening

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: screenshots under `docs/assets` only if regenerated.

- [ ] Run browser visual checks for Overview, Doctor, Pricing, Sessions, and Discovery.
- [ ] Run clean-home CLI smoke tests.
- [ ] Run `npm run package:test`.
- [ ] Remove generated build cache files not intended for git.
- [ ] Prepare, but do not execute, the final 0.4.0 bump/tag/release commands.
