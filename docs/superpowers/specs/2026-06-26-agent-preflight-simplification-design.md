# Agent Preflight Simplification Design

## Summary

TokenTrace should become easier to understand by leading with one operational question: can a developer or coding agent start the next AI CLI run with trustworthy local usage data? The product keeps the existing local-first evidence model, but compresses the daily workflow into Today, Sessions, Evidence, and Fix Data, with advanced diagnostic pages still available for maintainers.

## Goals

- Add a local-only preflight report that tells humans and agents whether to proceed, proceed with caution, or stop and repair data before another expensive agent run.
- Expose the preflight report through CLI, MCP, agent discovery, and documentation.
- Simplify the dashboard navigation language so the primary workflow is obvious without removing existing diagnostic depth.
- Fix the overview first-run state so it uses latest scan context when local scans ran but imported no interactions.
- Keep implementation deterministic, privacy-preserving, and testable without raw prompts, telemetry, cloud sync, or background services.

## Non-Goals

- No release, version bump, tag, npm publish, GitHub release, hosted service, telemetry, proxying, packet capture, or browser extension.
- No broad visual redesign. The UI remains the existing warm, compact TokenTrace product surface.
- No natural-language parsing inside TokenTrace. Agents may interpret JSON externally.

## Product Shape

### Preflight

`tokentrace preflight --json` returns a deterministic JSON report with:

- `decision`: `proceed`, `caution`, or `blocked`
- `headline` and `summary`
- scan freshness and latest-scan status
- cost confidence and unknown-cost counts
- guardrail status
- recent anomaly counts and maximum severity
- ranked findings with evidence and actions
- command-oriented next actions
- privacy notes

The report is read-only and uses existing local data only. It may initialize the local database the same way other read-only reporting commands do, but it must not scan files or use the network.

### Dashboard Shell

The shell should show the daily user path first:

- Today
- Sessions
- Evidence
- Fix Data
- Reports
- Settings

Advanced surfaces remain present under an Advanced section:

- Tools
- Models
- Projects
- Query
- Scan Health
- Discovery
- Parsers
- Raw Data
- Model Rates
- Guide

This reduces first-run cognitive load without removing diagnostic capability.

### Overview Bug Fix

The split overview data path currently builds first-run state without latest scan information, so the first-run panel can imply no scan history even after a scan imported zero records. The primary overview data path must include latest scan details when the panel is rendered.

## Interfaces

- Library: `src/lib/preflight.ts`
- CLI script: `scripts/preflight.ts`
- CLI command: `tokentrace preflight --json`
- MCP tool: `get_preflight`
- Agent discovery command id: `preflight`
- Documentation: README, TokenTrace agent guide, llms.txt, adoption guide, changelog

## Testing

- Pure unit tests for preflight decisions and ranked findings.
- Overview data test for latest-scan propagation into first-run state.
- Agent discovery and MCP tests for the new command/tool contract.
- Existing `npm run verify`, `npm run build`, and `npm run projscan:doctor` before completion.

## Quality Notes

Keep preflight composition pure where possible. The snapshot function should be a thin adapter around existing analytics, doctor, anomaly, and recommendation functions. Avoid adding new database queries unless existing surfaces cannot provide the required evidence.
