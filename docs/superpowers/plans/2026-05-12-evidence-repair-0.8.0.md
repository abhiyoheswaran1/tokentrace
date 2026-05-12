# TokenTrace 0.8.0 Evidence + Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 0.8.0 Evidence + Repair release so major metrics, unknown costs, parser coverage, and scan changes are traceable and repairable.

**Architecture:** Add focused deterministic builders for evidence trails, unknown-cost repair state, parser trust, and scan diffs. Keep UI pages thin and reuse the same builders for CLI JSON so dashboard and terminal behavior do not drift.

**Tech Stack:** Next.js App Router, React server/client components, SQLite with `better-sqlite3`, Drizzle schema declarations, Vitest, existing CLI runtime bundling through `scripts/build-cli-runtime.mjs`.

---

## Release Constraints

- Do not bump `package.json`.
- Do not tag.
- Do not push.
- Do not create a GitHub Release.
- Do not publish npm.
- Keep all analysis local and deterministic.
- Preserve CLI-only scope: no app scraping, browser extension, proxying, packet sniffing, cloud sync, accounts, or telemetry.

## File Structure

Create:

- `src/lib/evidence-trail.ts`: builds metric-to-session/source/parser/pricing evidence models and stable evidence URLs.
- `tests/evidence-trail.test.ts`: unit tests for evidence grouping and links.
- `app/evidence/page.tsx`: focused evidence detail page for metrics that need source, parser, and pricing context together.
- `src/lib/unknown-cost-repair.ts`: groups unknown-cost rows, alias hints, and local review state.
- `tests/unknown-cost-repair.test.ts`: unit tests for cause grouping, state, and alias suggestions.
- `app/repair/page.tsx`: Unknown Cost Repair Workbench.
- `app/api/repair-items/route.ts`: local review state updates for repair groups.
- `src/lib/parser-trust.ts`: parser coverage grouped by tool, parser, source, status, version, and reason.
- `tests/parser-trust.test.ts`: parser trust coverage tests.
- `src/lib/scan-diff.ts`: latest-vs-previous scan comparison and zero-import explanation model.
- `tests/scan-diff.test.ts`: scan diff tests.
- `scripts/evidence.ts`: `tokentrace evidence --json`.
- `scripts/repair.ts`: `tokentrace repair --json`.

Modify:

- `src/db/schema.ts`: add `unknown_cost_reviews` table declaration.
- `src/db/migrate-core.ts`: create `unknown_cost_reviews` table and indexes.
- `src/lib/analytics.ts`: expose evidence links and replacement repair workbench rows without growing page logic.
- `src/lib/doctor.ts`: include parser trust and scan diff in `DoctorReport`.
- `app/page.tsx`: route major metric cards to evidence pages and route unknown cost to repair workbench.
- `app/diagnostics/page.tsx`: add Parser Trust Report and Scan History Diff panels.
- `app/sessions/page.tsx`: accept `evidence` query context and keep filtered Evidence Trail banner.
- `components/session-explorer.tsx`: support explicit evidence labels without changing filter semantics.
- `components/pricing-settings.tsx`: link alias suggestions back to repair groups when present.
- `scripts/doctor.ts`: render scan diff and parser trust in text/JSON through `DoctorReport`.
- `scripts/insights.ts`: include repair workbench summary in JSON.
- `scripts/build-cli-runtime.mjs`: bundle `evidence.ts` and `repair.ts`.
- `scripts/smoke-cli.mjs`: smoke new CLI commands.
- `bin/tokentrace.js`: add `evidence` and `repair` commands.
- `README.md`: update command list and screenshots only after visible UI changes are stable.
- `CHANGELOG.md`: add 0.8.0 Unreleased entries as cards land.

## Task 1: Repair Review State Storage

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/migrate-core.ts`
- Create: `src/lib/unknown-cost-repair.ts`
- Test: `tests/unknown-cost-repair.test.ts`

- [ ] **Step 1: Write failing repair-state persistence test**

Add this test scaffold to `tests/unknown-cost-repair.test.ts`:

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadRepair() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-repair-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ getUnknownCostReview, saveUnknownCostReview }, { sqlite }] = await Promise.all([
    import("@/src/lib/unknown-cost-repair"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getUnknownCostReview, saveUnknownCostReview, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("unknown cost repair state", () => {
  it("persists local review state by stable repair key", async () => {
    const { getUnknownCostReview, saveUnknownCostReview } = await loadRepair();

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toEqual({
      key: "missing-pricing:Anthropic:claude-new",
      state: "unresolved",
      note: "",
      updatedAt: null
    });

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-new",
      state: "ignored",
      note: "Internal experimental model, not priced yet."
    });

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toMatchObject({
      key: "missing-pricing:Anthropic:claude-new",
      state: "ignored",
      note: "Internal experimental model, not priced yet."
    });
    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new").updatedAt).toEqual(expect.any(Number));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unknown-cost-repair.test.ts
```

Expected: FAIL because `src/lib/unknown-cost-repair.ts` does not exist.

- [ ] **Step 3: Add table declaration and migration**

In `src/db/schema.ts`, add:

```ts
export const unknownCostReviews = sqliteTable("unknown_cost_reviews", {
  key: text("key").primaryKey(),
  state: text("state").notNull().default("unresolved"),
  note: text("note").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
});
```

Export its type near the other type exports:

```ts
export type UnknownCostReview = typeof unknownCostReviews.$inferSelect;
```

In `src/db/migrate-core.ts`, add this DDL before the closing backtick:

```sql
CREATE TABLE IF NOT EXISTS unknown_cost_reviews (
  key TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'unresolved',
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

- [ ] **Step 4: Add minimal repair-state implementation**

Create `src/lib/unknown-cost-repair.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";

export type UnknownCostReviewState = "unresolved" | "ignored" | "resolved" | "needs-parser-review";

export type UnknownCostReviewModel = {
  key: string;
  state: UnknownCostReviewState;
  note: string;
  updatedAt: number | null;
};

function normalizeState(value: unknown): UnknownCostReviewState {
  if (value === "ignored" || value === "resolved" || value === "needs-parser-review") return value;
  return "unresolved";
}

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, 500) : "";
}

export function getUnknownCostReview(key: string): UnknownCostReviewModel {
  const row = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, key)).get();
  return {
    key,
    state: normalizeState(row?.state),
    note: normalizeNote(row?.note),
    updatedAt: row?.updatedAt?.getTime() ?? null
  };
}

