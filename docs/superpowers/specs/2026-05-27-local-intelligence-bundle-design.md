# Local Intelligence Bundle — Design Spec

**Date:** 2026-05-27
**Track:** Unreleased (0.18.0 candidate, no release until maintainer asks)
**Hard constraint:** Zero AI-token cost to the user. No LLM/API calls. No keys. No outbound network from any new feature.

## Goal

Add three deterministic, local-only intelligence features to TokenTrace so the
dashboard and MCP surface feel smarter without spending a single token of the
user's AI budget.

1. **Anomaly detection** on daily token/cost trend data.
2. **Structured query** MCP tool that lets the agent ask precise questions
   without us building a natural-language parser (the agent already speaks NL).
3. **Auto-classification** suggestions for unknown-cost interactions.

Every feature is pure SQL + math over the existing local SQLite. No new
dependencies. No new outbound network paths. Model-rate refresh remains the
only opt-in network call in the product and is unchanged.

## Non-goals

- No LLM-backed reasoning, ranking, or summarization.
- No NL-to-SQL parser. The agent supplies structured arguments; we execute.
- No "auto-apply" without an explicit confidence threshold and confirmation
  flag. Classifier output is advisory by default.
- No version bump, tag, release, or publish until the maintainer asks.

## Slice A — Anomaly Detection

### What

A pure-stats detector that flags trend days deviating from the trailing
window. Median Absolute Deviation (MAD) is the primary score because it
handles spiky token/cost series better than mean/stddev and degrades
gracefully on small windows. Severity buckets: `notable`, `high`, `severe`.

### Inputs

`TrendPoint[]` from `getTrends(filters)` (already exists at
`src/lib/analytics/trends.ts`). We score on `totalTokens` and `cost`
independently.

### Algorithm

For each day at index `i`:

1. Build a trailing window of the previous `windowSize` days (default 14).
2. If the window has fewer than `minWindow` non-zero observations (default
   5), skip — not enough signal.
3. Compute the median and MAD of the window.
4. Compute the modified z-score for day `i`:
   `z = 0.6745 * (value - median) / mad` (the `0.6745` makes MAD consistent
   with stddev under normality).
5. Bucket: `|z| >= 6 → severe`, `|z| >= 4.5 → high`, `|z| >= 3 → notable`.
   Below `3` → not an anomaly.
6. Edge case: if `mad === 0` and `value > median`, treat as `severe` only
   when `value > 2 * median` and the window had ≥ 3 days at the median; this
   prevents a "first non-zero day after a quiet stretch" from being flagged
   when there is no spread to compare against.

### Output

```ts
type AnomalySeverity = "notable" | "high" | "severe";
type AnomalyMetric = "tokens" | "cost";

interface Anomaly {
  date: string;          // YYYY-MM-DD
  metric: AnomalyMetric;
  value: number;
  baseline: number;      // median of trailing window
  deviation: number;     // value - baseline
  ratio: number;         // value / baseline when baseline > 0 else null
  zScore: number;        // modified z-score
  severity: AnomalySeverity;
}

interface AnomalyReport {
  generatedAt: string;
  windowSize: number;
  thresholds: { notable: number; high: number; severe: number };
  anomalies: Anomaly[];      // sorted by date asc
  summary: {
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byMetric: Record<AnomalyMetric, number>;
    latestAnomalyDate: string | null;
  };
}
```

### Surfaces

- **Library:** `src/lib/anomaly-detection.ts` — `detectAnomalies(points, options?)`.
- **CLI:** `tokentrace anomalies [--json] [--window=N] [--metric=tokens|cost|all]`.
  - Script: `scripts/anomalies.ts`.
  - Dispatcher: add `anomalies` command to `src/cli/commands.js`.
- **MCP tool:** `get_anomalies` in `src/lib/mcp/tools.ts`; handler in
  `src/lib/mcp-server.ts` calls `commandJson(["anomalies", "--json"])`.
- **Agent discovery:** add the CLI to `src/lib/agent-discovery.ts` capability
  catalog (mirror the pattern used for `tokentrace report`).

### Tests

