# TokenTrace 0.8.0 Roadmap

0.8.0 is the Evidence + Repair release.

The release should make TokenTrace feel trustworthy when a user asks why a
number exists, why a cost is unknown, why a file was imported or ignored, and
what changed between scans. The product should not add broad new analytics
surface. It should deepen the evidence behind the surfaces that already matter.

## Product Thesis

TokenTrace is valuable when it can prove local AI CLI usage without pretending
weak evidence is exact. 0.8.0 should make every major token, cost, session,
project, parser, and pricing concern traceable to its source and repairable
when incomplete.

The best version of 0.8.0 helps users answer five questions:

1. Where did this metric come from?
2. Which sessions and source files explain it?
3. Which parser handled those files, and with what confidence?
4. Why is cost missing, and what exact repair path is available?
5. What changed in the latest scan compared with the previous scan?

## Release Principles

- Evidence before optimization. Every recommendation should point to sessions,
  source files, parser confidence, pricing rows, or scan events.
- Repair paths must be local, deterministic, and reversible.
- Do not expand beyond CLI usage. No desktop app scraping, browser extension,
  proxying, packet sniffing, traffic interception, cloud sync, or telemetry.
- Keep parser and pricing uncertainty visible; do not launder estimates into
  exact-looking totals.
- Preserve package trust gates from 0.6.0 and release discipline from 0.7.0.

## Release Rules

- No public tag, GitHub Release, npm publish, or version bump until the
  maintainer explicitly asks for release.
- GitHub Release notes must include the complete changelog section for the
  released version.
- Work may land incrementally on `main`, but npm release waits for the explicit
  release request.

## 0.8.0 Cards

### TT-080-01 Evidence Trail V1

**Outcome:** A user can start from a major metric and inspect the sessions,
source files, parser confidence, model, and pricing evidence behind it.

- Add evidence links from high-value Overview metrics: processed tokens,
  non-cache tokens, cached tokens, estimated cost, sessions, unknown cost,
  guardrails, and recommended next actions.
- Add a reusable evidence trail model that can group evidence by metric,
  session, project, model, parser, source file, confidence, and pricing state.
- Keep the first UI table/detail based. Avoid graph-heavy or decorative
  exploration.
- Route metric links to filtered Sessions, Raw Data, Pricing, or a focused
  evidence detail page when existing routes cannot show the required evidence
  without hiding source, parser, or pricing context.

### TT-080-02 Unknown Cost Repair Workbench

**Outcome:** Unknown cost becomes a queue users can repair, defer, or classify
instead of a vague count.

- Group unknown cost by cause: missing model, missing pricing row, missing
  token count, missing provider, and parser review.
- Add local review state: unresolved, ignored, resolved, and needs parser
  review.
- Add model alias suggestions for dated snapshots, provider-prefixed names,
  synthetic names, Claude aliases, and OpenAI/Codex aliases.
- Link each group to affected sessions and source files.
- Keep state local in SQLite settings or a focused review table.

### TT-080-03 Parser Trust Report

**Outcome:** Parser trust is inspectable by tool, parser, source, status, and
version.

- Show parser coverage by tool, parser id, parser version, source folder, file
  status, and records imported.
- Separate ignored support files from unsupported usage candidates and failed
  files.
- Show latest detected source format metadata where the adapter exposes it.
- Keep noisy raw paths grouped by reason and expandable only when useful.

### TT-080-04 Scan History Diff

**Outcome:** A user can understand what changed between the latest scan and the
previous scan.

- Compare latest scan with previous scan for files scanned, records imported,
  duplicates, ignored files, unsupported files, parser warnings, and failures.
- Explain zero-import scans with specific reasons: all duplicates, only ignored
  support files, no matching roots, unsupported candidates, or parser failures.
- Surface scan diff in Doctor and `tokentrace doctor --json`.
- Preserve existing scan history display while making the newest diff clearer.

### TT-080-05 CLI Repair And Evidence Commands

**Outcome:** Evidence and repair data are available without opening the
dashboard.

- Add or extend CLI JSON output for evidence trail, unknown cost repair, parser
  trust, and scan diff.
- Keep text output concise and automation-friendly.
- Do not add interactive terminal flows in 0.8.0.

### TT-080-06 Visual QA And Release Hardening

**Outcome:** Evidence features do not make the product feel noisy or fragile.

- Verify Overview, Usage Intelligence, Sessions, Projects, Doctor, Pricing,
  Settings, Raw Data, and mobile Overview.
- Keep dense tables horizontally scrollable under pressure.
- Refresh README screenshots only if the visible product surface materially
  changes.
- Run release gates before any public release.

## Release Criteria

0.8.0 is not releasable until:

- `npm run release:check` passes.
- Forced packed-install smoke passes outside sandbox when needed.
- Production dependency audit reports zero moderate-or-higher vulnerabilities,
  or any advisory has an explicit documented mitigation.
- Evidence links from major Overview metrics land on useful filtered evidence.
- Unknown-cost groups explain the cause and the next repair path.
- Parser Trust Report separates imported, ignored, unsupported, duplicate, and
  failed files.
- Scan History Diff explains latest-vs-previous scan changes and zero imports.
- README and changelog are updated before tagging.
- GitHub Release body includes the complete 0.8.0 changelog section.
