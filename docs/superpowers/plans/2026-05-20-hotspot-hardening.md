# Hotspot Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce remaining high-risk hotspots without changing TokenTrace behavior.

**Architecture:** Move repair action semantics, Diagnostics panels, and Session Explorer filtering into focused modules. Keep public page/component APIs stable so app routes and tests continue to use the same entrypoints.

**Tech Stack:** Next.js App Router, React server/client components, Vitest, TypeScript, ProjScan.

---

### Task 1: Repair Action Module

**Files:**
- Create: `src/lib/repair-actions.ts`
- Modify: `src/lib/unknown-cost-repair.ts`
- Test: `tests/repair-actions-decomposition.test.ts`

- [ ] Write a failing static test that requires `src/lib/repair-actions.ts`, checks exports for `primaryRepairAction`, `secondaryRepairActions`, `repairImpact`, and `resolvedStateLabel`, and requires `src/lib/unknown-cost-repair.ts` to stay below 680 lines.
- [ ] Run `npm test -- tests/repair-actions-decomposition.test.ts`; expected failure is missing file and current line count above the threshold.
- [ ] Move `UnknownCostRepairAction*` types and action builder functions into `src/lib/repair-actions.ts`.
- [ ] Import those functions/types from `src/lib/unknown-cost-repair.ts` and keep type exports stable.
- [ ] Run `npm test -- tests/repair-actions-decomposition.test.ts tests/unknown-cost-repair.test.ts tests/repair-workflow-polish.test.ts`.
- [ ] Commit with `refactor: extract repair action helpers`.

### Task 2: Diagnostics Page Decomposition

**Files:**
- Create: `components/diagnostics/trust-checklist.tsx`
- Create: `components/diagnostics/doctor-report-panel.tsx`
- Create: `components/diagnostics/parser-panels.tsx`
- Create: `components/diagnostics/local-recommendations-card.tsx`
- Modify: `app/diagnostics/page.tsx`
- Test: `tests/diagnostics-decomposition.test.ts`

- [ ] Write a failing static test that requires the four diagnostics component files and keeps `app/diagnostics/page.tsx` below 180 lines.
- [ ] Run `npm test -- tests/diagnostics-decomposition.test.ts`; expected failure is missing component files and current page length above threshold.
- [ ] Move `TrustChecklist` and its local status helpers into `components/diagnostics/trust-checklist.tsx`.
- [ ] Move `DoctorReportPanel` into `components/diagnostics/doctor-report-panel.tsx`.
- [ ] Move `ParserTrustPanel`, `ScanDiffPanel`, `ScanHistoryPanel`, and `SourceCoveragePanel` into `components/diagnostics/parser-panels.tsx`.
- [ ] Move local recommendations card markup into `components/diagnostics/local-recommendations-card.tsx`.
- [ ] Reduce `app/diagnostics/page.tsx` to data assembly and panel composition.
- [ ] Run `npm test -- tests/diagnostics-decomposition.test.ts tests/localhost-performance-regressions.test.ts tests/doctor-report.test.ts`.
- [ ] Commit with `refactor: split diagnostics panels`.

### Task 3: Session Explorer Filtering Helpers

**Files:**
- Create: `components/session-explorer/filtering.ts`
- Modify: `components/session-explorer.tsx`
- Test: `tests/session-explorer-decomposition.test.ts`

- [ ] Write a failing static test requiring `components/session-explorer/filtering.ts`, exports for `filterSessions`, `summarizeSessions`, `getActiveSessionFilters`, and `getHighCostThreshold`, and `components/session-explorer.tsx` below 560 lines.
- [ ] Run `npm test -- tests/session-explorer-decomposition.test.ts`; expected failure is missing helper file and current component length above threshold.
- [ ] Move filter type aliases, high-cost threshold, filtered sessions, active filter labels, current filter serialization, and filtered summary logic into the helper file.
- [ ] Keep the client component responsible for state, event handlers, and rendering only.
- [ ] Run `npm test -- tests/session-explorer-decomposition.test.ts tests/session-explorer-polish.test.ts tests/session-explorer-pagination.test.tsx`.
- [ ] Commit with `refactor: extract session explorer filtering`.

### Task 4: Changelog And Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] Add Unreleased changelog bullets for repair action helper extraction, Diagnostics decomposition, and Session Explorer filtering helpers.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Run `npm run build`.
- [ ] Run `npm run projscan:doctor`.
- [ ] Run `node scripts/smoke-cli.mjs`.
- [ ] Restart `npm run dev` if `npm run build` overwrote `.next` during browser verification.
- [ ] Capture browser smoke screenshots for `/`, `/diagnostics`, `/sessions`, and `/repair`.
- [ ] Commit with `chore: document hotspot hardening`.
