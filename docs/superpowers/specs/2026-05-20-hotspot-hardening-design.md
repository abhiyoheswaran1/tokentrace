# Hotspot Hardening Design

## Context

The previous refinement pass reduced the first dashboard and analytics hotspots. ProjScan now shows the highest remaining risks as `app/diagnostics/page.tsx`, `src/lib/unknown-cost-repair.ts`, and `components/session-explorer.tsx`. This pass keeps behavior stable and focuses on clearer module boundaries, testable pure helpers, and lower page/component complexity.

## Approach

Use conservative decomposition rather than visual redesign. The existing UI should render the same information, but large files should stop owning unrelated responsibilities:

- Repair action copy and link semantics move from `unknown-cost-repair.ts` into a focused repair action module.
- Scan Health/Diagnostics panels move out of `app/diagnostics/page.tsx` into focused server component files.
- Session Explorer filtering, active filter labels, summaries, and pagination helpers move into a pure module that can be unit-tested without rendering the client component.

## Boundaries

No data model changes, no telemetry, no remote calls, no release/version changes, and no new dashboard feature surface. This is a hardening pass. User-facing copy can move between files, but labels and routes should remain consistent with the current product vocabulary.

## Testing

Add static decomposition guards before implementation, verify they fail for the current hotspots, then make the smallest refactors needed to pass. Existing behavior tests remain authoritative for repair workbench data, Session Explorer pagination/filter polish, diagnostics performance, build, and browser smoke.

## Verification

Run targeted tests after each slice, then finish with full `npm test`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run projscan:doctor`, CLI smoke, and browser smoke for Overview, Scan Health, Sessions, and Repair.
