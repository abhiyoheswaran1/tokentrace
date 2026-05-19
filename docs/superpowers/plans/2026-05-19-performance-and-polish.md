# Performance And Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Overview load quickly on large local databases while polishing the daily-review path users see first.

**Architecture:** Keep the existing Next.js, SQLite, and Vitest stack. Register one deterministic SQLite helper for local calendar-day bucketing, use it in trend aggregation, and add an explicit Overview analytics profile so first-load work excludes secondary page analytics. Keep UI polish narrow and evidence-oriented.

**Tech Stack:** Next.js 15, React 19, TypeScript, better-sqlite3, Vitest, Tailwind, ProjScan.

---

## File Structure

- Modify: `src/db/client.ts`
  - Registers project-owned SQLite helper functions on the shared app database connection.
- Create: `src/db/sqlite-functions.ts`
  - Owns deterministic SQLite helper registration and the local date-key formatter.
- Modify: `src/lib/analytics.ts`
  - Uses `local_date_key(i.timestamp)` for trend aggregation.
  - Adds typed `analyticsProfile?: "full" | "overview"` options.
  - Skips secondary analytics when Overview requests the overview profile.
- Modify: `app/page.tsx`
  - Requests the overview analytics profile.
- Modify: `app/loading.tsx`
  - Adds local-only loading copy so slow route states communicate privacy and progress.
- Modify: `tests/localhost-performance-regressions.test.ts`
  - Adds source-level regression coverage for the trend bucketing and Overview analytics profile.
- Create: `tests/sqlite-functions.test.ts`
  - Verifies the local date-key helper formats local calendar labels and handles invalid timestamps.
- Modify: `tests/loading-state.test.tsx`
  - Locks in local-only loading copy.
- Modify: `CHANGELOG.md`
  - Records user-facing speed and polish changes under `Unreleased`.

---

### Task 1: Add Failing Performance Regression Tests

**Files:**
- Modify: `tests/localhost-performance-regressions.test.ts`
- Create: `tests/sqlite-functions.test.ts`

- [ ] **Step 1: Write the failing source-level trend performance test**

Add this test to `tests/localhost-performance-regressions.test.ts` inside the existing `describe` block:

```ts
  it("keeps trend aggregation off SQLite localtime bucketing", () => {
    const analytics = read("src/lib/analytics.ts");
    const client = read("src/db/client.ts");

    expect(analytics).toContain("local_date_key(i.timestamp) AS date");
    expect(analytics).not.toContain("'localtime'");
    expect(client).toContain("registerSqliteFunctions(sqlite)");
  });
```

- [ ] **Step 2: Write the failing Overview profile regression test**

Add this test to `tests/localhost-performance-regressions.test.ts` inside the existing `describe` block:

```ts
  it("keeps Overview on a page-specific analytics profile", () => {
    const overview = read("app/page.tsx");
    const analytics = read("src/lib/analytics.ts");

    expect(overview).toContain('analyticsProfile: "overview"');
    expect(analytics).toContain('analyticsProfile?: "full" | "overview"');
    expect(analytics).toContain('const overviewOnly = options.analyticsProfile === "overview"');
    expect(analytics).toContain('const models = overviewOnly ? [] : getModelRows(filters);');
    expect(analytics).toContain('const modelAliasSuggestions = overviewOnly ? [] : getModelAliasSuggestions(filters);');
    expect(analytics).toContain('const insights = overviewOnly ? [] : buildInsights({ summary, trends, models, projects, sessions });');
  });
```

- [ ] **Step 3: Write the failing SQLite helper unit test**

Create `tests/sqlite-functions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatLocalDateKey } from "@/src/db/sqlite-functions";

function localDay(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

describe("SQLite helper functions", () => {
  it("formats timestamps as local calendar date keys", () => {
    expect(formatLocalDateKey(localDay(2026, 5, 3))).toBe("2026-05-03");
    expect(formatLocalDateKey(localDay(2026, 12, 9))).toBe("2026-12-09");
  });

  it("returns a stable fallback date for invalid timestamps", () => {
    expect(formatLocalDateKey(null)).toBe("1970-01-01");
    expect(formatLocalDateKey(Number.NaN)).toBe("1970-01-01");
    expect(formatLocalDateKey("not-a-number")).toBe("1970-01-01");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail for the expected reason**

Run:

```bash
npm test -- tests/sqlite-functions.test.ts tests/localhost-performance-regressions.test.ts
```

Expected: `tests/sqlite-functions.test.ts` fails because `src/db/sqlite-functions.ts` does not exist, and the trend/profile regression tests fail because analytics still uses SQLite `'localtime'` and Overview has no `analyticsProfile`.

---

### Task 2: Implement Fast Local-Date Trend Bucketing

**Files:**
- Create: `src/db/sqlite-functions.ts`
- Modify: `src/db/client.ts`
- Modify: `src/lib/analytics.ts`

- [ ] **Step 1: Create SQLite helper registration**

Create `src/db/sqlite-functions.ts`:

```ts
import type { Database as SqliteDatabase } from "better-sqlite3";

