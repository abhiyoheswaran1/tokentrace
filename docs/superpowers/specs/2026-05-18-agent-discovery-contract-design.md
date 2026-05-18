# Agent Discovery Contract Design

## Context

TokenTrace already ships a local CLI, JSON commands, Claude Code status-line support, and a dashboard guide. Agents can technically use those surfaces today, but they need to infer the right commands from README prose or human instructions.

## Decision

Add a generic, machine-readable discovery command:

```bash
tokentrace agent --json
```

`tokentrace capabilities --json` will be an alias for the same output. The command is read-only, does not initialize the database, does not scan files, and does not start the dashboard.

## Manifest Shape

The manifest is versioned with `schemaVersion: 1` and includes:

- product identity and npm package metadata
- local-first privacy guarantees
- agent-safe commands with output formats, mutation level, and recommended follow-ups
- common workflows for first use, daily review, Claude Code setup, and Codex fallback
- integration notes for Claude Code and Codex
- guardrails that prevent misleading interpretation or destructive actions

The manifest favors command arrays so agents can call commands without parsing shell strings. Follow-up commands use the same structure.

The schema lives at `docs/agent-discovery.schema.json` and the manifest's `schema`
field points to that published schema location.

## User-Facing Surfaces

- README gets a short "For Coding Agents" section.
- The in-app Guide gets an Agent Discovery section.
- The CLI help lists both `agent --json` and `capabilities --json`.
- `TOKENTRACE_AGENT.md` and `llms.txt` give package-inspecting agents a concise
  non-runtime starting point.
- The 0.10.0 roadmap and changelog record the feature under Unreleased.

## Non-Goals

- No MCP server.
- No cloud registry.
- No Codex native status-line hook until Codex exposes a stable contract.
- No automatic scan or reset.
- No version bump, tag, GitHub Release, or npm publish.

## Testing

- Unit test the manifest shape and guardrails.
- Unit test the schema, package-level docs, and package inclusion list.
- CLI test `tokentrace agent --json` in a blocked app-data directory to prove it is read-only.
- Smoke test the new CLI command.
- Guide render test covers the visible docs.
