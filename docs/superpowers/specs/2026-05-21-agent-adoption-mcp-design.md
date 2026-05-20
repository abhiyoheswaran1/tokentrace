# Agent Adoption MCP Design

## Goal

Make TokenTrace easier for coding agents to discover, trust, and use through MCP
without weakening the local-first privacy model.

## Product Shape

TokenTrace already publishes `io.github.abhiyoheswaran1/tokentrace` to the MCP
registry and starts a local stdio server with `tokentrace mcp`. This pass makes
that server more agent-operable by giving agents a first tool to ask for guidance,
consistent response metadata, and a self-test command that verifies the local MCP
entrypoint before a user asks an agent to depend on it.

The adoption story stays practical:

- MCP-capable clients can install/discover TokenTrace from the registry.
- Agents can call `get_agent_guide` before using other tools.
- Tool responses include a stable envelope with summary, confidence, next actions,
  warnings, evidence hints, and whether human confirmation is needed.
- `run_scan` remains explicit and refuses to scan unless `confirmLocalScan=true`.
- Docs give humans and agents copy-paste recipes for common workflows.

## MCP Contract

Each successful MCP tool returns JSON text with this shape:

```json
{
  "summary": "Short human-readable result.",
  "confidence": "high",
  "nextActions": ["Call run_doctor before reporting usage totals."],
  "warnings": [],
  "evidence": [
    {
      "label": "Agent discovery manifest",
      "command": ["tokentrace", "agent", "--json"]
    }
  ],
  "requiresHumanConfirmation": false,
  "data": {}
}
```

The envelope is additive: agents that only need the payload can read `data`, while
agents that plan a workflow can use `nextActions`, `warnings`, and
`requiresHumanConfirmation`.

## New Tool

`get_agent_guide` returns the recommended MCP loop:

1. `get_capabilities`
2. `get_status`
3. `run_doctor`
4. `get_evidence` before numeric token/cost/session claims
5. `get_repair_queue` when unknown costs exist
6. `get_report` for handoff text
7. `run_scan` only with explicit local-scan confirmation

It also returns install snippets and an `AGENTS.md` copy block.

## CLI Self-Test

`tokentrace mcp selftest --json` starts the local MCP runtime in-process through
the same handler used by stdio, verifies initialization, tool listing, guide
response, and the `run_scan` confirmation refusal. It does not scan files and
does not initialize the local app database.

Plain `tokentrace mcp` remains the stdio server. Unknown subcommands continue to
fail with usage text.

## Documentation

Add a dedicated agent adoption page under `docs/agent-adoption.md` with:

- MCP registry name and npm stdio command.
- Copy-paste AGENTS.md block.
- Recipes for health checks, usage spike explanation, unknown-cost repair, scan
  refresh, and evidence-backed cost reporting.
- Guardrails that raw prompts and message bodies are not part of the normal MCP
  surface.

Update README, `TOKENTRACE_AGENT.md`, `llms.txt`, and the website update prompt
to point agents at the new guide and recipes.

## Testing

Tests cover:

- `tools/list` includes `get_agent_guide`.
- `get_agent_guide` returns registry, npm, workflow, and AGENTS.md copy data.
- Read-only MCP tools use the response envelope.
- `run_scan` refusal uses the same envelope and marks human confirmation.
- `tokentrace mcp selftest --json` passes in a blocked app-data directory.
- Package trust checks include `docs/agent-adoption.md`.

Verification remains the usual release-quality path: targeted Vitest, CLI smoke,
package trust, ProjScan doctor, and browser guard if UI docs or dashboard behavior
changes affect the app surface.
