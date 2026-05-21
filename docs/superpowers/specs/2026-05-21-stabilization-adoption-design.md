# Stabilization And Adoption Design

## Goal

Move TokenTrace out of feature-building mode and into stabilization/adoption mode.
The work validates real usage paths, documents the public website handoff, tests
fresh install behavior, verifies MCP compatibility, records friction, and fixes
only concrete bugs or adoption blockers found during the pass.

## Scope

This pass does not add new product areas. It exercises the existing mature
surface:

- local scan and evidence workflows
- first-run and fresh install paths
- dashboard and mobile browser guardrails
- package trust and release gates
- MCP registry, stdio server, self-test, and guide
- public website update prompt and live-site gap notes

## Stabilization Rules

- Do not add feature ideas unless a test or dogfood run exposes a blocker.
- Treat weird local parser behavior, first-run confusion, large databases, MCP
  client compatibility, and install/runtime failures as the main risk areas.
- Prefer checklists, scripts, docs, and targeted tests over new UI.
- Any code fix must be backed by a failing test or a reproduced command failure.

## Deliverables

- A stabilization checklist under `docs/stabilization/`.
- A friction log that separates verified blockers from observations.
- Fresh install and package-runtime evidence.
- Real MCP client compatibility evidence using the official MCP SDK when
  available locally or installable.
- Updated website handoff notes and live-site delta notes.
- Targeted fixes only when evidence shows a bug or adoption blocker.

## Verification

Run targeted checks as issues are found, then finish with:

- `npm run release:check`
- `npm run browser:guard`
- `tokentrace mcp selftest --json`
- package/fresh-install smoke where the sandbox allows it
- ProjScan doctor
