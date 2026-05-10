# Package Trust And Usage Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 0.5.0 package trust, release automation, usage comparison, scan history, and verification guardrails.

**Architecture:** Keep package checks in scripts and tests, release automation in GitHub Actions, usage comparison in `src/lib/analytics.ts`, and UI presentation in existing Overview, Doctor, and Settings surfaces. Do not add new ingestion scope.

**Tech Stack:** Next.js App Router, SQLite, Vitest, ESLint, npm audit, ProjScan, GitHub Actions Trusted Publishing.

---

### Task 1: Package Trust

**Files:**
- Modify: `next.config.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/package-inspect.mjs`
- Create: `tests/package-trust.test.ts`

- [x] Add failing tests for no install scripts, readable Next server bundles, and patched dependency floors.
- [x] Disable Next server minification for generated server bundles.
- [x] Add package inspection for lifecycle scripts, dependency floors, and generated route bundle readability.
- [x] Raise Next, Drizzle ORM, and PostCSS floors.
- [x] Remove unused `date-fns`.
- [x] Run `npm audit --omit=dev --audit-level=high`.

### Task 2: Release Automation

**Files:**
- Create: `.github/workflows/npm-publish.yml`
- Create: `.github/workflows/security.yml`
- Modify: `docs/RELEASE_CHECKLIST.md`

- [x] Add tag-gated npm Trusted Publishing workflow.
- [x] Add package verification, audit, and ProjScan security workflow.
- [x] Document full changelog release notes requirement.
- [x] Add automated changelog-section extraction for GitHub Release notes.
- [x] Update existing `v0.4.0` GitHub Release body with the full 0.4.0 changelog section.

### Task 3: Repo Hygiene

**Files:**
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `.projscanrc`
- Create: `eslint.config.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

- [x] Add ESLint, Prettier, EditorConfig, and ProjScan config.
- [x] Add `npm run lint` to verification.
- [x] Tune ProjScan to ignore Next App Router export false positives.
- [x] Run `npx projscan@latest doctor`.

### Task 4: Usage Pulse

**Files:**
- Create: `tests/usage-comparison.test.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `app/page.tsx`

- [x] Add failing tests for selected-period and latest-seven-day comparisons.
- [x] Add usage comparison analytics.
- [x] Add Overview Usage Pulse UI with token, cost, session, and unknown-cost deltas.

### Task 5: Scan History And Settings Trust

**Files:**
- Modify: `app/diagnostics/page.tsx`
- Modify: `components/settings-panel.tsx`

- [x] Add recent scan history to Scan Doctor.
- [x] Add package trust panel to Settings.

### Task 6: Final Verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `SECURITY.md`

- [x] Run `npm run package:test`.
- [x] Run `npm run package:inspect`.
- [x] Run `npm audit --omit=dev --audit-level=high`.
- [x] Run `npx projscan@latest doctor`.
- [x] Smoke test a packed tarball install.
- [x] Check `git status --short` for generated files.
- [x] Update changelog with the final 0.5.0 change list.
- [x] Do not tag, push, or publish until the maintainer explicitly asks.
