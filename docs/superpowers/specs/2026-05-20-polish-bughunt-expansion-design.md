# Polish And Bug-Hunt Expansion Design

## Approved Scope

Implement the eight requested refinements as one coordinated hardening pass:

1. Mobile alternatives for wide Repair and Model Rates tables.
2. Split `src/lib/unknown-cost-repair.ts` into focused modules for keys, reviews, grouping, summaries, suggestions, and action shaping.
3. Move Pricing Settings save/import orchestration into a focused controller hook and tighten mobile model-rate editing.
4. Split ingestion scan lifecycle from file bookkeeping, adapter dispatch, dedupe decisions, and result shaping.
5. Split Evidence Trail metric definitions, query helpers, and session/source mapping into focused modules.
6. Add repair-delta feedback after pricing changes and scans so users can see what changed.
7. Add repeatable browser issue guard tooling for console errors, dev overlay issues, chart rendering, and mobile overflow.
8. Lazy-load dense Settings sections while preserving local-first copy and section navigation.

After implementation, run a broad bug-hunting pass over tests, ProjScan, build, CLI smoke, browser smoke, and issue-guard output.

## Product Direction

This is product UI, not brand UI. Keep the interface quiet, compact, and familiar. Use the existing TokenTrace visual system: warm background, white data surfaces, teal action states, orange secondary emphasis, small radius cards, system fonts, and clear confidence language. Do not add decorative motion, marketing panels, fake demo claims, or cloud-oriented copy.

## Architecture

Refactors should preserve public route and API behavior while reducing hotspot concentration. The route-facing files should become composition layers. Domain files should expose pure helpers that can be tested without the database where possible, and database-backed modules should keep SQL and persistence at clear boundaries.

Frontend mobile improvements should not hide dense data. On narrow screens, show task-focused cards before falling back to horizontal table overflow. Desktop tables stay intact because desktop users benefit from the current dense grid.

## Data Flow

- Unknown-cost repair data continues to originate from local SQLite interaction/session/model rows.
- Repair workbench groups should be built through query rows, keyed group mapping, review state attachment, summary calculation, and action shaping as separate stages.
- Pricing save/import/refresh actions should return a repair delta describing before/after unknown-cost counts, resolved repair groups, and remaining blocked causes.
- Scan should report the same output contract as today, with internals split into file classification, adapter detection, import persistence, scan-file recording, and final recalculation.
- Evidence Trail output remains the same shape while metric definitions and SQL helpers move to smaller modules.

## Browser Guard

Add a script under `scripts/` that starts from a running local dashboard URL, visits the main dense routes, fails on console/page errors, checks for Next dev overlay issue text, verifies chart canvases/SVGs are non-empty, and catches severe mobile horizontal overflow. The script should be usable in local bug hunts and CI-style smoke runs.

## Testing Strategy

Use TDD for behavior changes and decomposition guards:

- Static decomposition tests for new module boundaries.
- Pure helper tests for repair summaries, repair keys, pricing controller helpers, scan result shaping, and evidence metric clauses.
- UI source tests that ensure mobile card alternatives exist alongside tables.
- Existing domain tests for repair, scan, pricing, evidence, and settings.
- Full verification: `npm test`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run projscan:doctor`, `node scripts/smoke-cli.mjs`, browser issue guard, and targeted screenshots.

## Non-Goals

- No release, version bump, npm publish, tag, or GitHub release.
- No telemetry, cloud sync, browser extension, packet capture, or desktop scraping.
- No raw prompt/message body display in normal UI paths.
- No visual redesign beyond targeted product polish.
