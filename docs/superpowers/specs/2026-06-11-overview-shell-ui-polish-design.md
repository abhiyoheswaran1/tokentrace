# Overview And Shell UI Polish Design

## Context

The approved scope is a focused product UI pass on the main `Overview` dashboard and app shell. ProjScan marks `app/page.tsx` and `components/sidebar.tsx` as the top UI hotspots, so this pass should improve the first-use experience without turning into a broad redesign.

TokenTrace remains a local-first developer utility. The UI must keep raw prompts and message bodies out of normal paths, avoid telemetry or cloud behavior, and keep exact, estimated, unknown, cached, and non-cache values distinct. The product context in `PRODUCT.md` and `DESIGN.md` sets the direction: quiet, precise, trustworthy, compact, and evidence-forward.

The working scene is a developer reviewing local CLI usage on a laptop while moving between a terminal, editor, and browser dashboard. A warm light UI fits that scene better than a dark observability wallboard because the user needs diagnostic clarity during normal work.

## Goals

- Make the shell easier to scan by grouping navigation into task areas while preserving current routes and active-state behavior.
- Improve the Overview first impression without marketing treatment, inflated metrics, gradients, glass, or decorative motion.
- Reduce the stack-of-cards feeling through clearer section rhythm, quieter page chrome, and a few purposeful surface variants.
- Help users distinguish facts, estimates, unknown values, cached tokens, and non-cache tokens near the numbers they affect.
- Preserve dense operational affordances: tables can scroll, filters stay compact, evidence links stay close to the data.
- Keep mobile navigation and Overview actions readable without creating tall wrappers or hidden diagnostic paths.

## Approach

Use a restrained product polish pass, not a new design system.

### App Shell

Group sidebar links into readable sections such as Analyze, Investigate, Maintain, and Reference. Keep the same URLs, labels where possible, and keyboard/link semantics. The active state should use a muted selected background, clear text contrast, and the existing teal action color. The sidebar footer should feel like product metadata, not a second content block.

On mobile, keep the current compact command menu and priority shortcuts. Improve labels and spacing only where they reduce wrapping or ambiguity. Do not replace the native `details` disclosure unless a failing test proves it blocks usability.

### Overview Header And Rhythm

Keep the `Overview` title direct. Change surrounding layout so the page reads as an operational workbench: header, period controls, health/pulse context, accounting summaries, trends, then repair and next-action surfaces.

Use section spacing to create rhythm. Major groups can use larger gaps; related panels should sit closer together. Avoid nested cards and avoid making every block visually identical. Existing cards remain the primary data surface, but some supporting strips can use muted or border-only treatments.

### Summary And Evidence Surfaces

Refine `TokenAccountingCard` and `CostSessionsCard` around source confidence:

- Token accounting should keep processed, fresh/non-cache, and cache numbers in one view, with labels that say what each total includes.
- Cache read/write and fresh input/output/reasoning should remain visible as supporting details.
- Cost should keep exact, estimated, and unknown split near the total.
- Evidence actions should read as local proof links, not promotional calls to action.

Use text labels, small structure, and table-like grouping before color. Teal marks actions/current state; orange is reserved for cost or negative deltas; muted neutrals handle secondary data.

## Testing

- Add or adjust focused source/render tests for sidebar grouping, active navigation treatment, and mobile command menu preservation.
- Add or adjust focused tests for Overview layout rhythm and the presence of exact/estimated/unknown/cache/non-cache copy near the affected numbers.
- Keep existing responsive tests green, especially `max-w-[100vw]`, table scrolling, and mobile action wrapping expectations.
- Run targeted Vitest files before broader verification.
- Run `npm run verify`.
- Run `npm run projscan:doctor`.
- Run a local dashboard smoke check with a browser screenshot or existing visual smoke script.

## Out Of Scope

- Route additions, data model changes, pricing logic changes, or database migrations.
- Release/version bumps, npm publishing, tags, or GitHub release work.
- Replacing the TokenTrace design system or global component vocabulary.
- Adding telemetry, cloud sync, raw prompt display, proxying, packet capture, browser extensions, or desktop scraping.
- Broad polish of `Sessions`, `Repair`, `Pricing`, or `Settings` beyond changes required by shared shell behavior.

## Spec Self-Review

- Placeholder scan: no unresolved placeholder markers.
- Consistency check: the scope stays on `Overview` and app shell, matching the approved shape.
- Scope check: this is a single implementation plan with shared shell and Overview component edits.
- Ambiguity check: verification commands and out-of-scope boundaries name the expected proof.