export const localDateKeyFunctionName = "local_date_key";
const invalidDateKey = "1970-01-01";

function timestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

export function formatLocalDateKey(value: unknown) {
  const timestamp = timestampNumber(value);
  if (timestamp == null) return invalidDateKey;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return invalidDateKey;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function registerSqliteFunctions(sqlite: SqliteDatabase) {
  sqlite.function(localDateKeyFunctionName, { deterministic: true }, formatLocalDateKey);
}
```

- [ ] **Step 2: Register helper functions on the shared DB connection**

Modify `src/db/client.ts`:

```ts
import { registerSqliteFunctions } from "./sqlite-functions";
```

Then register immediately after the existing pragmas:

```ts
export const sqlite = new Database(dbPath);
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("foreign_keys = ON");
registerSqliteFunctions(sqlite);
applyMigrations(sqlite);
```

- [ ] **Step 3: Use the helper in trend aggregation**

In `src/lib/analytics.ts`, change the trend date expression inside `getTrends` from:

```sql
date(COALESCE(i.timestamp, 0) / 1000, 'unixepoch', 'localtime') AS date,
```

to:

```sql
local_date_key(i.timestamp) AS date,
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test -- tests/sqlite-functions.test.ts tests/trend-series.test.ts tests/localhost-performance-regressions.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 5: Measure the fixed local trend path**

Run:

```bash
node --import tsx -e "import { performance } from 'node:perf_hooks'; import { getAnalyticsData } from './src/lib/analytics.ts'; const start=performance.now(); const data=getAnalyticsData({}, { scanFileScope:'recent', sessionDetail:'summary' }); console.log(JSON.stringify({ ms:Number((performance.now()-start).toFixed(2)), interactions:data.summary.interactions, trends:data.trends.length }));"
```

Expected: total time is far below the previous 10 to 12 second baseline on the same local database. Record the measured number for the final report.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/db/client.ts src/db/sqlite-functions.ts src/lib/analytics.ts tests/sqlite-functions.test.ts tests/localhost-performance-regressions.test.ts
git commit -m "perf: speed up local trend aggregation"
```

---

### Task 3: Add Overview-Specific Analytics Profile

**Files:**
- Modify: `src/lib/analytics.ts`
- Modify: `app/page.tsx`
- Modify: `tests/localhost-performance-regressions.test.ts`

- [ ] **Step 1: Extend analytics options**

In `src/lib/analytics.ts`, update the options type from:

```ts
export type ScanTrustOptions = {
  scanFileScope?: "all" | "recent" | "latest" | "none";
  sessionDetail?: "full" | "summary";
};
```

to:

```ts
export type ScanTrustOptions = {
  scanFileScope?: "all" | "recent" | "latest" | "none";
  sessionDetail?: "full" | "summary";
  analyticsProfile?: "full" | "overview";
};
```

- [ ] **Step 2: Skip secondary analytics in the overview profile**

In `getAnalyticsData`, add:

```ts
  const overviewOnly = options.analyticsProfile === "overview";
```

Then replace the lower section of computed analytics with:

```ts
  const tools = getToolComparison(filters);
  const models = overviewOnly ? [] : getModelRows(filters);
  const projects = getProjectRows(filters);
  const sessions = getSessions(filters, options.sessionDetail ?? "full");
  const unknownCosts = getUnknownCostQueue(filters);
  const modelAliasSuggestions = overviewOnly ? [] : getModelAliasSuggestions(filters);
  const sessionComparisons = overviewOnly ? [] : buildSessionComparisons(sessions);
  const projectSignals = overviewOnly
    ? []
    : buildProjectSignals({
      totalTokens: summary.totalTokens,
      projects,
      sessions
    });
  const recommendations = buildLocalRecommendations({
    summary,
    tools,
    projects,
    unknownCosts,
    guardrails: usageGuardrails,
    scan: getLatestScanRecommendationStats()
  });
  const reviewQueue = overviewOnly
    ? []
    : buildReviewQueue({
      summary,
      guardrails: usageGuardrails,
      unknownCosts,
      sessions,
      projects,
      models,
      tools
    });
  const insights = overviewOnly ? [] : buildInsights({ summary, trends, models, projects, sessions });
```

- [ ] **Step 3: Request the overview profile from Overview**

In `app/page.tsx`, change:

```ts
const data = getAnalyticsData(range.filters, { scanFileScope: "recent", sessionDetail: "summary" });
```

to:

```ts
const data = getAnalyticsData(range.filters, {
  scanFileScope: "recent",
  sessionDetail: "summary",
  analyticsProfile: "overview"
});
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test -- tests/localhost-performance-regressions.test.ts tests/overview-release-polish.test.ts tests/usage-comparison.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 5: Measure Overview analytics again**

Run:

```bash
node --import tsx -e "import { performance } from 'node:perf_hooks'; import { getAnalyticsData } from './src/lib/analytics.ts'; const measure=(name, options)=>{ const start=performance.now(); const data=getAnalyticsData({}, options); console.log(JSON.stringify({ name, ms:Number((performance.now()-start).toFixed(2)), interactions:data.summary.interactions, models:data.models.length, insights:data.insights.length })); }; measure('overview', { scanFileScope:'recent', sessionDetail:'summary', analyticsProfile:'overview' }); measure('full', { scanFileScope:'recent', sessionDetail:'summary' });"
```

Expected: `overview` is faster than `full` and returns empty secondary arrays for `models` and `insights`.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/analytics.ts app/page.tsx tests/localhost-performance-regressions.test.ts
git commit -m "perf: trim overview analytics work"
```

---

### Task 4: Polish Local Loading Copy

**Files:**
- Modify: `app/loading.tsx`
- Modify: `tests/loading-state.test.tsx`
- Modify: `tests/final-polish-0-12.test.ts`

- [ ] **Step 1: Write failing loading-state copy tests**

Add these expectations to `tests/loading-state.test.tsx`:

```ts
    expect(source).toContain("Local database only");
    expect(source).toContain("No telemetry is sent while this view loads.");
```

Add the same expectations to the loading-state case in `tests/final-polish-0-12.test.ts`:

```ts
    expect(source).toContain("Local database only");
    expect(source).toContain("No telemetry is sent while this view loads.");
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/loading-state.test.tsx tests/final-polish-0-12.test.ts
```

Expected: both tests fail because the copy is not present yet.

- [ ] **Step 3: Add the local-only loading copy**

In `app/loading.tsx`, update the paragraph under `Loading local data` to:

```tsx
        <p className="mt-1 max-w-[65ch] text-sm leading-6 text-muted-foreground">
          Reading the local database and preparing the next view. No telemetry is sent while this view loads.
        </p>
```

In the "What is happening" block, change the heading and paragraph to:

```tsx
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Local database only</div>
          <p className="mt-1 leading-6 text-muted-foreground">
            TokenTrace is loading scan, evidence, and model-rate records already stored on this machine.
          </p>
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test -- tests/loading-state.test.tsx tests/final-polish-0-12.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/loading.tsx tests/loading-state.test.tsx tests/final-polish-0-12.test.ts
git commit -m "polish: clarify local loading state"
```

---

### Task 5: Changelog And Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update changelog**

Under `## Unreleased`, add:

```md
### Changed

- Overview trend aggregation now avoids SQLite localtime bucketing so large local databases load the first dashboard view much faster.
- Overview now uses a page-specific analytics profile to avoid computing secondary page insights during first load.
- Route loading copy now reinforces that TokenTrace is reading local database records without sending telemetry.
```

- [ ] **Step 2: Run focused verification**

Run:

```bash
npm test -- tests/sqlite-functions.test.ts tests/trend-series.test.ts tests/localhost-performance-regressions.test.ts tests/loading-state.test.tsx tests/final-polish-0-12.test.ts tests/overview-release-polish.test.ts tests/usage-comparison.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
npm run projscan:doctor
```

Expected: all commands exit 0. If `npm run projscan:doctor` requires network to fetch `projscan@latest`, rerun with escalation as required by the repository instructions.

- [ ] **Step 4: Measure final local analytics baseline**

Run:

```bash
node --import tsx -e "import { performance } from 'node:perf_hooks'; import { getAnalyticsData } from './src/lib/analytics.ts'; const start=performance.now(); const data=getAnalyticsData({}, { scanFileScope:'recent', sessionDetail:'summary', analyticsProfile:'overview' }); console.log(JSON.stringify({ ms:Number((performance.now()-start).toFixed(2)), interactions:data.summary.interactions, trends:data.trends.length }));"
```

Expected: local Overview analytics is far below the original 10 to 12 second baseline. Record the measured number.

- [ ] **Step 5: Commit**

Run:

```bash
git add CHANGELOG.md
git commit -m "docs: record performance and polish changes"
```

