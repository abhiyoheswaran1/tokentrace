# Nightly Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved overnight polish pass across browser bug hunting, performance guardrails, Overview boundaries, dense UI polish, settings decomposition, responsive fixes, and CLI startup UX.

**Architecture:** Keep data contracts stable while extracting smaller units. Overview page assembly moves into `src/lib/overview-data.ts`, Overview presentation moves into `components/overview/*`, analytics timing moves into `src/lib/analytics-timing.ts`, Settings sections move into `components/settings/*`, and CLI polish stays in `bin/tokentrace.js`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, better-sqlite3, Tailwind, lucide-react, ProjScan, Playwright CLI or visual smoke fallback.

---

### Task 1: Browser Issue Badge

**Files:**
- Inspect: `scripts/visual-smoke.mjs`
- Modify if root cause is code: the smallest app/component file that triggers the issue
- Test: existing or new focused Vitest test

- [ ] Run the local dev server and reproduce the "1 Issue" badge with browser automation or screenshot.
- [ ] Gather console/runtime evidence before changing code.
- [ ] Form one root-cause hypothesis from the evidence.
- [ ] Add a failing test if the issue maps to source behavior.
- [ ] Implement the minimal fix or document that the badge is a browser/dev overlay artifact outside app code.
- [ ] Re-run the browser check.

### Task 2: Overview Data Boundary

**Files:**
- Create: `src/lib/overview-data.ts`
- Modify: `app/page.tsx`
- Test: `tests/localhost-performance-regressions.test.ts`

- [ ] Add a failing test that `app/page.tsx` imports `getOverviewData` and no longer assembles doctor, repair, accounting, and review data inline.
- [ ] Create `getOverviewData(range)` returning the same data currently assembled by `OverviewPage`.
- [ ] Update `app/page.tsx` to call `getOverviewData(range)` and keep render behavior unchanged.
- [ ] Run the focused performance regression tests.
- [ ] Commit the boundary extraction.

### Task 3: Overview Panel Split

**Files:**
- Create: `components/overview/cost-sessions-card.tsx`
- Create: `components/overview/token-accounting-card.tsx`
- Create: `components/overview/review-status-strip.tsx`
- Create: `components/overview/usage-pulse-panel.tsx`
- Create: `components/overview/trust-footer.tsx`
- Create: `components/overview/guardrails-panel.tsx`
- Create: `components/overview/first-run-panel.tsx`
- Create: `components/overview/top-repair-items-strip.tsx`
- Modify: `app/page.tsx`
- Test: `tests/overview-release-polish.test.ts`, `tests/localhost-performance-regressions.test.ts`

- [ ] Add failing structural tests for focused Overview component files.
- [ ] Move one Overview panel at a time into `components/overview/*`.
- [ ] Keep props typed from existing analytics and repair data.
- [ ] Preserve visible copy and layout unless a later polish task changes it.
- [ ] Run focused Overview tests and ProjScan hotspots.
- [ ] Commit the split.

### Task 4: Analytics Query Timing Guardrails

**Files:**
- Create: `src/lib/analytics-timing.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `src/lib/doctor.ts` or doctor output helper if needed
- Test: `tests/analytics-timing.test.ts`

- [ ] Add failing tests for recording named query durations and flagging entries above 500ms by default.
- [ ] Implement a lightweight timing helper that is active in development/test and inert in production unless explicitly enabled.
- [ ] Wrap major analytics query functions with named timers.
- [ ] Expose slow-query summaries for doctor/internal diagnostics without sending data externally.
- [ ] Run analytics and doctor tests.
- [ ] Commit timing guardrails.

### Task 5: Session Explorer Polish

**Files:**
- Modify: `components/session-explorer.tsx`
- Test: `tests/session-explorer-polish.test.ts`

- [ ] Add failing source/render tests for sticky table header, active filter chips, one-click reset, density controls, and improved no-match empty state.
- [ ] Add row density state with compact and comfortable options.
- [ ] Render active filter chips near the filters header with individual clearing affordances.
- [ ] Make the table header sticky inside the horizontal scroll region.
- [ ] Improve no-match empty state with reset and Scan Health actions.
- [ ] Run focused tests.
- [ ] Commit Session Explorer polish.

### Task 6: Repair Workflow Polish

**Files:**
- Modify: `app/repair/page.tsx`
- Optionally modify: `src/lib/unknown-cost-repair.ts`
- Test: `tests/repair-workflow-polish.test.ts`

- [ ] Add failing tests for "Top cause", "Next best repair", "What changes after repair", and clearer resolved/ignored/parser-review copy.
- [ ] Add helper copy functions for repair state and next-action labels.
- [ ] Update focused repair and table copy to show top cause, next action, expected impact, and status meaning.
- [ ] Preserve existing repair keys, review state, bulk action, and model-rate links.
- [ ] Run repair tests.
- [ ] Commit repair polish.

### Task 7: Settings Decomposition

**Files:**
- Create: `components/settings/local-storage-section.tsx`
- Create: `components/settings/package-trust-section.tsx`
- Create: `components/settings/guardrails-section.tsx`
- Create: `components/settings/scan-memory-section.tsx`
- Create: `components/settings/scan-scheduling-section.tsx`
- Create: `components/settings/custom-folders-section.tsx`
- Create: `components/settings/import-profiles-section.tsx`
- Create: `components/settings/scan-controls-section.tsx`
- Create: `components/settings/local-exports-section.tsx`
- Modify: `components/settings-panel.tsx`
- Test: `tests/settings-decomposition.test.ts`

- [ ] Add failing structural tests for focused settings section files and a smaller orchestrator.
- [ ] Extract presentational sections without changing state ownership first.
- [ ] Pass existing values and callbacks from `SettingsPanel`.
- [ ] Keep section IDs and hash navigation stable.
- [ ] Run settings tests and source regression tests.
- [ ] Commit settings decomposition.

### Task 8: Mobile/Responsive Pass

**Files:**
- Modify: affected Overview, Repair, Sessions, and Settings component files
- Test: `tests/responsive-polish.test.ts`

- [ ] Add failing source tests for table scroll wrappers, sticky headers, non-wrapping critical actions, and mobile-safe section nav.
- [ ] Audit Overview, Repair, Sessions, and Settings at mobile widths using browser screenshots.
- [ ] Fix text overflow, cramped action groups, and table/header behavior found in the audit.
- [ ] Capture updated desktop and mobile screenshots.
- [ ] Commit responsive fixes.

### Task 9: CLI Startup/Runtime Polish

**Files:**
- Modify: `bin/tokentrace.js`
- Test: `tests/serve-command.test.ts`

- [ ] Add failing CLI tests for clearer help, startup progress text, fixed-port conflict messaging, and no-open guidance.
- [ ] Improve serve progress logs around local data initialization, dashboard build reuse/preparation, and URL readiness.
- [ ] Detect fixed-port unavailability before spawning Next and print a direct remediation.
- [ ] Preserve no-network discovery commands and local-first runtime env.
- [ ] Run CLI tests.
- [ ] Commit CLI polish.

### Task 10: Final Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] Add Unreleased changelog entries for user-facing performance, polish, responsive, and CLI changes.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run projscan:doctor`.
- [ ] Run `npx --yes projscan@latest hotspots --format json`.
- [ ] Run browser visual smoke or Playwright screenshot checks for Overview, Repair, Sessions, Settings at desktop and mobile widths.
- [ ] Review `git status --short` and commit remaining docs/changelog changes.
