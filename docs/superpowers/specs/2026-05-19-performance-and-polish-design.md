# TokenTrace Performance & Product Polish Design

## Goal

Make TokenTrace feel faster, smoother, and more dependable on large local
databases while improving the daily dashboard path that users see first.

## Product Thesis

TokenTrace is a local investigative tool. It earns trust when the first screen
responds quickly, states uncertainty precisely, and sends users to the next
repair or evidence action without making them wait for unrelated analytics.

This pass should make speed visible and measurable. The main product outcome is
that Overview loads quickly on a large local database, then supports a calmer
daily-review path through Overview, Scan Health, Repair, and Recommendations.

## Evidence From Exploration

- `getScanTrustData({}, { scanFileScope: "recent", sessionDetail: "summary" })`
  measured around 140 ms on the current local database.
- `getAnalyticsData({}, { scanFileScope: "recent", sessionDetail: "summary" })`
  measured around 10 to 12 seconds on the same database with 139,404
  interactions.
- Query timing showed the trend aggregation as the dominant cost. The query
  using SQLite's `'localtime'` date modifier measured around 9 to 10 seconds.
- Equivalent UTC date bucketing measured around 50 ms, and a deterministic
  JavaScript local-date SQLite function measured around 90 ms while preserving
  local calendar-day behavior.
- ProjScan ranked `app/page.tsx` and `src/lib/analytics.ts` as the highest-risk
  hotspots due to size, churn, and cyclomatic complexity.
- Existing locality/performance regression coverage in
  `tests/localhost-performance-regressions.test.ts` passed before this design.

## Scope

### Fast Overview Analytics

Overview should only pay for the data it renders.

- Replace the slow trend bucketing path with a faster local-date strategy that
  preserves local calendar-day labels.
- Add regression coverage that would fail if trend aggregation returns to a
  multi-second path on large local datasets.
- Keep missing-day fill behavior, date-range filtering, and all-time trend
  behavior intact.
- Avoid changing token, cost, cache, session, or confidence semantics.
- Reduce duplicated or unrelated Overview work where the page computes
  downstream analytics that belong to Models, Projects, Pricing, Sessions, or
  Optimisation.

### Daily-Review Product Polish

The first-use and daily-review path should be compact, evidence-backed, and
easier to scan.

- Keep Overview focused on token accounting, cost and sessions, confidence,
  trends, review status, top repair items, guardrails, recommendations, and tool
  mix.
- Tighten copy where UI states can be misunderstood, especially exact,
  estimated, unknown, cached, non-cache, and parser-review states.
- Improve empty, partial, loading, and repair states without adding decorative
  dashboard chrome.
- Preserve the current restrained product visual language: warm neutral
  surfaces, compact controls, clear tables, restrained teal/orange accent use,
  and no marketing-style hero treatment.
- Keep route changes and chart hydration smooth with lightweight placeholders
  instead of blank or frozen-looking panels.

### Bug Hunting

Bug hunting should follow the measured performance path rather than becoming a
separate broad refactor.

- Inspect trend bucketing, date boundaries, scan freshness, and repair links for
  correctness while optimizing.
- Check for duplicated data reads between Overview, Scan Health, and shared
  analytics helpers.
- Add focused regression tests for any bug found before changing production
  code.
- Keep raw prompts and message bodies out of normal UI paths.

## Architecture

The implementation stays inside the existing Next.js, React, SQLite, Drizzle,
and Vitest stack. No new runtime dependency is required.

The performance fix belongs close to `src/db/client.ts` and
`src/lib/analytics.ts`:

- Register a deterministic SQLite helper for local calendar date keys when the
  database connection is created.
- Use that helper in trend aggregation instead of SQLite's expensive
  `'localtime'` modifier.
- Keep date labels formatted as `YYYY-MM-DD` so existing chart and fill logic
  stays unchanged.

The Overview polish should be narrow:

- Prefer page-specific analytics options over a new broad abstraction.
- If `getAnalyticsData` needs option flags, make them explicit and typed.
- Avoid a large component split unless a touched block is already blocking the
  implementation or testability.

## Data Flow

1. The dashboard opens Overview.
2. Overview resolves the selected date range.
3. The analytics loader computes summary, confidence, trend, tool, repair,
   guardrail, recommendation, and review data needed by the rendered page.
4. Trend aggregation groups interactions by local calendar date using the fast
   local-date key helper.
5. Existing fill logic inserts zero-value days between the first and last
   relevant date.
6. Overview renders the primary accounting and review panels without waiting on
   analytics that only feed secondary pages.

## Error Handling

- If a timestamp is null, trend aggregation continues to ignore it.
- If a timestamp is malformed, the local-date helper should return a stable
  fallback date rather than throw during a dashboard render.
- If a large local database has no trend rows, existing empty-state behavior
  remains intact.
- If the performance regression test cannot create enough rows in time, the
  test should use a realistic but bounded fixture size and assert relative query
  behavior through deterministic code paths rather than wall-clock fragility
  alone.

## Testing Strategy

- Add a TDD regression test for local trend bucketing that verifies existing
  missing-day behavior and local calendar labels still hold.
- Add a performance-oriented regression test that seeds a large enough local
  fixture to catch the slow `'localtime'` path without making normal test runs
  brittle.
- Extend `tests/localhost-performance-regressions.test.ts` or add a focused
  analytics performance test to assert the slow SQLite localtime modifier is no
  longer used in trend aggregation.
- Run targeted tests first:
  - `npm test -- tests/trend-series.test.ts`
  - `npm test -- tests/localhost-performance-regressions.test.ts`
  - Relevant tests for any UI polish touched.
- Run broader verification after implementation:
  - `npm test`
  - `npm run build`
  - `npm run projscan:doctor`

## Documentation

- Update `CHANGELOG.md` under `Unreleased` for user-facing speed, smoothness,
  and polish improvements.
- Do not update version numbers, release notes for a shipped version, package
  metadata, git tags, npm publishing state, or GitHub release state.

## Non-Goals

- No release, version bump, tag, push, npm publish, or GitHub release.
- No cloud sync, telemetry, proxying, packet capture, browser extension, or
  desktop app scraping.
- No raw prompt or message body exposure in normal UI paths.
- No broad redesign of TokenTrace.
- No large architecture split unless the measured implementation proves it is
  needed for correctness or performance.
