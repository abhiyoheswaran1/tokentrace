# TokenTrace 0.12.0 Roadmap

0.12.0 is the Local Sources & Trust release.

This release rolls the next several planned minor-version themes into one larger
public release. The goal is to avoid daily releases while still shipping a
meaningful product step: more local sources, portable evidence, local
operations, scoped guardrails, better parser setup, saved reports, performance
polish, and a stronger agent-readable handoff.

## Product Thesis

TokenTrace should feel like a local operating ledger for AI CLI usage. Users and
agents should be able to import more local usage sources, explain every number,
export privacy-safe evidence, repair gaps, enforce local guardrails, and inspect
the release plan from a stable machine-readable endpoint.

## Rolled-Up Minor Roadmap

### 0.12.0 Local Sources

**Thesis:** TokenTrace should tell users exactly which local AI usage sources it
understands and import more of them through native adapters.

- Source catalog with adapter status, matchers, confidence, and next action.
- Native structured-log adapter for local wrappers and team logs.
- Native Cursor-style chat/composer export adapter.
- Adapter coverage matrix in Scan Health.
- Source-provided cost preservation and parser provenance.

### 0.13.0 Evidence Portability

**Thesis:** The evidence behind a number should be portable without exposing raw
prompts.

- Evidence packs for metric, session, project, scan, repair, and model-rate
  views.
- JSON and Markdown exports with deterministic ordering.
- Redaction manifest showing raw prompt/message bodies are excluded by default.
- Evidence-pack links from Evidence, Sessions, Projects, Repair, and Scan
  Health.
- CLI-compatible evidence-pack builder for later automation.

### 0.14.0 Local Operations

**Thesis:** TokenTrace should operate like a dependable local utility, not a
dashboard that only updates when users remember to click.

- Manual-only, on-open, hourly, and daily scan schedules.
- Opportunistic due-scan execution from the local dashboard/API.
- Last scheduled scan result with files checked, records imported, warnings,
  errors, and next action.
- Scan history retention setting.
- Local backup/export surface for settings and operating metadata.

### 0.15.0 Governance & Guardrails

**Thesis:** Guardrails should flag risk before users get surprised by provider
spend, token volume, or confidence drops.

- Project/model/tool scoped monthly cost and token limits.
- Per-guardrail warning thresholds.
- Movement since previous scan for tokens, cost, sessions, unknown cost, and
  confidence.
- Anomaly flags for sudden spikes, unknown-cost growth, and confidence drops.
- Policy templates for solo developers, teams, and wrapper/CI use.

### 0.16.0 Parser Studio

**Thesis:** Users should be able to teach TokenTrace safe local log conventions
without writing parser code.

- File preview endpoint for local sample paths.
- Parser detection, field preview, session/interaction preview, warnings, and
  recommended matchers.
- Matcher validation before profile save.
- Parser fixture export for bug reports without raw prompts.
- Confidence notes explaining why parsers matched or declined.

### 0.17.0 Reports

**Thesis:** TokenTrace should create reusable operating artifacts, not just
screens.

- Saved report definitions for weekly usage, high-cost sessions, unknown-cost
  repair, confidence trends, guardrail status, and source coverage.
- Markdown, JSON, and CSV formats.
- Dashboard report preview.
- CLI report support for the same report definitions.
- Deterministic filenames and no-raw-content defaults.

### 0.18.0 Agent Handoff

**Thesis:** Agents should be able to discover TokenTrace, understand its release
state, and operate core workflows from stable machine-readable entry points.

- Roadmap JSON with current release, next planned release, rolled-up themes,
  cards, evidence paths, verification gates, blockers, and release status.
- Action recipes for scan, health check, evidence pack export, repair review,
  report export, and model-rate review.
- Stable schema documentation.
- Handoff notes for coding agents and product agents.

## 0.12.0 Cards

### TT-120-01 Native Adapter Expansion

**Outcome:** More local usage formats are imported by first-class adapters
before generic fallbacks.

- Add first-class adapters for local structured usage logs and Cursor-style
  chat/composer exports.
- Keep parser provenance and source evidence attached to every import.
- Keep generic JSON/JSONL/log adapters as lower-priority fallbacks.
- Add source coverage metadata for Scan Health and roadmap handoff.

### TT-120-02 Source Catalog & Coverage Matrix

**Outcome:** Users can see what TokenTrace supports and what action to take for
unsupported local files.

- List native, profile-assisted, and fallback import paths.
- Show supported extensions and confidence level.
- Show the next action: scan, configure profile, open parser preview, or report
  fixture.

### TT-120-03 Evidence Packs

**Outcome:** Users can export a privacy-safe evidence bundle for a session,
project, scan, or metric view.

- Export JSON and Markdown.
- Include totals, confidence drivers, source files, parser notes, model-rate
  state, and repair links.
- Exclude raw prompts/message bodies by default.
- Add redaction manifest to every pack.

### TT-120-04 Scan Scheduling

**Outcome:** Local scheduled scans can run on dashboard open, hourly, daily, or
manual-only.

- Store schedule policy locally in Settings.
- Show last scheduled scan result and failure reason.
- Keep scheduling opportunistic and local; no background cloud service.
- Add scan-history retention setting.

### TT-120-05 Budget & Guardrail V2

**Outcome:** Guardrails can be scoped by project, model, and tool.

- Keep global monthly token/cost limits.
- Add scoped project/model/tool monthly limits and warning thresholds.
- Show status and movement since the previous scan where possible.
- Add anomaly flags for spikes and confidence drops.
- Add guardrail templates.

### TT-120-06 Parser / Import Profile Builder

**Outcome:** Users can preview a local file before adding an import profile.

- Sample a local file path.
- Show parser detection, previewed fields, imported-session shape, warnings, and
  recommended matchers.
- Let users convert the preview into a profile matcher without writing parser
  code.
- Export prompt-free parser fixtures for issue reports.

### TT-120-07 Saved Reports

**Outcome:** Users can export recurring reports without hand-building filters.

- Weekly usage report.
- High-cost session report.
- Unknown-cost repair report.
- Confidence trend report.
- Markdown and CSV formats.
- Guardrail status and source coverage reports.
- JSON format for agents and scripts.

### TT-120-08 Performance Pass

**Outcome:** Dense pages stay responsive as imported data grows.

- Paginate large session tables client-side.
- Keep loading states visible during route transitions.
- Surface scan progress/result summaries after scan actions.
- Keep report and evidence exports deterministic for large datasets.

### TT-120-09 Local Backup & Operating Metadata

**Outcome:** Users can export local operating metadata without exporting raw
usage content.

- Export settings, source catalog, schedules, guardrails, report definitions,
  and roadmap status.
- Keep usage records and raw prompt text out of metadata backup by default.
- Provide a restore-safe JSON shape for future imports.

### TT-120-10 Agent-Readable Roadmap V2

**Outcome:** `tokentrace roadmap --json` and `/api/roadmap` become a live
handoff for agents.

- Include current release, next planned release, rolled-up release themes,
  cards, evidence paths, verification gates, and release status.
- Keep the shape stable for non-human consumers.
- Add action recipes for scan, evidence export, repair review, reports, Scan
  Health, and model-rate review.

## Release Criteria

- `CHANGELOG.md` has a complete 0.12.0 section.
- `tokentrace roadmap --json` reports current `0.12.0` and next planned
  `0.19.0`.
- Evidence packs do not include raw prompt text by default.
- Native adapter, scheduler, guardrail, profile preview, report, and roadmap
  tests pass.
- `npm run release:check` passes before publishing.
