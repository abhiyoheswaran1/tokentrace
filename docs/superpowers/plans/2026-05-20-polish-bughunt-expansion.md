# Polish Bug-Hunt Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved eight-part polish and bug-hunt expansion while reducing top hotspots and preserving local-first behavior.

**Architecture:** Implement in reviewable slices with tests first. Keep desktop dense tables, add mobile card/list alternatives, split hotspot domain logic into pure helpers, and add a reusable browser issue guard for future bug hunts.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, SQLite, ProjScan, Playwright CLI/screenshots.

---

### Task 1: Mobile Alternatives For Repair And Model Rates

**Files:**
- Modify: `components/repair/repair-items-table.tsx`
- Modify: `components/pricing/model-rates-table.tsx`
- Test: `tests/mobile-table-alternatives.test.ts`

- [ ] Write a failing static/UI-source test asserting Repair has a mobile repair card list (`RepairItemsMobileList`) and Model Rates has a mobile model-rate card editor (`ModelRateMobileCards`) while desktop tables remain present.
- [ ] Run `npm test -- tests/mobile-table-alternatives.test.ts` and confirm it fails because the components do not exist.
- [ ] Add a mobile-only list before each dense table using `md:hidden`, preserving table markup behind `hidden md:block` or equivalent wrappers.
- [ ] Run `npm test -- tests/mobile-table-alternatives.test.ts tests/responsive-polish.test.ts tests/polish-bundle.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "feat: add mobile table alternatives"`.

### Task 2: Unknown-Cost Repair Module Split

**Files:**
- Create: `src/lib/unknown-cost-repair/types.ts`
- Create: `src/lib/unknown-cost-repair/keys.ts`
- Create: `src/lib/unknown-cost-repair/reviews.ts`
- Create: `src/lib/unknown-cost-repair/suggestions.ts`
- Create: `src/lib/unknown-cost-repair/workbench.ts`
- Modify: `src/lib/unknown-cost-repair.ts`
- Test: `tests/unknown-cost-repair-decomposition-next.test.ts`

- [ ] Write a failing decomposition test requiring `src/lib/unknown-cost-repair.ts` to re-export from focused modules and stay below 140 lines.
- [ ] Run `npm test -- tests/unknown-cost-repair-decomposition-next.test.ts` and confirm it fails.
- [ ] Move type definitions to `types.ts`.
- [ ] Move key generation/parsing and `repairItemHref` to `keys.ts`.
- [ ] Move review persistence and bulk state updates to `reviews.ts`.
- [ ] Move priced-model alias suggestions to `suggestions.ts`.
- [ ] Move SQL workbench building and summary math to `workbench.ts`.
- [ ] Keep `src/lib/unknown-cost-repair.ts` as the compatibility barrel.
- [ ] Run `npm test -- tests/unknown-cost-repair-decomposition-next.test.ts tests/unknown-cost-repair.test.ts tests/repair-workflow-polish.test.ts tests/repair-action-labels.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "refactor: split unknown cost repair"`.

### Task 3: Pricing Settings Controller And Mobile Density

**Files:**
- Create: `components/pricing/use-pricing-settings-controller.ts`
- Modify: `components/pricing-settings.tsx`
- Modify: `components/pricing/model-rates-table.tsx`
- Test: `tests/pricing-controller-polish.test.ts`

- [ ] Write a failing test requiring a controller hook with save, refresh, export, import, duplicate, and validation state names.
- [ ] Run `npm test -- tests/pricing-controller-polish.test.ts` and confirm it fails.
- [ ] Move `useState`, `useMemo`, transition orchestration, fetch calls, CSV import/export, and row update helpers from `components/pricing-settings.tsx` into the hook.
- [ ] Keep `PricingSettings` focused on component composition.
- [ ] Reuse the mobile card editor from Task 1 for denser row editing on narrow screens.
- [ ] Run `npm test -- tests/pricing-controller-polish.test.ts tests/pricing-settings-polish-next.test.ts tests/model-rates-copy.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "refactor: extract pricing settings controller"`.

### Task 4: Ingestion Scan Pipeline Split

**Files:**
- Create: `src/ingestion/scan-files.ts`
- Create: `src/ingestion/scan-adapters.ts`
- Create: `src/ingestion/scan-results.ts`
- Modify: `src/ingestion/scan.ts`
- Test: `tests/scan-pipeline-decomposition.test.ts`

- [ ] Write a failing decomposition test requiring `runScan` to import scan-file recording, adapter selection, dedupe checks, and result finalization from focused modules.
- [ ] Run `npm test -- tests/scan-pipeline-decomposition.test.ts` and confirm it fails.
- [ ] Move `insertScanFile`, parser metadata, and scan file warning/error aggregation to `scan-files.ts`.
- [ ] Move `selectAdapter`, parser detection warnings, and imported-hash checks to `scan-adapters.ts`.
- [ ] Move stale non-usage purge and final `RunScanResult` shaping to `scan-results.ts`.
- [ ] Keep `runScan` as the orchestration loop with unchanged public return shape.
- [ ] Run `npm test -- tests/scan-pipeline-decomposition.test.ts tests/run-scan.test.ts tests/scan-health.test.ts tests/parser-trust.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "refactor: split scan pipeline"`.