- `tests/anomaly-detection.test.ts` — pure-function tests:
  - Empty input → empty report.
  - Flat series → no anomalies.
  - Single 10× spike on day 30 → exactly one `severe` anomaly on that date.
  - Quiet then non-zero (mad=0 edge) → not flagged unless `value > 2 * median`
    and ≥ 3 days at median.
  - Severity bucketing boundaries (z=3.0, z=4.5, z=6.0).
- `tests/anomalies-cli.test.ts` — spawn `bin/tokentrace.js anomalies --json`
  against a seeded DB and assert the envelope shape and that a planted spike
  is returned.

## Slice B — Structured Query Tool

### What

An MCP tool `query_usage` and a mirror CLI `tokentrace query` that take
structured arguments and return deterministic JSON rows. The agent on the
other side does its own NL→argument translation; we never see the prompt.

### Argument schema

```ts
interface QueryUsageArgs {
  groupBy: "model" | "project" | "tool" | "session" | "day";
  metric: "cost" | "totalTokens" | "interactions";
  range?: {
    preset?: "today" | "7d" | "30d" | "60d" | "90d" | "all";
    from?: string;        // ISO date (inclusive). Mutually exclusive with preset.
    to?: string;          // ISO date (exclusive).
  };
  filters?: {
    model?: string;       // exact match against models.name (case-insensitive)
    project?: string;     // exact match against project root path
    tool?: string;        // exact match against tools.name
  };
  topN?: number;          // default 20, max 200
  sort?: "asc" | "desc";  // default "desc"
}
```

### Output

```ts
interface QueryUsageRow {
  group: string;              // groupBy value
  value: number;              // metric value
  interactions: number;       // always included for context
  totalTokens: number;        // always included
  cost: number;               // always included
}

interface QueryUsageResult {
  generatedAt: string;
  groupBy: string;
  metric: string;
  range: { from: string | null; to: string | null; preset: string | null };
  filters: { model: string | null; project: string | null; tool: string | null };
  topN: number;
  rows: QueryUsageRow[];      // length ≤ topN, sorted by metric
  truncated: boolean;         // true if more rows exist beyond topN
  totalGroups: number;
}
```

### Surfaces

- **Library:** `src/lib/structured-query.ts` — `runStructuredQuery(args)`.
  Validates inputs, builds a parameterized SQL query, executes via
  `prepareCached`.
- **CLI:** `tokentrace query --group-by <g> --metric <m> [--range 7d]
  [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--model <name>] [--project <path>]
  [--tool <name>] [--top 20] [--sort desc] [--json]`.
  - Script: `scripts/query.ts`.
  - Dispatcher: add `query` command in `src/cli/commands.js`.
- **MCP tool:** `query_usage` in `src/lib/mcp/tools.ts` with the full
  JSON-schema. Handler in `src/lib/mcp-server.ts` translates args to CLI
  flags (so the per-process invocation isolation mirrors existing tools).
- **Agent discovery:** add to `src/lib/agent-discovery.ts`.
- **Docs:** add the contract to `TOKENTRACE_AGENT.md` and `llms.txt`.

### Validation rules

- Reject unknown `groupBy` / `metric` / `sort` / `range.preset` values.
- Reject `from`/`to` that aren't ISO dates.
- Reject `from` >= `to`.
- Reject `topN < 1` or `> 200`; clamp default to 20.
- Filters are exact-match only (case-insensitive on names). No `LIKE`, no
  wildcards in 0.18.0 — keeps the SQL trivially safe and predictable.

### Tests

- `tests/structured-query.test.ts` — seeded DB, exercise each `groupBy`
  with each `metric`, range presets, filter combinations, `topN` clamping,
  invalid-arg rejection.
- `tests/query-cli.test.ts` — spawn `bin/tokentrace.js query --json` with
  representative flags.

## Slice C — Unknown-Cost Auto-Classifier

### What

For each unknown-cost workbench group, look up the best-matching priced
interaction in the same database and emit a classification suggestion with a
confidence score. The classifier never auto-applies; it only writes a
`classification` field into the workbench group payload. A separate CLI
flag (`--apply --min-confidence=0.9`) can persist suggestions as
`parser-overrides`-style records, but **only** with explicit `--apply` and
`--yes` (or `--dry-run` default).

