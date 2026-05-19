# TokenTrace 0.11.0 Roadmap

0.11.0 is the Accuracy & Evidence release.

The release should make TokenTrace answer one question better than before:
"Can I trust this number?" The work focuses on token estimate quality, native
local database ingestion, session-level explanations, repair operations, import
profiles, confidence scoring, and supply-chain trust visibility.

## Product Thesis

TokenTrace should feel like a local ledger with evidence, not a dashboard of
opaque totals. Every important usage number should explain whether it came from
exact provider tokens, tokenizer-backed estimates, simple estimates, editable
model rates, parser confidence, or repairable gaps.

## 0.11.0 Cards

### TT-110-01 Tokenizer-Aware Estimates

**Outcome:** Estimated token counts are labeled by method instead of being one
generic low-confidence bucket.

- Keep exact provider tokens as `exact`.
- Use provider/model-aware tokenizer estimates where the model family can be
  recognized.
- Fall back to simple estimates only when no tokenizer family is available.
- Persist the estimate method in interaction metadata.

### TT-110-02 Native SQLite History Adapter

**Outcome:** Local tool history databases can be imported without exporting
JSONL first.

- Detect SQLite files with usage-shaped history tables.
- Import local records into the same normalized session/interactions model.
- Keep evidence paths, parser metadata, and raw-content privacy behavior.

### TT-110-03 Session Drilldown V2

**Outcome:** One session explains spikes, cache, model changes, cost state,
token confidence, and repair next steps.

- Add a session confidence summary.
- Explain token spikes and unknown-cost causes.
- Link repairable cost gaps to the repair workbench.

### TT-110-04 Repair Workbench V2

**Outcome:** Unknown-cost repair is operational at group level.

- Add bulk review actions for unresolved groups.
- Add verified state and recalculation guidance.
- Keep model-rate, parser, and evidence links visible.

### TT-110-05 Import Profiles

**Outcome:** Power users can describe local log conventions without writing
parser code.

- Add built-in profile descriptions for generic JSONL, text logs, and SQLite
  history.
- Store optional custom profile hints locally in Settings.
- Attach matching profile metadata to scan-file evidence.

### TT-110-06 Data Confidence Score

**Outcome:** Overview, sessions, and projects get a visible confidence score.

- Score exact tokens, estimator quality, priced cost coverage, parser
  confidence, and scan freshness.
- Include score drivers so users know what to fix.

### TT-110-07 Supply Chain Check In Scan Health

**Outcome:** The supply-chain IOC scanner is visible in the product, not only
as an npm script.

- Surface the local check in Scan Health and Guide.
- Keep the npm release gate running `npm run security:ioc`.

## Release Criteria

- `CHANGELOG.md` has a complete 0.11.0 section.
- `npm run release:check` passes with localhost smoke enabled.
- The Git tag matches package version.
- npm shows `tokentrace@0.11.0` as latest after publish.
