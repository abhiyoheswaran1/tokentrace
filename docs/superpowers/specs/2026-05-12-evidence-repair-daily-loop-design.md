# TokenTrace 0.8.0 and 0.9.0 Design

## Scope

This spec covers two future minor releases:

- 0.8.0: Evidence + Repair
- 0.9.0: Daily Operating Loop

The releases are intentionally sequenced. 0.8.0 deepens trust and repairability.
0.9.0 builds daily workflow features on top of that evidence foundation.

## Product Boundary

TokenTrace remains CLI-only and local-first.

In scope:

- Claude Code local usage artifacts.
- Codex CLI local usage artifacts.
- TokenTrace wrapper logs.
- Generic local AI CLI logs when parser confidence is explicit.
- Local SQLite settings, review state, saved views, and report output.
- Optional public pricing refresh.

Out of scope:

- ChatGPT desktop app ingestion.
- Claude desktop app ingestion.
- Browser extensions.
- Proxying, packet sniffing, or traffic interception.
- Cloud sync, accounts, team dashboards, or telemetry.
- AI-generated cloud summaries.
- Native Codex sticky footer unless Codex exposes a stable official contract.

## 0.8.0 Design: Evidence + Repair

### User Outcomes

A user should be able to:

- open a major metric and see the sessions, source files, parser, confidence,
  model, and pricing evidence behind it;
- understand why cost is unknown;
- repair, ignore, resolve, or classify unknown-cost groups locally;
- inspect parser trust by tool, source, status, and version;
- compare latest scan behavior against the previous scan.

### Architecture

0.8.0 should add small, focused data builders rather than pushing more logic
into large page components.

Proposed units:

- evidence trail builder: maps metrics and review items to sessions, files,
  parser confidence, model, and pricing state;
- repair queue builder: groups unknown-cost causes and local review state;
- parser trust builder: summarizes scan files by parser, source, version, and
  status;
- scan diff builder: compares latest and previous scan runs.

Pages should consume these builders through `getAnalyticsData()` or focused
route/page helpers. CLI JSON commands should reuse the same builders so the
dashboard and terminal do not drift.

Metric evidence links should route to filtered Sessions, Raw Data, Pricing, or
a focused evidence detail page when existing routes cannot show source, parser,
confidence, and pricing context together.

### Data Flow

1. Scan imports sessions, interactions, models, projects, scan runs, and scan
   files.
2. Evidence builders read normalized SQLite rows.
3. Builders produce deterministic view models.
4. Dashboard pages render links, tables, and repair groups.
5. CLI commands serialize the same view models as JSON or concise text.

No external service participates in evidence, repair, parser trust, or scan
diff logic.

### Error Handling

- Missing source file metadata should display as unknown source, not crash.
- Missing model should be grouped separately from missing price.
- Missing token counts should never be presented as a pricing problem.
- Empty scan history should produce first-run guidance.
- Duplicate-only, ignored-only, unsupported-only, and failure-heavy scans should
  have distinct explanations.
- Local repair state should be reversible and should not delete imported usage.

### Testing

0.8.0 requires tests for:

- evidence trail grouping and links;
- unknown-cost grouping by cause;
- model alias suggestions for common Claude/OpenAI/Codex variants;
- local repair state persistence;
- parser trust status grouping;
- latest-vs-previous scan diff;
- CLI JSON output shape;
- dashboard visual regressions for dense tables.

## 0.9.0 Design: Daily Operating Loop

### User Outcomes

A user should be able to:

- inspect a session timeline after a run;
- save and reopen common local filters;
- generate a local markdown report for daily notes or issue comments;
- use a clearer Claude Code status line while working;
- review what changed after a session or scan.

### Architecture

0.9.0 should build on the 0.8.0 evidence and repair models.

Proposed units:

- session timeline builder: converts session interactions into ordered usage
  events without raw content by default;
- saved view storage: stores named local filters in SQLite;
- digest/report builder: generates text, JSON, and markdown from local view
  models;
- status-line formatter V2: formats Claude Code statusLine stdin JSON and
  local TokenTrace state;
- post-session review builder: summarizes changes since a selected point in
  local time or scan history.

### Data Flow

1. Existing scans and optional live status input produce normalized local usage.
2. Timeline and review builders aggregate local sessions and interactions.
3. Saved views store filter definitions, not result snapshots.
4. Reports render deterministic markdown from current local data.
5. Claude status-line output remains stdin/stdout based and safe for Claude
   Code.

### Error Handling

- Session timeline must work with raw content disabled.
- Saved views with obsolete filters should show a repairable warning.
- Report commands should exit nonzero only for invalid arguments or database
  access failures, not for empty data.
- Claude status-line formatter should degrade to compact unknown states when
  transcript metadata is partial.

### Testing

0.9.0 requires tests for:

- session timeline ordering and raw-content privacy behavior;
- saved view creation, loading, and restart persistence;
- markdown report content and argument parsing;
- digest since-options;
- Claude status-line V2 formatting;
- post-session review summaries;
- CLI smoke for digest, report, statusline, and watch.

## Release Discipline

For both releases:

- Work can be committed incrementally on `main`.
- No version bump, tag, GitHub Release, or npm publish until the maintainer
  explicitly asks for release.
- Changelog entries must be written as cards land.
- README screenshots should be refreshed when visible product surfaces change.
- `npm run release:check`, forced packed-install smoke, and ProjScan doctor are
  required before public release.

## Approval Gate

Implementation should not begin until the maintainer approves this written spec
and the first implementation plan.