### Algorithm

For each unknown-cost group (cause ∈ `missing pricing`, `missing model`):

1. **Exact-model match** (confidence 0.95): If `model` (case-insensitive,
   normalized via `modelNameCandidates`) matches an already-priced model
   under the same `providerId`, suggest that priced model.
2. **Tokenizer-family fragment match** (confidence 0.70): If the model name
   shares a recognized family prefix (e.g., `claude-3-5`, `gpt-4`, `o3-`)
   with a priced model under the same provider, suggest the most-used
   priced sibling.
3. **Parser+source pair match** (confidence 0.45): If another priced
   interaction comes from the same `sourceFile` with the same parser
   override / tool combination, suggest its model.
4. Otherwise → no suggestion.

Confidence is the floor of the top matching rule. We compute it
deterministically — no learned weights, no randomness.

### Output addition to workbench group

```ts
interface AutoClassification {
  suggestedModel: string | null;
  suggestedProvider: string | null;
  confidence: number;           // 0..1
  rule: "exact-model" | "family-fragment" | "parser-source" | "none";
  evidence: {
    matchedRows: number;        // count of similar priced rows backing the suggestion
    sampleSourceFile: string | null;
  };
}
```

Add `classification: AutoClassification` to each
`UnknownCostRepairWorkbenchGroup`.

### Surfaces

- **Library:** `src/lib/unknown-cost-repair/auto-classify.ts` with
  `classifyGroup(group, lookups)` and `buildClassificationLookups()`.
- **Workbench integration:** `buildUnknownCostRepairWorkbench` calls
  `classifyGroup` for each row using a shared lookup built once per
  workbench query.
- **CLI:** extend `scripts/repair.ts` with `auto-classify` subcommand:
  `tokentrace repair auto-classify [--min-confidence=0.9] [--apply]
  [--dry-run] [--json]`. Default is dry-run. `--apply` requires
  `--min-confidence` ≥ 0.85 and writes through the existing parser-override
  CLI helper.
- **MCP tool:** `get_classifications` returns the same data as the workbench
  with classifications, so agents can read suggestions without re-running
  the full repair query.
- **UI:** add a "Suggested classification" column to the repair workbench
  table (`components/repair/repair-items-table.tsx`) showing the
  suggestion + confidence chip. Read-only display in 0.18.0. No write
  buttons — apply is CLI-only.

### Tests

- `tests/auto-classify.test.ts` — seeded DB with mixed priced/unpriced
  rows, assert each rule fires when expected and confidence is correct.
- `tests/repair-auto-classify-cli.test.ts` — dry-run prints JSON without
  writing; `--apply --min-confidence=0.9` writes through
  `parser-overrides-cli` and the second invocation is a no-op.
- Update `tests/unknown-cost-repair.test.ts` (or sibling) to assert the new
  `classification` field shape on existing workbench output.

## Release & docs

- Add a single `## Unreleased` section block in `CHANGELOG.md` listing all
  three slices.
- Update `TOKENTRACE_AGENT.md` with the new MCP tools and CLI commands.
- Update `llms.txt` with the new agent surfaces.
- Update `docs/agent-discovery.schema.json` if `tokentrace agent --json`
  output changes shape.
- Run `npm run projscan:doctor` and `npm test` before marking the bundle
  done. **Do not** bump version, tag, or push a release tag.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Anomaly false positives on sparse early days | Require `minWindow` non-zero observations before scoring. |
| Structured query SQL injection via filters | Exact-match parameterized binds only; no `LIKE`, no string concat into SQL. |
| Auto-classifier wrong write | Default is dry-run. `--apply` requires confidence floor ≥ 0.85 and uses the existing parser-override CLI write path. |
| Repair workbench query slowdown from classifier | Build the lookup once per call, cache through `prepareCached`. Add a measurement test in CI. |
| MCP envelope churn | Reuse `toolResult` / `toolError`; no protocol changes. |
