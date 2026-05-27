# Local Intelligence Bundle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three deterministic, zero-token local intelligence features
(anomaly detection, structured query, auto-classifier) per the design at
`docs/superpowers/specs/2026-05-27-local-intelligence-bundle-design.md`.

**Architecture:** Pure-function detectors and SQL helpers under `src/lib/`,
new `scripts/<name>.ts` CLI entry points wired through
`src/cli/commands.js`, MCP tools added to `src/lib/mcp/tools.ts` and
`src/lib/mcp-server.ts`. Everything routes through `prepareCached`.

**Tech stack:** TypeScript, better-sqlite3 v12 (sync), Vitest 4, existing
`src/db/prepared.ts` cache.

---

## Slice A — Anomaly Detection

### Task A1 — Pure-function detector

**Files:**
- Create: `src/lib/anomaly-detection.ts`
- Create: `tests/anomaly-detection.test.ts`

- [ ] Write failing test: flat series → no anomalies; empty → empty report.
- [ ] Write failing test: 10× spike on day 30 of 60-day series → exactly one
      `severe` anomaly on that date.
- [ ] Write failing test: severity bucketing (z=3.0 → notable, 4.5 → high,
      6.0 → severe).
- [ ] Write failing test: MAD=0 edge — don't flag first non-zero day after a
      quiet stretch unless `value > 2 * median` and ≥ 3 days at median.
- [ ] Implement `detectAnomalies(points, options?)` returning `AnomalyReport`.
- [ ] Run all `anomaly-detection.test.ts` cases — all pass.
- [ ] Commit.

### Task A2 — `tokentrace anomalies` CLI

**Files:**
- Create: `scripts/anomalies.ts`
- Modify: `src/cli/commands.js` (add `anomalies` command)
- Create: `tests/anomalies-cli.test.ts`

- [ ] Write failing test: spawn `bin/tokentrace.js anomalies --json` against
      seeded DB with a planted spike, assert the spike date is returned.
- [ ] Write failing test: `--help` prints usage + supported flags.
- [ ] Implement `scripts/anomalies.ts` that calls `getTrends()` →
      `detectAnomalies()` → emits JSON or formatted lines.
- [ ] Wire `anomalies` command in `src/cli/commands.js`
      (`initializeDatabase` quiet, no pricing refresh).
- [ ] Run CLI tests — all pass.
- [ ] Commit.

### Task A3 — `get_anomalies` MCP tool

**Files:**
- Modify: `src/lib/mcp/tools.ts` (add tool definition)
- Modify: `src/lib/mcp-server.ts` (add handler)
- Modify: `src/lib/mcp/agent-guide.ts` (mention in workflow if relevant)
- Modify: `tests/mcp-server.test.ts` (add `get_anomalies` test)

- [ ] Write failing test: `tools/call` with `get_anomalies` returns an
      envelope with `data.summary.total` defined.
- [ ] Add `get_anomalies` to `mcpTools` array with empty input schema.
- [ ] Add handler that calls `commandJson(["anomalies", "--json"])` and
      wraps with `toolResult`.
- [ ] Run MCP tests — all pass.
- [ ] Commit.

---

## Slice B — Structured Query

### Task B1 — Pure-function query runner

**Files:**
- Create: `src/lib/structured-query.ts`
- Create: `tests/structured-query.test.ts`

- [ ] Write failing test: each `groupBy` × `metric` combination returns
      expected aggregate rows against a seeded DB.
- [ ] Write failing test: `topN` clamps to 200 max, default 20.
- [ ] Write failing test: invalid `groupBy` / `metric` / `range.preset`
      throws a descriptive error.
- [ ] Write failing test: filters apply (model, project, tool) exact match.
- [ ] Write failing test: `range.preset = "7d"` only returns last 7 days.
- [ ] Implement `runStructuredQuery(args)` using `prepareCached` and
      parameterized binds (no string concat into SQL).
- [ ] Run tests — all pass.
- [ ] Commit.

### Task B2 — `tokentrace query` CLI

**Files:**
- Create: `scripts/query.ts`
- Modify: `src/cli/commands.js`
- Create: `tests/query-cli.test.ts`

- [ ] Write failing test: spawn CLI with `--group-by model --metric cost
      --json`, assert rows array shape and length.
- [ ] Write failing test: `--help` prints usage.
- [ ] Implement `scripts/query.ts` arg parser + invocation of
      `runStructuredQuery`.
- [ ] Wire `query` command.
- [ ] Run tests — all pass.
- [ ] Commit.