### Task 5: Evidence Trail Decomposition

**Files:**
- Create: `src/lib/evidence/metrics.ts`
- Create: `src/lib/evidence/query.ts`
- Create: `src/lib/evidence/mapping.ts`
- Modify: `src/lib/evidence-trail.ts`
- Test: `tests/evidence-trail-decomposition.test.ts`

- [ ] Write a failing test requiring metric definitions, SQL where helpers, token expressions, and session mapping to live outside `evidence-trail.ts`.
- [ ] Run `npm test -- tests/evidence-trail-decomposition.test.ts` and confirm it fails.
- [ ] Move `EvidenceMetric`, metric titles, metric parsing, and `evidenceHref` support to `metrics.ts`.
- [ ] Move date/current-month clauses, `evidenceWhere`, and `metricTokenExpression` to `query.ts`.
- [ ] Move source/session href mapping and number coercion to `mapping.ts`.
- [ ] Keep `buildEvidenceTrail` output unchanged.
- [ ] Run `npm test -- tests/evidence-trail-decomposition.test.ts tests/evidence-trail.test.ts tests/evidence-pack.test.ts tests/evidence-drilldown-flow.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "refactor: split evidence trail"`.

### Task 6: Repair Delta Feedback

**Files:**
- Create: `src/lib/repair-delta.ts`
- Modify: `src/lib/pricing.ts`
- Modify: `app/api/prices/route.ts`
- Modify: `src/ingestion/scan.ts`
- Modify: `components/pricing/pricing-workflow.ts`
- Modify: `components/pricing-settings.tsx` or controller hook
- Test: `tests/repair-delta-feedback.test.ts`

- [ ] Write a failing test for `buildRepairDelta(before, after)` returning before/after unknown counts, resolved groups, and remaining causes.
- [ ] Run `npm test -- tests/repair-delta-feedback.test.ts` and confirm it fails.
- [ ] Add `src/lib/repair-delta.ts` with pure delta helpers.
- [ ] Capture repair workbench summaries before and after pricing upsert and scan recalculation.
- [ ] Include `repairDelta` in `/api/prices` responses and scan result metadata.
- [ ] Surface copy in Pricing Settings save/import messages: resolved groups, unknown-cost count moved from before to after, and remaining top cause.
- [ ] Run `npm test -- tests/repair-delta-feedback.test.ts tests/unknown-cost-repair.test.ts tests/pricing-settings-polish-next.test.ts tests/run-scan.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "feat: show repair delta feedback"`.

### Task 7: Automated Browser Issue Guard

**Files:**
- Create: `scripts/browser-issue-guard.mjs`
- Modify: `package.json`
- Test: `tests/browser-issue-guard.test.ts`

- [ ] Write a failing static test requiring the script to check console errors, page errors, dev overlay issue text, chart non-empty state, and mobile overflow.
- [ ] Run `npm test -- tests/browser-issue-guard.test.ts` and confirm it fails.
- [ ] Implement a Playwright-based script that accepts `BROWSER_GUARD_BASE_URL`, visits `/`, `/repair`, `/pricing`, `/sessions`, and `/settings`, and exits non-zero with route-specific issue output.
- [ ] Add `browser:guard` npm script.
- [ ] Run `npm test -- tests/browser-issue-guard.test.ts`.
- [ ] Run the script against the running dev server on `http://localhost:3000`.
- [ ] Commit with `git commit -m "feat: add browser issue guard"`.

### Task 8: Lazy-Load Dense Settings Sections

**Files:**
- Modify: `components/settings-panel.tsx`
- Create: `components/settings/lazy-settings-section.tsx`
- Test: `tests/settings-lazy-sections.test.tsx`

- [ ] Write a failing test requiring lower settings sections to be wrapped in a lazy/visibility section helper while anchors remain stable.
- [ ] Run `npm test -- tests/settings-lazy-sections.test.tsx` and confirm it fails.
- [ ] Add a client helper that keeps section anchors present and defers heavy content until visible or after idle.
- [ ] Wrap Import Profiles, Package Trust, Exports, and lower scan details where it does not break saved anchors.
- [ ] Run `npm test -- tests/settings-lazy-sections.test.tsx tests/settings-decomposition.test.ts tests/final-polish-0-12.test.ts tests/settings.test.ts`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Commit with `git commit -m "feat: lazy load dense settings sections"`.

### Task 9: Bug Hunt And Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] Update `CHANGELOG.md` under Unreleased for the new user-facing polish and guard tooling.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Run `npm run build`.
- [ ] Run `npm run projscan:doctor`.
- [ ] Run `node scripts/smoke-cli.mjs`.
- [ ] Run `npm run browser:guard` against the running dev server.
- [ ] Capture targeted screenshots for `/`, `/repair`, `/pricing`, `/sessions`, and `/settings` at desktop and mobile widths.
- [ ] Inspect dev server logs for runtime warnings or errors.
- [ ] Run `npx projscan@latest hotspots --limit 20 --format console` and summarize remaining hotspots honestly.
- [ ] Commit changelog and final verification test adjustments with `git commit -m "chore: document bughunt polish"`.