export function saveUnknownCostReview(input: {
  key: string;
  state: UnknownCostReviewState;
  note?: string;
}) {
  const next = {
    key: input.key,
    state: normalizeState(input.state),
    note: normalizeNote(input.note),
    updatedAt: new Date()
  };
  db.insert(unknownCostReviews)
    .values(next)
    .onConflictDoUpdate({
      target: unknownCostReviews.key,
      set: {
        state: next.state,
        note: next.note,
        updatedAt: next.updatedAt
      }
    })
    .run();
  return getUnknownCostReview(input.key);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm test -- tests/unknown-cost-repair.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrate-core.ts src/lib/unknown-cost-repair.ts tests/unknown-cost-repair.test.ts
git commit -m "Add unknown cost repair state"
```

## Task 2: Evidence Trail Builder

**Files:**
- Create: `src/lib/evidence-trail.ts`
- Test: `tests/evidence-trail.test.ts`
- Modify: `src/lib/analytics.ts`

- [ ] **Step 1: Write failing evidence trail tests**

Create `tests/evidence-trail.test.ts` with a temp database setup matching existing analytics tests. Add:

```ts
describe("evidence trail", () => {
  it("builds metric evidence from sessions, source files, parser data, and pricing rows", async () => {
    const { buildEvidenceTrail, evidenceHref, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite.prepare(
      "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
    ).run();
    sqlite.prepare(
      "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', 10, 'Refactor parser', '/tmp/claude.jsonl')"
    ).run();
    sqlite.prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, role, model_id, input_tokens, output_tokens, cache_read_tokens, total_tokens, token_confidence, cost)
       VALUES
        ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet', 100, 50, 500, 650, 'exact', 0.01)`
    ).run();
    sqlite.prepare(
      "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 1, 1, '[]', '[]')"
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('file-1', 'scan-1', '/tmp/claude.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"confidence":0.95,"reason":"Claude project transcript"}')`
    ).run();

    const trail = buildEvidenceTrail({ metric: "processed-tokens" });

    expect(evidenceHref("processed-tokens")).toBe("/evidence?metric=processed-tokens");
    expect(trail).toMatchObject({
      metric: "processed-tokens",
      title: "Processed tokens",
      totals: {
        tokens: 650,
        sessions: 1,
        interactions: 1,
        unknownCostInteractions: 0
      }
    });
    expect(trail.sessions[0]).toMatchObject({
      id: "session-1",
      title: "Refactor parser",
      sourceFile: "/tmp/claude.jsonl",
      parser: "claude-code",
      parserConfidence: 0.95,
      pricingHref: "/pricing?model=claude-sonnet-4-5"
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/evidence-trail.test.ts
```

Expected: FAIL because `src/lib/evidence-trail.ts` does not exist.

- [ ] **Step 3: Create evidence trail types and href helper**

Create `src/lib/evidence-trail.ts` with:

```ts
import { sqlite } from "@/src/db/client";

export type EvidenceMetric =
  | "processed-tokens"
  | "non-cache-tokens"
  | "cached-tokens"
  | "estimated-cost"
  | "sessions"
  | "unknown-cost"
  | "guardrails"
  | "review-queue";

export type EvidenceTrailSession = {
  id: string;
  title: string;
  tool: string;
  provider: string;
  project: string;
  model: string;
  sourceFile: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  tokenConfidence: string;
  totalTokens: number;
  cost: number | null;
  interactions: number;
  sessionHref: string;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type EvidenceTrail = {
  metric: EvidenceMetric;
  title: string;
  description: string;
  totals: {
    tokens: number;
    cost: number;
    sessions: number;
    interactions: number;
    unknownCostInteractions: number;
  };
  sessions: EvidenceTrailSession[];
};

const metricTitles: Record<EvidenceMetric, { title: string; description: string }> = {
  "processed-tokens": {
    title: "Processed tokens",
    description: "All input, output, cache, and reasoning tokens from imported local CLI records."
  },
  "non-cache-tokens": {
    title: "Non-cache tokens",
    description: "Fresh input, output, and reasoning tokens, excluding cache read/write tokens."
  },
  "cached-tokens": {
    title: "Cached tokens",
    description: "Cache read and cache write tokens reported by supported tools."
  },
  "estimated-cost": {
    title: "Estimated cost",
    description: "Cost calculated from editable model pricing, including exact, estimated, and unknown rows."
  },
  sessions: {
    title: "Sessions",
    description: "Imported local CLI sessions and their interaction evidence."
  },
  "unknown-cost": {
    title: "Unknown cost",
    description: "Interactions whose cost cannot be calculated because model, price, or token counts are missing."
  },
  guardrails: {
    title: "Monthly guardrails",
    description: "Current-month usage contributing to local guardrail progress."
  },
  "review-queue": {
    title: "Review queue",
    description: "Evidence behind deterministic local review recommendations."
  }
};

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function evidenceHref(metric: EvidenceMetric, params: Record<string, string | null | undefined> = {}) {
  return withQuery("/evidence", { metric, ...params });
}
```

- [ ] **Step 4: Implement metric filters and SQL builder**

Continue in `src/lib/evidence-trail.ts` with a `buildEvidenceTrail()` implementation that:

```ts
export function buildEvidenceTrail(input: { metric: EvidenceMetric }): EvidenceTrail {
  const metric = input.metric;
  const config = metricTitles[metric] ?? metricTitles["processed-tokens"];
  const where =
    metric === "cached-tokens"
      ? "WHERE (i.cache_read_tokens + i.cache_write_tokens) > 0"
      : metric === "unknown-cost"
        ? "WHERE i.cost IS NULL"
        : metric === "non-cache-tokens"
          ? "WHERE (i.input_tokens + i.output_tokens + i.reasoning_tokens) > 0"
          : "";

  const sessions = sqlite.prepare(
    `SELECT
      s.id,
      COALESCE(s.title, t.name || ' session') AS title,
      t.name AS tool,
      p.name AS provider,
      COALESCE(pr.name, 'Unassigned') AS project,
      COALESCE(GROUP_CONCAT(DISTINCT COALESCE(m.name, 'unknown')), 'unknown') AS model,
      s.source_file AS sourceFile,
      sf.parser AS parser,
      sf.status AS parserStatus,
      json_extract(sf.raw_metadata, '$.confidence') AS parserConfidence,
      CASE
        WHEN SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END) > 0 THEN 'unknown'
        WHEN SUM(CASE WHEN i.estimated_tokens = 1 THEN 1 ELSE 0 END) > 0 THEN 'estimated'
        ELSE 'exact'
      END AS tokenConfidence,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.cost), 0) AS cost,
      SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END) AS unknownCostInteractions,
      COUNT(i.id) AS interactions
     FROM interactions i
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     JOIN providers p ON p.id = t.provider_id
     LEFT JOIN projects pr ON pr.id = s.project_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN scan_files sf ON sf.path = s.source_file
     ${where}
     GROUP BY s.id
     ORDER BY totalTokens DESC
     LIMIT 100`
  ).all() as Array<Omit<EvidenceTrailSession, "sessionHref" | "sourceHref" | "parserHref" | "pricingHref"> & {
    parserConfidence: number | null;
    unknownCostInteractions: number;
  }>;

  const mapped = sessions.map((session) => ({
    ...session,
    parserConfidence: typeof session.parserConfidence === "number" ? session.parserConfidence : null,
    cost: metric === "unknown-cost" && session.unknownCostInteractions > 0 ? null : session.cost,
    sessionHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
    sourceHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
    parserHref: withQuery("/parser-debug", { source: session.sourceFile }),
    pricingHref: session.model && session.model !== "unknown" ? withQuery("/pricing", { model: session.model.split(",")[0].trim() }) : null
  }));

  return {
    metric,
    title: config.title,
    description: config.description,
    totals: mapped.reduce(
      (totals, session) => {
        totals.tokens += session.totalTokens;
        totals.cost += session.cost ?? 0;
        totals.sessions += 1;
        totals.interactions += session.interactions;
        totals.unknownCostInteractions += session.unknownCostInteractions;
        return totals;
      },
      { tokens: 0, cost: 0, sessions: 0, interactions: 0, unknownCostInteractions: 0 }
    ),
    sessions: mapped
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/evidence-trail.test.ts
```

Expected: PASS.

- [ ] **Step 6: Expose evidence links in analytics**

In `src/lib/analytics.ts`, import `evidenceHref` and add:

```ts
import { evidenceHref, type EvidenceMetric } from "@/src/lib/evidence-trail";

export type EvidenceLinkMap = Record<EvidenceMetric, string>;
```

Add `evidenceLinks: EvidenceLinkMap;` to `AnalyticsData`.

Inside `getAnalyticsData()`, add:

```ts
const evidenceLinks = {
  "processed-tokens": evidenceHref("processed-tokens"),
  "non-cache-tokens": evidenceHref("non-cache-tokens"),
  "cached-tokens": evidenceHref("cached-tokens"),
  "estimated-cost": evidenceHref("estimated-cost"),
  sessions: evidenceHref("sessions"),
  "unknown-cost": evidenceHref("unknown-cost"),
  guardrails: evidenceHref("guardrails"),
  "review-queue": evidenceHref("review-queue")
};
```

Return it on `AnalyticsData`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/evidence-trail.ts tests/evidence-trail.test.ts src/lib/analytics.ts
git commit -m "Add metric evidence trail model"
```

## Task 3: Evidence Detail Page And Overview Links

**Files:**
- Create: `app/evidence/page.tsx`
- Modify: `app/page.tsx`
- Test: `tests/evidence-trail.test.ts`

- [ ] **Step 1: Add route-level metric validation test**

Extend `tests/evidence-trail.test.ts`:

```ts
it("falls back to processed token evidence for unknown metric ids", async () => {
  const { parseEvidenceMetric } = await loadEvidence();

  expect(parseEvidenceMetric("cached-tokens")).toBe("cached-tokens");
  expect(parseEvidenceMetric("not-real")).toBe("processed-tokens");
  expect(parseEvidenceMetric(undefined)).toBe("processed-tokens");
});
```

- [ ] **Step 2: Add parser helper**

In `src/lib/evidence-trail.ts`, add:

```ts
const metricIds = new Set<EvidenceMetric>(Object.keys(metricTitles) as EvidenceMetric[]);

export function parseEvidenceMetric(value: unknown): EvidenceMetric {
  return typeof value === "string" && metricIds.has(value as EvidenceMetric)
    ? value as EvidenceMetric
    : "processed-tokens";
}
```

- [ ] **Step 3: Create evidence page**

Create `app/evidence/page.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, MonoText, PageHeader } from "@/components/ui/typography";
import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";
import { formatCurrency, formatTokens } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default async function EvidencePage({
  searchParams
}: {
  searchParams?: Promise<{ metric?: string }>;
}) {
  const params = await searchParams;
  const trail = buildEvidenceTrail({ metric: parseEvidenceMetric(params?.metric) });

  return (
    <div className="space-y-6">
      <PageHeader title={trail.title} description={trail.description} />

      <div className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Tokens</div>
          <DataValue className="mt-1" size="md">{formatTokens(trail.totals.tokens)}</DataValue>
        </div>
        <div className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Cost</div>
          <DataValue className="mt-1" size="md">{formatCurrency(trail.totals.cost)}</DataValue>
        </div>
        <div className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Sessions</div>
          <DataValue className="mt-1" size="md">{trail.totals.sessions.toLocaleString()}</DataValue>
        </div>
        <div className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Unknown cost</div>
          <DataValue className="mt-1" size="md">{trail.totals.unknownCostInteractions.toLocaleString()}</DataValue>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Sessions</CardTitle>
          <CardDescription>Sessions, source files, parsers, confidence, and pricing rows behind this metric.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table className="min-w-[72rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Source file</TableHead>
                <TableHead>Parser</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trail.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="max-w-sm">
                    <div className="font-medium">{session.title}</div>
                    <div className="text-xs text-muted-foreground">{session.project} / {session.tool}</div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    <MonoText className="block truncate">{session.sourceFile}</MonoText>
                  </TableCell>
                  <TableCell>
                    <Link href={session.parserHref} className="font-medium text-primary underline-offset-4 hover:underline">
                      {session.parser ?? "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.tokenConfidence === "exact" ? "success" : session.tokenConfidence === "unknown" ? "warning" : "secondary"}>
                      {session.tokenConfidence}
                    </Badge>
                  </TableCell>
                  <TableCell>{session.model}</TableCell>
                  <TableCell>{formatTokens(session.totalTokens)}</TableCell>
                  <TableCell>{session.cost == null ? "Unknown" : formatCurrency(session.cost)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link href={session.sessionHref} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                        Sessions <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {session.pricingHref ? (
                        <Link href={session.pricingHref} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                          Pricing
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Update Overview metric links**

In `app/page.tsx`, replace metric `href` values:

```tsx
href={data.evidenceLinks["processed-tokens"]}
```

```tsx
href={data.evidenceLinks["non-cache-tokens"]}
```

```tsx
href={data.evidenceLinks["cached-tokens"]}
```

```tsx
href={summary.unknownCostInteractions > 0 ? "/repair" : data.evidenceLinks["estimated-cost"]}
```

```tsx
href={data.evidenceLinks.sessions}
```

- [ ] **Step 5: Run focused tests**

```bash
npm test -- tests/evidence-trail.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/evidence/page.tsx app/page.tsx src/lib/evidence-trail.ts tests/evidence-trail.test.ts
git commit -m "Add evidence detail page"
```

## Task 4: Unknown Cost Repair Workbench

**Files:**
- Modify: `src/lib/unknown-cost-repair.ts`
- Create: `app/repair/page.tsx`
- Create: `app/api/repair-items/route.ts`
- Modify: `app/page.tsx`
- Modify: `components/pricing-settings.tsx`
- Test: `tests/unknown-cost-repair.test.ts`

- [ ] **Step 1: Add failing grouped workbench test**

Extend `tests/unknown-cost-repair.test.ts`:

```ts
it("groups unknown cost by cause, source, model, and local review state", async () => {
  const { buildUnknownCostRepairWorkbench, saveUnknownCostReview, sqlite } = await loadRepair();

  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
  sqlite.prepare(
    "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('unpriced', 'anthropic', 'claude-new', NULL, NULL, 'USD')"
  ).run();
  sqlite.prepare(
    "INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', '/tmp/claude.jsonl')"
  ).run();
  sqlite.prepare(
    "INSERT INTO interactions (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost) VALUES ('i1', 'i1-source', 'session-1', 'assistant', 'unpriced', 1000, 'exact', NULL)"
  ).run();

  saveUnknownCostReview({
    key: "missing-pricing:Anthropic:claude-new:/tmp/claude.jsonl",
    state: "needs-parser-review",
    note: "Model name may be a vendor alias."
  });

  const workbench = buildUnknownCostRepairWorkbench();

  expect(workbench.summary).toEqual({
    unresolved: 0,
    ignored: 0,
    resolved: 0,
    needsParserReview: 1,
    totalInteractions: 1
  });
  expect(workbench.groups[0]).toMatchObject({
    key: "missing-pricing:Anthropic:claude-new:/tmp/claude.jsonl",
    cause: "missing pricing",
    provider: "Anthropic",
    model: "claude-new",
    state: "needs-parser-review",
    note: "Model name may be a vendor alias.",
    repairHref: "/pricing?model=claude-new"
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unknown-cost-repair.test.ts
```

Expected: FAIL because `buildUnknownCostRepairWorkbench` does not exist.

- [ ] **Step 3: Implement repair group builder**

In `src/lib/unknown-cost-repair.ts`, add:

```ts
import { sqlite } from "@/src/db/client";
import { modelNameCandidates } from "@/src/lib/model-aliases";

export type UnknownCostRepairCause =
  | "missing model"
  | "missing pricing"
  | "missing token count"
  | "missing provider"
  | "parser review"
  | "other";

export type UnknownCostRepairGroup = {
  key: string;
  cause: UnknownCostRepairCause;
  provider: string;
  tool: string;
  model: string;
  sourceFile: string;
  interactions: number;
  sessions: number;
  totalTokens: number;
  suggestedModel: string | null;
  state: UnknownCostReviewState;
  note: string;
  repairHref: string;
  sessionsHref: string;
  parserHref: string;
};

export type UnknownCostRepairWorkbench = {
  summary: {
    unresolved: number;
    ignored: number;
    resolved: number;
    needsParserReview: number;
    totalInteractions: number;
  };
  groups: UnknownCostRepairGroup[];
};

function causeFor(row: { model: string; provider: string | null; totalTokens: number; tokenConfidence: string }) {
  if (!row.provider) return "missing provider";
  if (row.model === "unknown" || row.model === "<unknown>") return "missing model";
  if (row.totalTokens <= 0 || row.tokenConfidence === "unknown") return "missing token count";
  return "missing pricing";
}

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function buildUnknownCostRepairWorkbench(): UnknownCostRepairWorkbench {
  const rows = sqlite.prepare(
    `SELECT
      COALESCE(p.name, 'Unknown') AS provider,
      p.id AS providerId,
      t.name AS tool,
      COALESCE(m.name, 'unknown') AS model,
      s.source_file AS sourceFile,
      MAX(i.token_confidence) AS tokenConfidence,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COUNT(i.id) AS interactions,
      COUNT(DISTINCT s.id) AS sessions
     FROM interactions i
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = COALESCE(m.provider_id, t.provider_id)
     WHERE i.cost IS NULL
     GROUP BY p.id, t.id, m.id, s.source_file
     ORDER BY interactions DESC, totalTokens DESC`
  ).all() as Array<{
    provider: string;
    providerId: string | null;
    tool: string;
    model: string;
    sourceFile: string;
    tokenConfidence: string;
    totalTokens: number;
    interactions: number;
    sessions: number;
  }>;

  const pricedModels = sqlite.prepare(
    "SELECT provider_id AS providerId, name FROM models WHERE input_token_price IS NOT NULL AND output_token_price IS NOT NULL"
  ).all() as Array<{ providerId: string; name: string }>;

  const groups = rows.map((row) => {
    const cause = causeFor(row);
    const key = `${cause}:${row.provider}:${row.model}:${row.sourceFile}`;
    const review = getUnknownCostReview(key);
    const suggested = modelNameCandidates(row.model)
      .map((candidate) => pricedModels.find((model) => model.providerId === row.providerId && model.name === candidate)?.name)
      .find((value): value is string => Boolean(value)) ?? null;

    return {
      key,
      cause,
      provider: row.provider,
      tool: row.tool,
      model: row.model,
      sourceFile: row.sourceFile,
      interactions: Number(row.interactions) || 0,
      sessions: Number(row.sessions) || 0,
      totalTokens: Number(row.totalTokens) || 0,
      suggestedModel: suggested,
      state: review.state,
      note: review.note,
      repairHref: cause === "missing pricing"
        ? withQuery("/pricing", { model: row.model })
        : withQuery("/parser-debug", { source: row.sourceFile }),
      sessionsHref: withQuery("/sessions", { source: row.sourceFile, cost: "unknown" }),
      parserHref: withQuery("/parser-debug", { source: row.sourceFile })
    };
  });

  return {
    summary: groups.reduce(
      (summary, group) => {
        if (group.state === "ignored") summary.ignored += 1;
        else if (group.state === "resolved") summary.resolved += 1;
        else if (group.state === "needs-parser-review") summary.needsParserReview += 1;
        else summary.unresolved += 1;
        summary.totalInteractions += group.interactions;
        return summary;
      },
      { unresolved: 0, ignored: 0, resolved: 0, needsParserReview: 0, totalInteractions: 0 }
    ),
    groups
  };
}
```

- [ ] **Step 4: Add repair API**

Create `app/api/repair-items/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveUnknownCostReview } from "@/src/lib/unknown-cost-repair";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const body = await request.json();
  if (!body.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  const saved = saveUnknownCostReview({
    key: body.key,
    state: body.state,
    note: body.note
  });
  return NextResponse.json(saved);
}
```

- [ ] **Step 5: Create repair page**

Create `app/repair/page.tsx` as a server page that calls `buildUnknownCostRepairWorkbench()` and renders:

- summary strip: unresolved, needs parser review, ignored, resolved, interactions;
- table columns: state, cause, model, suggestion, source, interactions, tokens, actions;
- action links to sessions, parser, and pricing;
- state form using a small client component only if inline state changes are needed.

If inline state changes are built now, create `components/repair-state-control.tsx` with a `fetch("/api/repair-items", { method: "PUT" })` call. If not, render state and keep API for the next card.

- [ ] **Step 6: Route Overview unknown-cost queue to workbench**

In `app/page.tsx`:

- Change `Unknown Cost Repair Queue` button from `/diagnostics` to `/repair`.
- Change estimated cost metric unknown action from `/sessions?cost=unknown` to `/repair`.

- [ ] **Step 7: Run tests**

```bash
npm test -- tests/unknown-cost-repair.test.ts tests/analytics-scan-confidence.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/unknown-cost-repair.ts tests/unknown-cost-repair.test.ts app/repair/page.tsx app/api/repair-items/route.ts app/page.tsx components/pricing-settings.tsx
git commit -m "Add unknown cost repair workbench"
```

## Task 5: Parser Trust Report

**Files:**
- Create: `src/lib/parser-trust.ts`
- Test: `tests/parser-trust.test.ts`
- Modify: `src/lib/doctor.ts`
- Modify: `app/diagnostics/page.tsx`

- [ ] **Step 1: Write failing parser trust test**

Create `tests/parser-trust.test.ts`:

```ts
describe("parser trust report", () => {
  it("groups latest scan files by parser, status, source family, and version", async () => {
    const { buildParserTrustReport, sqlite } = await loadParserTrust();

    sqlite.prepare(
      "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 3, 1, '[]', '[]')"
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('file-1', 'scan-1', '/home/demo/.claude/projects/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"parserVersion":1,"confidence":0.95,"reason":"Claude transcript"}'),
        ('file-2', 'scan-1', '/home/demo/.claude/cache/noise.json', 100, 'ignored', 'ignored_non_usage', 0, '[]', '[]', '{"ignoreReason":"Claude support cache"}'),
        ('file-3', 'scan-1', '/home/demo/.codex/session.jsonl', 100, 'codex-cli', 'skipped_unknown', 0, '[]', '[]', '{"reason":"Unrecognized Codex shape"}')`
    ).run();

    const report = buildParserTrustReport();

    expect(report.summary).toEqual({
      imported: 1,
      importedWithErrors: 0,
      ignored: 1,
      unsupported: 1,
      failed: 0,
      duplicate: 0
    });
    expect(report.parsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parser: "claude-code",
          version: "1",
          imported: 1,
          sourceFamily: "Claude"
        }),
        expect.objectContaining({
          parser: "ignored",
          ignored: 1,
          sourceFamily: "Claude"
        })
      ])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/parser-trust.test.ts
```

Expected: FAIL because `src/lib/parser-trust.ts` does not exist.

- [ ] **Step 3: Implement parser trust builder**

Create `src/lib/parser-trust.ts` with:

```ts
import { sqlite } from "@/src/db/client";

export type ParserTrustRow = {
  parser: string;
  version: string;
  sourceFamily: "Claude" | "Codex" | "OpenAI" | "Generic" | "Unknown";
  imported: number;
  importedWithErrors: number;
  ignored: number;
  unsupported: number;
  failed: number;
  duplicate: number;
  recordsImported: number;
  latestReason: string;
};

export type ParserTrustReport = {
  summary: {
    imported: number;
    importedWithErrors: number;
    ignored: number;
    unsupported: number;
    failed: number;
    duplicate: number;
  };
  parsers: ParserTrustRow[];
};

function sourceFamily(path: string): ParserTrustRow["sourceFamily"] {
  if (path.includes("/.claude/")) return "Claude";
  if (path.includes("/.codex/")) return "Codex";
  if (path.includes("/.openai/")) return "OpenAI";
  if (path.includes("/.ai/")) return "Generic";
  return "Unknown";
}

function statusBucket(status: string) {
  if (status === "imported") return "imported";
  if (status === "imported_with_errors") return "importedWithErrors";
  if (status === "ignored_non_usage") return "ignored";
  if (status === "skipped_unknown") return "unsupported";
  if (status === "skipped_duplicate") return "duplicate";
  if (status === "failed") return "failed";
  return "unsupported";
}

export function buildParserTrustReport(): ParserTrustReport {
  const latest = sqlite.prepare("SELECT id FROM scan_runs ORDER BY started_at DESC LIMIT 1").get() as { id: string } | undefined;
  if (!latest) {
    return {
      summary: { imported: 0, importedWithErrors: 0, ignored: 0, unsupported: 0, failed: 0, duplicate: 0 },
      parsers: []
    };
  }

  const files = sqlite.prepare(
    `SELECT path, parser, status, records_imported AS recordsImported, raw_metadata AS rawMetadata
     FROM scan_files
     WHERE scan_run_id = ?`
  ).all(latest.id) as Array<{
    path: string;
    parser: string | null;
    status: string;
    recordsImported: number;
    rawMetadata: string | null;
  }>;

  const byKey = new Map<string, ParserTrustRow>();
  const summary = { imported: 0, importedWithErrors: 0, ignored: 0, unsupported: 0, failed: 0, duplicate: 0 };

  for (const file of files) {
    const metadata = file.rawMetadata ? JSON.parse(file.rawMetadata) as Record<string, unknown> : {};
    const parser = file.parser ?? "none";
    const version = String(metadata.parserVersion ?? metadata.version ?? "unknown");
    const family = sourceFamily(file.path);
    const key = `${parser}:${version}:${family}`;
    const bucket = statusBucket(file.status);
    summary[bucket] += 1;

    const row = byKey.get(key) ?? {
      parser,
      version,
      sourceFamily: family,
      imported: 0,
      importedWithErrors: 0,
      ignored: 0,
      unsupported: 0,
      failed: 0,
      duplicate: 0,
      recordsImported: 0,
      latestReason: ""
    };
    row[bucket] += 1;
    row.recordsImported += Number(file.recordsImported) || 0;
    row.latestReason = String(metadata.reason ?? metadata.ignoreReason ?? row.latestReason ?? "");
    byKey.set(key, row);
  }

  return {
    summary,
    parsers: Array.from(byKey.values()).sort((a, b) => b.recordsImported - a.recordsImported || a.parser.localeCompare(b.parser))
  };
}
```

- [ ] **Step 4: Add parser trust to DoctorReport**

In `src/lib/doctor.ts`:

- Import `buildParserTrustReport` and `ParserTrustReport`.
- Add `parserTrust: ParserTrustReport;` to `DoctorReport`.
- Inside `buildDoctorReport`, compute `const parserTrust = buildParserTrustReport();`.
- Return `parserTrust`.

- [ ] **Step 5: Render parser trust in Doctor**

In `app/diagnostics/page.tsx`, add a `ParserTrustPanel` below `DoctorReportPanel` or within it. Use existing `Table` and `Badge`.

Required columns:

- Parser
- Version
- Source
- Imported
- Ignored
- Unsupported
- Failed
- Records
- Latest reason

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/parser-trust.test.ts tests/doctor-report.test.ts
```

Expected: PASS after updating doctor report expectations if needed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/parser-trust.ts tests/parser-trust.test.ts src/lib/doctor.ts app/diagnostics/page.tsx
git commit -m "Add parser trust report"
```

## Task 6: Scan History Diff

**Files:**
- Create: `src/lib/scan-diff.ts`
- Test: `tests/scan-diff.test.ts`
- Modify: `src/lib/doctor.ts`
- Modify: `app/diagnostics/page.tsx`
- Modify: `scripts/doctor.ts`

- [ ] **Step 1: Write failing scan diff test**

Create `tests/scan-diff.test.ts`:

```ts
describe("scan history diff", () => {
  it("compares latest scan with the previous scan and explains zero imports", async () => {
    const { buildScanDiff, sqlite } = await loadScanDiff();

    sqlite.prepare(
      "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-old', 1, 2, 2, 2, '[]', '[]'), ('scan-new', 3, 4, 3, 0, '[]', '[]')"
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('old-1', 'scan-old', '/tmp/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{}'),
        ('old-2', 'scan-old', '/tmp/b.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{}'),
        ('new-1', 'scan-new', '/tmp/a.jsonl', 100, 'claude-code', 'skipped_duplicate', 0, '[]', '[]', '{}'),
        ('new-2', 'scan-new', '/tmp/b.jsonl', 100, 'claude-code', 'skipped_duplicate', 0, '[]', '[]', '{}'),
        ('new-3', 'scan-new', '/tmp/cache.json', 100, 'ignored', 'ignored_non_usage', 0, '[]', '[]', '{}')`
    ).run();

    expect(buildScanDiff()).toMatchObject({
      latestScanId: "scan-new",
      previousScanId: "scan-old",
      delta: {
        filesScanned: 1,
        recordsImported: -2,
        duplicates: 2,
        ignored: 1
      },
      explanation: "The latest scan imported nothing because files were already imported duplicates or known non-usage support files."
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/scan-diff.test.ts
```

Expected: FAIL because `src/lib/scan-diff.ts` does not exist.

- [ ] **Step 3: Implement scan diff builder**

Create `src/lib/scan-diff.ts`:

```ts
import { sqlite } from "@/src/db/client";

export type ScanDiff = {
  latestScanId: string | null;
  previousScanId: string | null;
  latestCompletedAt: number | null;
  previousCompletedAt: number | null;
  current: ScanDiffCounts;
  previous: ScanDiffCounts;
  delta: ScanDiffCounts;
  explanation: string | null;
};

export type ScanDiffCounts = {
  filesScanned: number;
  recordsImported: number;
  imported: number;
  importedWithErrors: number;
  duplicates: number;
  ignored: number;
  unsupported: number;
  failed: number;
};

const emptyCounts: ScanDiffCounts = {
  filesScanned: 0,
  recordsImported: 0,
  imported: 0,
  importedWithErrors: 0,
  duplicates: 0,
  ignored: 0,
  unsupported: 0,
  failed: 0
};

function countsFor(scanId: string | null): ScanDiffCounts {
  if (!scanId) return { ...emptyCounts };
  const run = sqlite.prepare("SELECT files_scanned AS filesScanned, records_imported AS recordsImported FROM scan_runs WHERE id = ?").get(scanId) as
    | { filesScanned: number; recordsImported: number }
    | undefined;
  const statuses = sqlite.prepare(
    "SELECT status, COUNT(*) AS count FROM scan_files WHERE scan_run_id = ? GROUP BY status"
  ).all(scanId) as Array<{ status: string; count: number }>;
  const byStatus = Object.fromEntries(statuses.map((row) => [row.status, Number(row.count) || 0]));
  return {
    filesScanned: Number(run?.filesScanned) || 0,
    recordsImported: Number(run?.recordsImported) || 0,
    imported: byStatus.imported ?? 0,
    importedWithErrors: byStatus.imported_with_errors ?? 0,
    duplicates: byStatus.skipped_duplicate ?? 0,
    ignored: byStatus.ignored_non_usage ?? 0,
    unsupported: byStatus.skipped_unknown ?? 0,
    failed: byStatus.failed ?? 0
  };
}

function zeroImportExplanation(counts: ScanDiffCounts) {
  if (counts.recordsImported > 0) return null;
  const blocking = counts.duplicates + counts.ignored + counts.unsupported + counts.failed;
  if (blocking === 0 && counts.filesScanned === 0) return "The latest scan checked no files.";
  if (counts.duplicates > 0 && counts.ignored > 0 && counts.unsupported === 0 && counts.failed === 0) {
    return "The latest scan imported nothing because files were already imported duplicates or known non-usage support files.";
  }
  if (counts.duplicates > 0 && counts.duplicates === blocking) return "The latest scan imported nothing because all candidates were duplicates.";
  if (counts.ignored > 0 && counts.ignored === blocking) return "The latest scan imported nothing because only known non-usage support files were found.";
  if (counts.unsupported > 0 && counts.unsupported === blocking) return "The latest scan imported nothing because candidates were unsupported by current parsers.";
  if (counts.failed > 0 && counts.failed === blocking) return "The latest scan imported nothing because parser failures blocked imports.";
  return "The latest scan imported nothing because candidates were duplicates, ignored, unsupported, or failed.";
}

export function buildScanDiff(): ScanDiff {
  const runs = sqlite.prepare(
    "SELECT id, completed_at AS completedAt FROM scan_runs ORDER BY started_at DESC LIMIT 2"
  ).all() as Array<{ id: string; completedAt: number | null }>;
  const latest = runs[0] ?? null;
  const previous = runs[1] ?? null;
  const current = countsFor(latest?.id ?? null);
  const previousCounts = countsFor(previous?.id ?? null);
  const delta = Object.fromEntries(
    Object.keys(current).map((key) => [
      key,
      current[key as keyof ScanDiffCounts] - previousCounts[key as keyof ScanDiffCounts]
    ])
  ) as ScanDiffCounts;

  return {
    latestScanId: latest?.id ?? null,
    previousScanId: previous?.id ?? null,
    latestCompletedAt: latest?.completedAt ?? null,
    previousCompletedAt: previous?.completedAt ?? null,
    current,
    previous: previousCounts,
    delta,
    explanation: latest ? zeroImportExplanation(current) : null
  };
}
```

- [ ] **Step 4: Add scan diff to DoctorReport and CLI**

In `src/lib/doctor.ts`:

- Import `buildScanDiff` and `ScanDiff`.
- Add `scanDiff: ScanDiff;` to `DoctorReport`.
- Return `scanDiff: buildScanDiff()`.

In `scripts/doctor.ts`, add text lines:

```ts
report.scanDiff.explanation ? `Scan diff: ${report.scanDiff.explanation}` : null,
`Scan delta: ${report.scanDiff.delta.filesScanned.toLocaleString()} files, ${report.scanDiff.delta.recordsImported.toLocaleString()} records`
```

- [ ] **Step 5: Render scan diff in Doctor**

In `app/diagnostics/page.tsx`, add a `ScanDiffPanel` showing:

- latest scan id/date;
- previous scan id/date;
- current counts;
- previous counts;
- delta counts;
- explanation.

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/scan-diff.test.ts tests/doctor-report.test.ts
```

Expected: PASS after updating doctor report expectations if needed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scan-diff.ts tests/scan-diff.test.ts src/lib/doctor.ts app/diagnostics/page.tsx scripts/doctor.ts
git commit -m "Add scan history diff"
```

## Task 7: CLI Evidence And Repair Commands

**Files:**
- Create: `scripts/evidence.ts`
- Create: `scripts/repair.ts`
- Modify: `bin/tokentrace.js`
- Modify: `scripts/build-cli-runtime.mjs`
- Modify: `scripts/smoke-cli.mjs`
- Test: `tests/evidence-trail.test.ts`, `tests/unknown-cost-repair.test.ts`

- [ ] **Step 1: Add runtime build entries**

In `scripts/build-cli-runtime.mjs`, add:

```js
["scripts/evidence.ts", "dist/runtime/evidence.mjs"],
["scripts/repair.ts", "dist/runtime/repair.mjs"],
```

to the existing entry list.

- [ ] **Step 2: Add `scripts/evidence.ts`**

Create:

```ts
import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";

const args = process.argv.slice(2);
const metricArg = args.find((arg) => arg.startsWith("--metric="))?.slice("--metric=".length);
const trail = buildEvidenceTrail({ metric: parseEvidenceMetric(metricArg) });

if (args.includes("--json")) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...trail
  }, null, 2));
} else {
  console.log(`TokenTrace Evidence: ${trail.title}`);
  console.log(trail.description);
  console.log(`${trail.totals.sessions.toLocaleString()} sessions, ${trail.totals.interactions.toLocaleString()} interactions, ${trail.totals.tokens.toLocaleString()} tokens`);
  for (const session of trail.sessions.slice(0, 8)) {
    console.log(`- ${session.title}: ${session.totalTokens.toLocaleString()} tokens, ${session.sourceFile}`);
  }
}
```

- [ ] **Step 3: Add `scripts/repair.ts`**

Create:

```ts
import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";

const args = process.argv.slice(2);
const workbench = buildUnknownCostRepairWorkbench();

if (args.includes("--json")) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...workbench
  }, null, 2));
} else {
  console.log("TokenTrace Unknown Cost Repair");
  console.log(`${workbench.summary.totalInteractions.toLocaleString()} unknown-cost interactions`);
  for (const group of workbench.groups.slice(0, 8)) {
    console.log(`- ${group.cause}: ${group.model} (${group.interactions.toLocaleString()} interactions)`);
    console.log(`  ${group.repairHref}`);
  }
}
```

- [ ] **Step 4: Wire CLI commands**

In `bin/tokentrace.js`:

- Add help lines:

```text
  tokentrace evidence --json
                        Print metric evidence trail as JSON
  tokentrace repair --json
                        Print unknown-cost repair queue as JSON
```

- Add command handlers next to `doctor` and `insights`:

```js
if (command === "evidence") {
  await runRuntimeScript("evidence.mjs", args.slice(1));
  return;
}

if (command === "repair") {
  await runRuntimeScript("repair.mjs", args.slice(1));
  return;
}
```

Use the existing runtime invocation helper pattern in `bin/tokentrace.js`.

- [ ] **Step 5: Add smoke coverage**

In `scripts/smoke-cli.mjs`, add commands:

```js
run(["evidence", "--json"]);
run(["repair", "--json"]);
```

Validate output is JSON:

```js
JSON.parse(run(["evidence", "--json"]));
JSON.parse(run(["repair", "--json"]));
```

- [ ] **Step 6: Run build and smoke**

```bash
npm run build:runtime
node bin/tokentrace.js evidence --json
node bin/tokentrace.js repair --json
npm run smoke:cli
```

Expected: all commands exit 0. `smoke:cli` may skip serve smoke inside sandbox but must pass command checks.

- [ ] **Step 7: Commit**

```bash
git add scripts/evidence.ts scripts/repair.ts scripts/build-cli-runtime.mjs scripts/smoke-cli.mjs bin/tokentrace.js
git commit -m "Add evidence and repair CLI commands"
```

## Task 8: UI Integration And Copy Polish

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/diagnostics/page.tsx`
- Modify: `app/sessions/page.tsx`
- Modify: `components/session-explorer.tsx`
- Modify: `components/pricing-settings.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update page navigation and copy**

Use these labels:

- Evidence page title: `Processed tokens`, `Non-cache tokens`, `Cached tokens`, `Estimated cost`, `Sessions`, or `Unknown cost`.
- Repair page title: `Unknown Cost Repair`.
- Doctor panel title: `Scan History Diff`.
- Doctor panel title: `Parser Trust Report`.

Keep copy factual:

- "Local review state only affects repair workflow labels. It does not delete imported usage."
- "Ignored files are known support files, not usage transcripts."
- "Unsupported files need parser review before they become usage."

- [ ] **Step 2: Make dense tables stable**

For every new table:

- wrap with `CardContent className="table-scroll"`;
- use `Table className="min-w-[72rem]"` where columns exceed desktop width;
- use `MonoText` and `truncate` for source paths;
- do not nest cards inside cards.

- [ ] **Step 3: Update README commands**

Add:

```bash
tokentrace evidence --json
                        # Print metric evidence trail as JSON
tokentrace repair --json
                        # Print unknown-cost repair queue as JSON
```

- [ ] **Step 4: Update changelog**

Under `## Unreleased`, add:

```md
### Added

- Evidence Trail page for tracing major metrics to sessions, source files, parser confidence, and pricing rows.
- Unknown Cost Repair Workbench with local review state for unresolved, ignored, resolved, and parser-review items.
- Parser Trust Report in Doctor.
- Scan History Diff in Doctor and `tokentrace doctor --json`.
- `tokentrace evidence --json` and `tokentrace repair --json`.

### Changed

- Overview metric cards now route to focused evidence or repair views.
- Unknown-cost repair links point to repair, pricing, parser, and session evidence.
```

- [ ] **Step 5: Run UI-adjacent tests**

```bash
npm test -- tests/evidence-trail.test.ts tests/unknown-cost-repair.test.ts tests/parser-trust.test.ts tests/scan-diff.test.ts tests/period-filter.test.tsx tests/help-tooltip.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/diagnostics/page.tsx app/sessions/page.tsx components/session-explorer.tsx components/pricing-settings.tsx README.md CHANGELOG.md
git commit -m "Wire evidence and repair UI"
```

## Task 9: Visual QA And Screenshots

**Files:**
- Modify: `README.md`
- Add only if screenshots materially change: `docs/assets/*0.8.0.png`

- [ ] **Step 1: Run local dev server with synthetic or clean local data**

Use a temp database, not private user data:

```bash
TOKENTRACE_DB=/private/tmp/tokentrace-080-qa/tokentrace.db npm run db:migrate
TOKENTRACE_DB=/private/tmp/tokentrace-080-qa/tokentrace.db npm run db:seed
TOKENTRACE_DB=/private/tmp/tokentrace-080-qa/tokentrace.db npm run dev -- --hostname 127.0.0.1 --port 3108
```

Expected: dev server starts on `http://127.0.0.1:3108`.

- [ ] **Step 2: Check pages**

Open or screenshot:

- `/`
- `/evidence?metric=processed-tokens`
- `/repair`
- `/diagnostics`
- `/sessions?cost=unknown`
- `/pricing`
- mobile viewport `/`

Required visual checks:

- period selector remains one-line on desktop;
- evidence tables scroll horizontally instead of wrapping into broken clusters;
- source paths truncate and remain readable on hover/title;
- repair state controls do not introduce nested cards;
- Doctor still reads as one repair surface, not a dumping ground.

- [ ] **Step 3: Refresh README screenshots when new visible surfaces are captured**

If visible new surfaces are stable, add:

- `docs/assets/evidence-0.8.0.png`
- `docs/assets/repair-0.8.0.png`
- `docs/assets/doctor-parser-trust-0.8.0.png`

Update `README.md` screenshot section to include the new images.

- [ ] **Step 4: Stop dev server**

Stop the server process. Verify:

```bash
pgrep -fl "next dev --hostname 127.0.0.1 --port 3108"
```

Expected: no matching process.

- [ ] **Step 5: Commit screenshots if added**

```bash
git add README.md docs/assets/evidence-0.8.0.png docs/assets/repair-0.8.0.png docs/assets/doctor-parser-trust-0.8.0.png
git commit -m "Refresh 0.8 screenshots"
```

Skip this commit if no screenshots were added.

## Task 10: 0.8.0 Verification Gate

**Files:**
- Modify only if failures require fixes.

- [ ] **Step 1: Run full verification**

```bash
npm run verify
```

Expected: all Vitest files pass, TypeScript exits 0, ESLint exits 0.

- [ ] **Step 2: Run release check with isolated npm cache**

```bash
npm_config_cache=/private/tmp/tokentrace-npm-cache npm run release:check
```

Expected: PASS. Packed smoke may skip install inside sandbox if network binding is disabled.

- [ ] **Step 3: Run forced packed install smoke outside sandbox when needed**

```bash
TOKENTRACE_FORCE_PACKED_INSTALL_SMOKE=1 npm_config_cache=/private/tmp/tokentrace-npm-cache npm run smoke:packed
```

Expected: `TokenTrace packed install smoke passed for tokentrace-<current-version>.tgz`. During implementation this uses the current package version because 0.8.0 versioning is not part of this plan.

- [ ] **Step 4: Run ProjScan doctor**

```bash
npm_config_cache=/private/tmp/tokentrace-npm-cache npm run projscan:doctor
```

Expected: health score A, no actionable issues.

- [ ] **Step 5: Run git checks**

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors. Worktree may be ahead with implementation commits; it must not contain accidental tarballs, temp databases, or `.next` artifacts.

- [ ] **Step 6: Update roadmap implementation status**

In `docs/ROADMAP-0.8.0.md`, add a `Current Implementation Status` section with each TT-080 card marked implemented after the card is complete.

- [ ] **Step 7: Commit final hardening changes**

```bash
git add docs/ROADMAP-0.8.0.md CHANGELOG.md README.md
git commit -m "Document 0.8 implementation status"
```

## Execution Order

Implement in this order:

1. Task 1: repair review state storage.
2. Task 2: evidence trail builder.
3. Task 3: evidence detail page and Overview links.
4. Task 4: unknown cost repair workbench.
5. Task 5: parser trust report.
6. Task 6: scan history diff.
7. Task 7: CLI evidence and repair commands.
8. Task 8: UI integration and copy polish.
9. Task 9: visual QA and screenshots.
10. Task 10: verification gate.

Do not start 0.9.0 work until 0.8.0 is implemented, verified, reviewed, and the maintainer approves moving on.

## Self-Review Checklist

- Spec coverage: all 0.8.0 cards map to tasks.
- No release action: plan includes no version bump, tag, push, GitHub Release, or npm publish.
- Local-only boundary preserved.
- Tests precede implementation in each behavior task.
- UI work includes visual QA.
- CLI JSON reuses shared builders.
- Release notes require complete changelog section before public release.
