# TokenTrace 0.12.0 Local Sources & Trust Design

## Goal

0.12.0 is a larger Local Sources & Trust release. It rolls the next several
minor-version themes into one public release so users get a deeper product
upgrade instead of daily releases.

## Product Thesis

0.11.0 made the numbers explain themselves. 0.12.0 makes more local sources
first-class, makes evidence portable, and turns repair, guardrails, reports, and
agent handoff into operational workflows.

## Rolled-Up Release Scope

### 0.12.0 Local Sources

The import layer should feel intentional, not opportunistic.

- Add a source catalog that tells users what TokenTrace knows how to import.
- Add first-class adapters for structured local usage logs and Cursor-style
  chat/composer exports.
- Add an adapter coverage matrix so Scan Health can say whether a file was
  parsed by a native adapter, profile-assisted generic adapter, or fallback.
- Preserve source-provided costs and parser provenance.

### 0.13.0 Evidence Portability

Evidence should be usable outside the dashboard without leaking prompts.

- Add evidence packs for session, project, scan, metric, repair item, and model
  rate views.
- Export JSON and Markdown with deterministic ordering.
- Include a redaction manifest that explicitly states raw prompt text was
  excluded.
- Add evidence-pack links from Evidence, Sessions, Repair, Projects, and Scan
  Health.

### 0.14.0 Local Operations

TokenTrace should behave like a local tool users can leave running.

- Add manual-only, on-open, hourly, and daily scan scheduling.
- Add due-scan checks when the dashboard/API starts.
- Show latest scheduled scan result, records imported, warnings, errors, and
  next action.
- Add scan history retention settings and a local backup/export command surface.

### 0.15.0 Governance & Guardrails

Guardrails should help users prevent surprises instead of only reporting totals.

- Add project/model/tool scoped monthly token and cost limits.
- Add warning thresholds per guardrail.
- Add movement since previous scan for cost, tokens, unknown cost, and sessions.
- Add anomaly flags for sudden spikes, unknown-cost growth, and confidence drops.
- Add guardrail policy templates for solo developers, teams, and CI/wrapper use.

### 0.16.0 Parser Studio

Import Profiles should be something users can create safely without reading
parser code.

- Add a file preview endpoint that samples a local file.
- Show detected adapter, fields, likely sessions/interactions, warnings, and
  recommended matchers.
- Validate profile matchers before saving.
- Add parser fixture export so users can report parser issues without prompts.
- Add confidence notes explaining why a parser matched or declined a file.

### 0.17.0 Reports

Reports should turn local usage into shareable operating artifacts.

- Add saved report definitions for weekly usage, high-cost sessions,
  unknown-cost repair, confidence trends, guardrail status, and source coverage.
- Export Markdown, JSON, and CSV.
- Add CLI support for the same report definitions.
- Add report previews in the dashboard.
- Add deterministic filenames and no-raw-content defaults.

### 0.18.0 Agent Handoff

Agents should be able to find, understand, verify, and operate TokenTrace.

- Upgrade `tokentrace roadmap --json` to a live release handoff.
- Add next planned release, rolled-up themes, open/future cards, evidence paths,
  verification gates, command hints, and release status.
- Add action recipes for scan, evidence export, repair review, report export,
  and health checks.
- Keep schema stable and documented for non-human consumers.

## Architecture

The release stays local-first and uses the existing Next.js dashboard, SQLite
database, Drizzle schema, and CLI runtime. New state that does not need
relational querying lives in the existing `settings` JSON row for backward
compatibility. New export surfaces are deterministic server-side builders with
API routes so the same logic can later be reused by CLI commands.

## Main Components

- Native adapters: add first-class local adapters before generic fallbacks.
- Source catalog: document adapter status, discovery matchers, confidence, and
  next action.
- Evidence packs: build privacy-safe JSON/Markdown/CSV exports without raw
  prompt text by default.
- Scan scheduler: store a local schedule policy and run due scans only when the
  local dashboard or API asks for it.
- Guardrail V2: preserve global monthly limits and add scoped limits for
  project/model/tool, thresholds, movement, and anomalies.
- Import profile preview: read a selected local file, run detection and a small
  parse preview, then return fields, warnings, and recommended matchers.
- Saved reports: expose deterministic report bundles through `/api/reports`.
- Performance: paginate dense session tables client-side, expose scan
  progress/result summaries, and keep page transitions visibly loading.
- Roadmap V2: include `current`, `next`, `rolledUpReleases`, `cards`,
  `verification`, `handoff`, and action recipes in roadmap JSON.

## Privacy Rules

Evidence packs and previews do not include raw prompt/message bodies unless the
user has already enabled raw content storage and explicitly requests raw export
later. The default output contains paths, counts, timestamps, parser metadata,
confidence drivers, model-rate state, and repair links.

## Testing Strategy

Each new behavior gets focused unit coverage: adapter parsing, evidence pack
redaction, scheduler due logic, scoped guardrail evaluation, import preview,
saved report rendering, session pagination defaults, and roadmap handoff
shape. Full release gates remain `npm run release:check`, plus unsandboxed
smoke checks before publishing.
