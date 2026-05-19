# Nightly Product Polish Design

## Context

The approved scope is the user's eight-item polish list from May 20, 2026: browser issue badge debugging, Overview and analytics hotspot splitting, query timing guardrails, Session Explorer polish, unknown-cost repair polish, Settings decomposition, mobile/responsive audit, and CLI startup/runtime polish.

TokenTrace remains a local-first developer utility. Changes must not add telemetry, cloud sync, raw prompt display, packet capture, browser extensions, or desktop scraping. UI work follows the product design context in `PRODUCT.md` and `DESIGN.md`: compact, evidence-backed, privacy-respecting, and restrained.

## Goals

- Remove or explain the browser "1 Issue" badge seen during visual smoke.
- Reduce the highest ProjScan risk by extracting Overview data assembly and Overview panels into focused files.
- Surface slow analytics queries in dev/test with a 500ms default threshold.
- Improve Session Explorer table ergonomics without changing data semantics.
- Make unknown-cost repair more decisive around top cause, next best repair, expected impact, and status copy.
- Split Settings into focused section components while preserving the current settings payload and API contract.
- Verify dense pages at mobile widths and fix obvious overflow, cramped buttons, and table behavior.
- Improve CLI help, serve startup messaging, and fixed-port conflict handling.

## Approach

Use a constrained refactor plus polish pass instead of redesigning the product. The highest-risk files get boundary extraction first: `src/lib/overview-data.ts` owns first-load Overview assembly, and `components/overview/*` owns Overview panels. `src/lib/analytics.ts` keeps shared analytics queries, but query timing is centralized in a small helper so future bottlenecks are visible in tests and doctor output.

Session Explorer, Repair, and Settings keep their routes and persisted data contracts. UI changes are additive and operational: sticky table headers, active filter chips, row density controls, clearer empty states, repair action framing, and settings section modules. Mobile fixes preserve horizontal scrolling for wide tables rather than hiding diagnostic columns.

CLI polish stays in `bin/tokentrace.js` and existing CLI tests. Serve startup should communicate local data, database initialization, dashboard build reuse/preparation, chosen URL, and fixed-port conflicts without changing default commands.

## Testing

- Add failing tests before each behavior change or bug fix.
- Keep structural regression tests for extraction boundaries so hotspots do not collapse back into the old large files.
- Add timing-helper tests without making the suite depend on wall-clock flaky thresholds.
- Use existing Vitest UI source tests for copy/layout expectations.
- Use Playwright or the existing visual smoke script for browser/runtime verification, plus mobile screenshots for Overview, Repair, Sessions, and Settings.
- Run `npm test`, `npm run build`, `npm run projscan:doctor`, and targeted ProjScan hotspots before completion.

## Out Of Scope

- Release/version bumps, npm publishing, tags, or GitHub release work.
- Changing database schema unless a failing test proves it is needed.
- Replacing the dashboard design system.
- Adding analytics services, telemetry, or external reporting.
