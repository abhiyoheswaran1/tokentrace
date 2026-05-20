# Full Polish Hardening Design

## Goal

Reduce the remaining product and maintenance hotspots while improving the most important user paths: Overview, Scan Health, Repair, Pricing, ingestion, smoke verification, mobile navigation, and first-run setup.

## Scope

- Keep Overview as the fastest, clearest first screen by moving remaining inline panels out of `app/page.tsx` and exposing `getOverviewPageData()` as the route-facing data boundary.
- Split Doctor and Scan Health decision rules into pure modules so recommendations, zero-import explanations, freshness, note grouping, status summaries, and action selection can be tested independently.
- Decompose Repair into server data assembly and focused UI modules for guidance, focused items, summaries, and the repair table.
- Improve Pricing Settings with local validation, duplicate model-rate warnings, clearer repair return copy, and import/export affordances without adding remote telemetry.
- Harden Codex ingestion and persistence diagnostics with explicit malformed-file warnings, empty-input guardrails, and transaction-safe preflight behavior.
- Split `scripts/smoke-cli.mjs` into small smoke modules that report whether discovery, data commands, status-line/watch, or serve failed.
- Replace the cramped mobile horizontal nav with a compact command menu while preserving direct access to key routes.
- Strengthen first-run/no-data copy around local scan, folders, rates, Scan Health, and privacy boundaries.

## Non-Goals

- No package version bump, release, tag, npm publish, telemetry, cloud sync, browser extension, or raw prompt exposure.
- No redesign of the whole dashboard visual system.
- No parser rewrite beyond targeted Codex and persistence hardening.

## Architecture

The changes are intentionally file-boundary oriented. Routes stay thin and compose data plus panels. Pure rules live in `src/lib/*-rules.ts` or narrowly named helper modules. UI helpers live near their surfaces under `components/overview`, `components/repair`, `components/pricing`, and `components/navigation`.

## Testing

Each slice starts with a failing Vitest regression, then implementation, targeted test run, `tsc`, and commit. Final verification runs the full test suite, typecheck, production build, ProjScan doctor, CLI smoke, and browser screenshots for the affected routes.
