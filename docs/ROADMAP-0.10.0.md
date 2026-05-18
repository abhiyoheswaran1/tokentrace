# TokenTrace 0.10.0 Roadmap

0.10.0 is the Guided Operator release.

This development line should make TokenTrace easier to adopt and harder to
misread. The work focuses on in-app guidance, live-status clarity, truthful
trend displays, agent discovery, and release-safe engineering discipline. It
does not include cloud sync, telemetry, or new ingestion scope.

## Product Thesis

TokenTrace should explain itself where users actually work: inside the local
dashboard and CLI. A user should understand how to scan, how to read Claude Code
status-line numbers, why a chart shows idle days, how to repair unknown cost,
what remains local, and how an agent can safely discover TokenTrace without
leaving the product.

## Release Rules

- No public tag, GitHub Release, npm publish, release push, or version bump
  until the maintainer explicitly asks for release.
- User-facing changes stayed under `CHANGELOG.md` `Unreleased` during
  development, then moved into the versioned 0.10.0 release section.
- Use Superpowers workflow for coding: design, plan, TDD, review, and
  verification before completion claims.
- Use ProjScan as a required quality gate after substantial changes and before
  release readiness claims.
- Before any final public release, read `docs/RELEASE_CHECKLIST.md` and run the
  documented package, smoke, audit, ProjScan, changelog, and tag/version gates.

## 0.10.0 Cards

### TT-100-01 In-App Guide

**Outcome:** Users can learn the product from inside the dashboard.

- Add a Guide route to desktop and mobile navigation.
- Cover first scan setup, Claude Code status-line installation, status-line
  labels, common workflows, privacy, and troubleshooting.
- Include a local setup-status strip using scan health, imported records,
  unknown-cost count, and priced-model coverage.
- Add a first-run guided setup path for scan roots, first scan, Doctor review,
  Claude Code status-line setup, and daily review.
- Add agent quickstart, release-readiness, and empty-state playbook sections so
  the Guide covers both human setup and automation setup.

### TT-100-02 Status-Line Truthfulness

**Outcome:** Claude Code status-line numbers are harder to misread.

- Lead with live context percentage and cost.
- Label cumulative transcript usage as processed usage instead of session size.
- Keep cache visible as the usual explanation for very large processed totals.
- Preserve compact and wide mode compatibility with Claude Code stdin JSON.

### TT-100-03 Trend Continuity

**Outcome:** Token and cost trend charts do not visually hide idle days.

- Fill missing daily buckets with explicit zero-value points.
- Preserve selected date ranges and all-time first-to-last usage behavior in
  analytics while defaulting the visible chart window to the latest 60 days.
- Provide one shared trend control bar for token and cost charts so bucket and
  window changes stay synchronized.
- Keep weekly and monthly chart aggregation based on the corrected daily series.

### TT-100-04 Release-Safe Agent Workflow

**Outcome:** Coding agents follow the same release discipline as maintainers.

- Add repo-level `AGENTS.md` and `CLAUDE.md` instructions.
- Store persistent Codex memory for Superpowers, ProjScan, changelog, and
  release-approval requirements.
- Keep ProjScan in release and security gates.

### TT-100-05 Agent Discovery Contract

**Outcome:** Coding agents can find and use TokenTrace without human command
guesswork.

- Add `tokentrace agent --json` and `tokentrace capabilities --json`.
- Publish a versioned local-first manifest with commands, workflows,
  integrations, privacy rules, and guardrails.
- Ship package-level agent references through `TOKENTRACE_AGENT.md`, `llms.txt`,
  and `docs/agent-discovery.schema.json`.
- Keep follow-up commands structured as argument arrays so agents do not need to
  split shell strings.
- Keep discovery read-only: no scan, dashboard startup, database
  initialization, or network request.
- Expose the same manifest at `/api/agent` and `/api/capabilities` for agents
  that can inspect an already-running local dashboard.
- Document the surface in README and Guide.

### TT-100-06 Product Polish And Verification

**Outcome:** The new guidance remains compact, local-first, and verified.

- Add focused render tests for Guide content and navigation.
- Add `tokentrace roadmap --json` and `/api/roadmap` so the implemented
  cards, evidence paths, verification gates, and release status are
  machine-readable.
- Add inline Overview trust annotations for processed, non-cache, cached, cost,
  and session counts so uncertainty sits next to the number.
- Keep Usage Pulse useful on All time by comparing the latest seven imported
  days with the previous seven days and suppressing tiny-baseline percentage
  spikes.
- Cover no data, missing logs, unknown pricing, parser warnings, and sandbox
  smoke skip states in the product Guide.
- Harden package inspection so the npm tarball must include the agent
  discovery docs, schema, and executable CLI bin while excluding generated
  Next.js output.
- Extend packed-install smoke so the packed CLI proves `agent --json`,
  `capabilities --json`, and `roadmap --json` stay machine-readable.
- Run `npm run verify`, `npm run build`, `npm run smoke:cli`,
  `npm run smoke:packed`, `npm run package:inspect`, and
  `npm run projscan:doctor` before considering the slice stable.
- Update README and screenshots only when visible public documentation changes.

## Current Development Status

- TT-100-01: implemented in `/guide`.
- TT-100-02: implemented in Claude Code status-line formatting.
- TT-100-03: implemented in analytics trend series filling.
- TT-100-04: implemented through repo instructions and Codex memory.
- TT-100-05: implemented through `tokentrace agent --json` and the
  `capabilities` alias.
- TT-100-06: implemented through focused tests, full verify/build/smoke gates,
  package inspection, packed-install discovery smoke, ProjScan doctor, and no
  version bump.

## Release Criteria

0.10.0 release gates:

- The maintainer explicitly asked to bump and release on May 18, 2026.
- `CHANGELOG.md` has a complete versioned 0.10.0 section moved out of
  `Unreleased`.
- `npm run release:check` must pass on the release commit.
- Forced packed-install smoke must pass outside sandbox when needed.
- `npm run projscan:doctor` must pass as part of the release check.
- Git tag must match package version.
- GitHub Release notes must contain the complete matching changelog section.
- npm must show the expected published version after the Trusted Publishing
  workflow completes.
