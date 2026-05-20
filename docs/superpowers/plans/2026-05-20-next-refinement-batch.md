# Next Refinement Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the remaining CLI and analytics hotspots while making unknown-cost repair more directly actionable.

**Architecture:** Keep public imports stable and split internals behind focused modules. The CLI entrypoint becomes a thin dispatcher over `src/cli/*`; analytics keeps `src/lib/analytics.ts` as the public facade while moving domain queries to `src/lib/analytics/*`; repair adds an explicit action model consumed by the Repair page.

**Tech Stack:** Node ESM CLI, Next.js App Router, TypeScript, SQLite/better-sqlite3, Vitest, ProjScan.

---

### Task 1: CLI Module Boundaries

**Files:**
- Create: `src/cli/context.js`
- Create: `src/cli/help.js`
- Create: `src/cli/runtime.js`
- Create: `src/cli/serve.js`
- Create: `src/cli/commands.js`
- Modify: `bin/tokentrace.js`
- Test: `tests/cli-decomposition.test.ts`
- Test: `tests/serve-command.test.ts`

- [ ] **Step 1: Write failing static boundary test**

Add `tests/cli-decomposition.test.ts` asserting `bin/tokentrace.js` imports `createCliContext`, `serve`, and `runCliCommand`, has fewer than 180 lines, and no longer imports `get-port`, `open`, `node:readline/promises`, or `node:crypto`.

- [ ] **Step 2: Run red test**

Run: `npm test -- tests/cli-decomposition.test.ts`
Expected: FAIL because the modules do not exist and the bin is still large.

- [ ] **Step 3: Extract CLI modules**

Move existing logic without behavior changes:
- context: package root, invocation cwd, package JSON, app data dir, runtime env, `nextBin`.
- help: `help()` and `serveHelp()`.
- runtime: dashboard copy/build, runtime script spawning, database initialization.
- serve: port parsing, server readiness, progress, fixed-port errors, `serve()`.
- commands: command dispatch, statusline/reset/run wrapper helpers.

- [ ] **Step 4: Run focused CLI tests**

Run: `npm test -- tests/cli-decomposition.test.ts tests/serve-command.test.ts tests/statusline-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `refactor: split cli runtime modules`

### Task 2: Analytics Domain Modules

**Files:**
- Create: `src/lib/analytics/summary.ts`
- Create: `src/lib/analytics/trends.ts`
- Create: `src/lib/analytics/entities.ts`
- Create: `src/lib/analytics/repair.ts`
- Create: `src/lib/analytics/scan-trust.ts`
- Create: `src/lib/analytics/insights.ts`
- Modify: `src/lib/analytics.ts`
- Test: `tests/analytics-decomposition.test.ts`
- Test: `tests/analytics-scan-confidence.test.ts`

- [ ] **Step 1: Extend failing decomposition test**

Update `tests/analytics-decomposition.test.ts` to require the six domain modules and assert `src/lib/analytics.ts` stays below 320 lines.

- [ ] **Step 2: Run red test**

Run: `npm test -- tests/analytics-decomposition.test.ts`
Expected: FAIL because domain files are not present and `analytics.ts` is too large.

- [ ] **Step 3: Move query functions by domain**

Move functions mechanically:
- summary/comparison into `summary.ts`
- trends into `trends.ts`
- tools/models/projects/sessions into `entities.ts`
- unknown-cost queue/model alias suggestions into `repair.ts`
- debug/scan confidence/trust into `scan-trust.ts`
- recommendation stats and insight builder into `insights.ts`

- [ ] **Step 4: Keep public facade stable**

`src/lib/analytics.ts` should re-export public types and compose `getAnalyticsData()` from imported domain functions so existing app imports keep working.

- [ ] **Step 5: Run focused analytics tests**

Run: `npm test -- tests/analytics-decomposition.test.ts tests/analytics-scan-confidence.test.ts tests/localhost-performance-regressions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `refactor: split analytics domain queries`

### Task 3: Executable Repair Actions

**Files:**
- Modify: `src/lib/unknown-cost-repair.ts`
- Modify: `app/repair/page.tsx`
- Test: `tests/unknown-cost-repair.test.ts`
- Test: `tests/repair-workflow-polish.test.ts`

- [ ] **Step 1: Write failing action-model tests**

Add assertions that workbench groups expose `primaryAction`, `secondaryActions`, `impact`, and `resolvedStateLabel`.

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/unknown-cost-repair.test.ts tests/repair-workflow-polish.test.ts`
Expected: FAIL because action fields do not exist.

- [ ] **Step 3: Add action model**

Add typed repair actions:
- `set-model-rate` for missing pricing
- `review-parser` for missing model/token count/parser review
- `view-evidence`
- `open-focused-repair`
- `recalculate-after-change`

Each action includes `label`, `href`, `kind`, `description`, and `expectedChange`.

- [ ] **Step 4: Use action model on Repair page**

Replace repeated inline action decisions with `group.primaryAction`, `group.secondaryActions`, and `group.impact`.

- [ ] **Step 5: Run focused repair tests**

Run: `npm test -- tests/unknown-cost-repair.test.ts tests/repair-workflow-polish.test.ts tests/repair-action-labels.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `polish repair action model`

### Task 4: Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update changelog**

Add an Unreleased bullet for CLI module split, analytics domain split, and executable repair action model.

- [ ] **Step 2: Run final gates**

Run:
```bash
npm test
npx tsc --noEmit --pretty false
npm run build
npm run projscan:doctor
node scripts/smoke-cli.mjs
```

- [ ] **Step 3: Browser smoke**

Use Playwright screenshots against the running dev server for Overview and Repair mobile. Confirm the page renders styled content and no dev issue badge appears.

- [ ] **Step 4: Commit**

Commit: `chore: verify next refinement batch`

## Self-Review

- Spec coverage: covers CLI decomposition, analytics decomposition, repair action polish, changelog, and verification.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: action model fields are named once and reused by tests/page implementation.
