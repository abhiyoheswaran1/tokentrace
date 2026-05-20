# Full Polish Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved eight-part polish bundle without changing TokenTrace's local-first product contract.

**Architecture:** Keep routes thin, move repeated UI and decision logic into focused modules, and protect each boundary with static and behavior tests. Prefer pure helpers for Doctor, Scan Health, Pricing, ingestion, persistence, and smoke tooling so future fixes do not require reading full routes or scripts.

**Tech Stack:** Next.js app router, React server/client components, TypeScript, Vitest, SQLite local data, ProjScan.

---

### Task 1: Overview Route Breakup

**Files:**
- Modify: `app/page.tsx`
- Modify: `src/lib/overview-data.ts`
- Create: `components/overview/recommendations-card.tsx`
- Create: `components/overview/current-mix-panel.tsx`
- Test: `tests/overview-decomposition-next.test.ts`

- [ ] Write a failing test requiring `app/page.tsx` to import the two new panels, use `getOverviewPageData()`, and stay under 170 lines.
- [ ] Run `npm test -- tests/overview-decomposition-next.test.ts` and confirm it fails because the new boundary does not exist.
- [ ] Add `getOverviewPageData()` as the exported route-facing wrapper around `getOverviewData()`.
- [ ] Move Recommended Next Actions and Current Mix / Usage By Tool into focused Overview components.
- [ ] Run targeted Overview tests plus `npx tsc --noEmit --pretty false`.
- [ ] Commit `refactor: split overview route panels`.

### Task 2: Doctor And Scan Health Rules Split

**Files:**
- Modify: `src/lib/doctor.ts`
- Modify: `src/lib/scan-health.ts`
- Create: `src/lib/doctor-recommendations.ts`
- Create: `src/lib/scan-health-rules.ts`
- Test: `tests/doctor-scan-health-decomposition.test.ts`

- [ ] Write a failing test requiring exported pure helpers for zero-import explanations, doctor recommendations, scan freshness, scan note groups, scan health status, and scan health actions.
- [ ] Run the test and confirm it fails because the modules are absent.
- [ ] Move the existing Doctor recommendation and zero-import rules into `doctor-recommendations.ts`.
- [ ] Move freshness, note grouping, status, action, and count helpers into `scan-health-rules.ts`.
- [ ] Rewire `doctor.ts` and `scan-health.ts` to import those helpers without behavior changes.
- [ ] Run Doctor and Scan Health targeted tests plus `tsc`.
- [ ] Commit `refactor: split scan health rules`.

### Task 3: Repair Page Decomposition

**Files:**
- Modify: `app/repair/page.tsx`
- Create: `app/repair/repair-page-data.ts`
- Create: `components/repair/repair-guidance.tsx`
- Create: `components/repair/repair-summary.tsx`
- Create: `components/repair/repair-items-table.tsx`
- Test: `tests/repair-page-decomposition.test.ts`

- [ ] Write a failing test requiring the route to import repair data/UI modules and stay under 220 lines.
- [ ] Run the test and confirm it fails with the current monolithic route.
- [ ] Move query parsing and workbench loading into `getRepairPageData()`.
- [ ] Move guided flow, decision panel, focused item, summary metrics, and table into components.
- [ ] Preserve focused repair return links and the “what changes after repair” copy.
- [ ] Run Repair targeted tests plus `tsc`.
- [ ] Commit `refactor: split repair page`.

### Task 4: Pricing Settings Polish

**Files:**
- Modify: `components/pricing-settings.tsx`
- Create: `components/pricing/pricing-workflow.ts`
- Test: `tests/pricing-settings-polish-next.test.ts`

- [ ] Write a failing test for validation helpers, duplicate detection, repair return copy, and export/import affordance copy.
- [ ] Run the test and confirm it fails because the helper does not exist.
- [ ] Add pure helpers for row validation, duplicate model-rate keys, and post-save repair impact copy.
- [ ] Surface duplicate warnings, disabled invalid saves, clearer focused repair copy, and local export/import links in the UI.
- [ ] Run pricing tests plus `tsc`.
- [ ] Commit `feat: polish pricing settings`.

### Task 5: Ingestion Hardening

**Files:**
- Modify: `src/ingestion/adapters/codex-cli.ts`
- Modify: `src/ingestion/persist.ts`
- Create: `src/ingestion/persist-guardrails.ts`
- Test: `tests/codex-ingestion-hardening.test.ts`
- Test: `tests/persist-guardrails.test.ts`

- [ ] Write failing tests for malformed Codex JSON, JSON files with no object payload, empty import guardrails, and duplicate/no-op result messages.
- [ ] Run the tests and confirm they fail for missing warnings/guardrail helpers.
- [ ] Extract Codex text parsing into helper functions that preserve partial imports and add explicit warnings.
- [ ] Add persistence preflight and result-description helpers without changing database schema.
- [ ] Run ingestion tests plus `tsc`.
- [ ] Commit `feat: harden ingestion diagnostics`.

### Task 6: Smoke Tooling Split

**Files:**
- Modify: `scripts/smoke-cli.mjs`
- Create: `scripts/smoke-cli/context.mjs`
- Create: `scripts/smoke-cli/commands.mjs`
- Create: `scripts/smoke-cli/runtime.mjs`
- Create: `scripts/smoke-cli/serve.mjs`
- Test: `tests/smoke-cli-decomposition.test.ts`

- [ ] Write a failing static test requiring the smoke script to delegate command, runtime, and serve checks to modules.
- [ ] Run the test and confirm it fails on the current single script.
- [ ] Move shared context, command helpers, JSON/data checks, watch/status-line checks, and serve startup checks into modules.
- [ ] Keep `node scripts/smoke-cli.mjs` behavior and output stable.
- [ ] Run smoke decomposition test, `node scripts/smoke-cli.mjs`, and `tsc`.
- [ ] Commit `refactor: split cli smoke tooling`.

### Task 7: Mobile Command Navigation

**Files:**
- Modify: `components/sidebar.tsx`
- Test: `tests/mobile-navigation-polish.test.tsx`

- [ ] Write a failing test requiring a compact mobile command menu, active route summary, and preserved route labels.
- [ ] Run the test and confirm it fails on the horizontal-only mobile nav.
- [ ] Replace mobile horizontal nav with a compact details/menu pattern and a small priority row.
- [ ] Ensure labels do not overflow on 390px screenshots.
- [ ] Run navigation tests plus `tsc`.
- [ ] Commit `feat: polish mobile navigation`.

### Task 8: First-Run / No-Data Experience

**Files:**
- Modify: `components/overview/first-run-panel.tsx`
- Modify: `src/lib/first-run-status.ts`
- Test: `tests/first-run-polish-next.test.ts`

- [ ] Write a failing test requiring local setup steps for scan, folders, rates, Scan Health, and privacy-safe evidence.
- [ ] Run the test and confirm it fails if the new copy/steps are absent.
- [ ] Update first-run status and panel copy to make the path more decisive for empty installs.
- [ ] Run first-run and Overview tests plus `tsc`.
- [ ] Commit `feat: polish first run setup`.

### Task 9: Final Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] Add Unreleased changelog bullets for the eight-part bundle.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Run `npm run build`.
- [ ] Run `npm run projscan:doctor`.
- [ ] Run `node scripts/smoke-cli.mjs`.
- [ ] Start `npm run dev`, capture browser screenshots for `/`, `/diagnostics`, `/repair`, `/pricing`, `/sessions`, `/settings`, and stop the server.
- [ ] Commit `chore: document full polish hardening`.