### Task B3 — `query_usage` MCP tool

**Files:**
- Modify: `src/lib/mcp/tools.ts`
- Modify: `src/lib/mcp-server.ts`
- Modify: `tests/mcp-server.test.ts`

- [ ] Write failing test: `tools/call query_usage` with
      `{groupBy:"model", metric:"cost"}` returns rows envelope.
- [ ] Add `query_usage` to `mcpTools` with full input schema.
- [ ] Add handler translating MCP args → CLI flags → `commandJson`.
- [ ] Run tests — all pass.
- [ ] Commit.

---

## Slice C — Unknown-Cost Auto-Classifier

### Task C1 — Classifier library

**Files:**
- Create: `src/lib/unknown-cost-repair/auto-classify.ts`
- Create: `tests/auto-classify.test.ts`

- [ ] Write failing test: exact-model rule → confidence 0.95, rule
      "exact-model".
- [ ] Write failing test: family-fragment rule → confidence 0.70.
- [ ] Write failing test: parser-source rule → confidence 0.45.
- [ ] Write failing test: no match → `suggestedModel: null, rule: "none"`.
- [ ] Implement `buildClassificationLookups()` and `classifyGroup(group, lookups)`.
- [ ] Run tests — all pass.
- [ ] Commit.

### Task C2 — Wire into workbench

**Files:**
- Modify: `src/lib/unknown-cost-repair/types.ts` (add `classification` field)
- Modify: `src/lib/unknown-cost-repair/workbench.ts`
- Modify: `tests/unknown-cost-repair.test.ts` (or sibling) to assert
  classification field on existing workbench groups
- Modify: `components/repair/repair-items-table.tsx` (display column)

- [ ] Write failing test: workbench groups now include `classification`
      with shape from auto-classify.
- [ ] Extend `UnknownCostRepairWorkbenchGroup` with `classification:
      AutoClassification`.
- [ ] Build lookups once at top of `buildUnknownCostRepairGroups`, pass to
      each group.
- [ ] Add UI column (read-only) in the repair items table.
- [ ] Run tests — all pass; existing snapshot/decomposition tests still
      pass.
- [ ] Commit.

### Task C3 — `tokentrace repair auto-classify` CLI

**Files:**
- Modify: `scripts/repair.ts` (add `auto-classify` subcommand)
- Create: `src/lib/unknown-cost-repair/auto-classify-cli.ts`
- Create: `tests/repair-auto-classify-cli.test.ts`

- [ ] Write failing test: `repair auto-classify --json` (dry-run default)
      returns suggestions ≥ min-confidence without writing.
- [ ] Write failing test: `--apply --min-confidence=0.9` writes via
      parser-override CLI helper and second run is a no-op.
- [ ] Write failing test: `--apply` without `--min-confidence ≥ 0.85`
      rejects.
- [ ] Implement CLI helper that reads workbench, filters by confidence,
      and (if `--apply`) writes through the existing parser-override
      action.
- [ ] Run tests — all pass.
- [ ] Commit.

### Task C4 — `get_classifications` MCP tool

**Files:**
- Modify: `src/lib/mcp/tools.ts`
- Modify: `src/lib/mcp-server.ts`
- Modify: `tests/mcp-server.test.ts`

- [ ] Write failing test: `tools/call get_classifications` returns groups
      with classification field.
- [ ] Add tool definition + handler calling `commandJson(["repair", "auto-classify", "--json"])`.
- [ ] Run tests — all pass.
- [ ] Commit.

---

## Docs & finish

### Task D1 — CHANGELOG

- [ ] Add `## Unreleased` bullets describing all three slices
      (anomaly detection, structured query, auto-classifier).
- [ ] Update `tests/changelog-next-version.test.ts` only if its assertions
      pin specific Unreleased text (most don't).
- [ ] Commit.

### Task D2 — Agent contract docs

- [ ] Update `TOKENTRACE_AGENT.md` to list the new MCP tools + CLI
      commands.
- [ ] Update `llms.txt`.
- [ ] Re-validate `docs/agent-discovery.schema.json` matches actual `agent --json` output.
- [ ] Commit.

### Task D3 — `npm run build:runtime` + `npm test` + `npm run projscan:doctor`

- [ ] Build runtime bundle so the bin entry picks up new CLI scripts.
- [ ] Run full `npm test`. Fix any regression.
- [ ] Run `npm run projscan:doctor`. Report findings; address any critical.
- [ ] Final commit.

**Do not bump version, tag, push tag, create GitHub release, or publish npm.**
The maintainer will trigger release separately.
