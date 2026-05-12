# TokenTrace 0.7.0 Roadmap

0.7.0 is the Usage Intelligence release.

The product goal is not more dashboard surface. The goal is a tighter daily
loop: scan local CLI usage, understand whether anything needs attention, and
open the exact evidence behind the next useful action.

## Product Thesis

TokenTrace should become the local AI CLI usage ledger that developers trust
before starting another long session. The best version of 0.7.0 helps users
answer five recurring questions:

1. Am I near a cost or token limit I care about?
2. Which one thing should I review first?
3. Which sessions, projects, or models explain the recommendation?
4. Which numbers are incomplete because pricing, token counts, or parser
   confidence are missing?
5. Can I get the same answer from the CLI without opening the dashboard?

## Release Principles

- Improve current workflows before adding new surface area.
- Every recommendation must point to evidence: sessions, source file, parser,
  pricing row, project, model, or scan.
- Keep the intelligence deterministic and local. No cloud budgets, accounts,
  sync, telemetry, proxies, browser extensions, packet capture, or desktop app
  scraping.
- Do not make scary claims from weak evidence. Phrase uncertainty directly.
- Preserve package trust gates from 0.6.0.

## Release Rules

- No public tag, GitHub Release, npm publish, or version bump until the
  maintainer explicitly asks for release.
- GitHub Release notes must include the complete changelog section for the
  released version.
- Release work can land incrementally on `main`, but npm release waits for the
  explicit release request.

## 0.7.0 Cards

### TT-070-01 Local Usage Guardrails

**Outcome:** A user can set local monthly cost and token limits and see
month-to-date progress on Overview.

- Add optional monthly cost and token limits in Settings.
- Show current-month cost and token progress on Overview.
- Rank near-limit and exceeded guardrails in local recommendations.
- Keep limits stored only in local SQLite settings.

### TT-070-02 Evidence-Backed Review Queue

**Outcome:** A user can open Insights and immediately see the highest-impact
thing to review next.

- Build a deterministic review queue from guardrails, unknown cost repair,
  high-impact sessions, dominant projects, expensive model use, and low cache
  reuse.
- Put the queue above generic insights.
- Each row must include priority, category, evidence, impact, and action link.
- Include the queue in `tokentrace insights --json`.

### TT-070-03 Session Comparison

**Outcome:** A user can compare similar sessions instead of inspecting raw
tables one row at a time.

- Add session comparison by project, tool, model, tokens, cache, cost, and
  confidence.
- Highlight unusually expensive, token-heavy, or low-confidence sessions.
- Keep the first implementation table-based and filter-driven.

### TT-070-04 Project Intelligence

**Outcome:** A user can see which projects deserve attention and why.

- Add project-level review signals: rising usage, low cache efficiency,
  unknown cost, heavy estimates, and model concentration.
- Link each signal to filtered sessions.
- Avoid speculative forecasting until enough local history exists.

### TT-070-05 CLI Daily Digest

**Outcome:** A user can get the same daily decision support from the terminal.

- Add a compact local digest command for the current month and latest scan.
- Include guardrail status, top review item, unknown pricing count, top project,
  and next action.
- Support `--json` for scripts and text output for humans.

### TT-070-06 Visual QA And Hardening

**Outcome:** Existing pages stay quiet, compact, and robust as intelligence is
added.

- Verify Overview, Insights, Settings, Sessions, Projects, Doctor, Pricing, and
  mobile Overview.
- Keep dense product UI horizontally scrollable under pressure.
- Run package, audit, and packed-install smoke gates before release.

## Current Implementation Status

- TT-070-01 is implemented in-progress on `main`: Settings stores local monthly
  guardrails, Overview shows month-to-date progress, and recommendations rank
  guardrail breaches.
- TT-070-02 is implemented in-progress on `main`: Insights has an evidence
  backed Review Queue and CLI JSON includes it.
- TT-070-03 is implemented in-progress on `main`: Sessions shows comparison
  flags for token and cost outliers against matching project, tool, and
  primary-model peers.
- TT-070-04 is implemented in-progress on `main`: Projects shows signals for
  dominant usage, unknown cost, estimated-token confidence, and model
  concentration.
- TT-070-05 is implemented in-progress on `main`: `tokentrace digest` and
  `tokentrace digest --json` summarize current-month local usage, guardrails,
  top review item, unknown-cost count, top project, and latest scan status.

## Release Criteria

0.7.0 is not releasable until:

- `npm run release:check` passes.
- Packed install smoke passes.
- Production dependency audit reports zero high vulnerabilities.
- Guardrails work from a clean home with blank limits, valid limits, warning
  limits, and exceeded limits.
- Review Queue links land on useful filtered evidence pages.
- Overview, Insights, Settings, Sessions, Projects, Doctor, Pricing, and mobile
  Overview are visually checked.
- GitHub Release body includes the complete 0.7.0 changelog section.
