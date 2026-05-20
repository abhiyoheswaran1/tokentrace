# TokenTrace MCP Server Design

## Context

TokenTrace already exposes agent-readable JSON commands, package-level agent docs,
and local dashboard API aliases. The MCP registry requires an actual MCP server
entrypoint, not a general CLI package with a generated placeholder manifest.

## Decision

TokenTrace 0.14.0 adds `tokentrace mcp`, a local stdio MCP server that wraps the
existing proven CLI JSON surfaces. The server starts without scanning files,
opening the dashboard, or making a network request. It speaks line-delimited
JSON-RPC over stdin/stdout and keeps stdout reserved for MCP messages.

## Tools

- `get_capabilities`: returns the existing agent discovery manifest and remains
  safe when TokenTrace app data is blocked.
- `get_status`: returns `tokentrace status --json`.
- `run_doctor`: returns `tokentrace doctor --json`.
- `get_evidence`: returns `tokentrace evidence --json`, optionally scoped by
  metric.
- `get_repair_queue`: returns `tokentrace repair --json`.
- `get_report`: returns the deterministic local report as Markdown or JSON.
- `run_scan`: runs `tokentrace scan --json` only when the caller sends
  `confirmLocalScan=true`; this makes local file reads and local database writes
  explicit.

## Guardrails

The first MCP release intentionally excludes reset, pricing refresh, raw prompt
or message-body access, dashboard startup, and arbitrary command execution.
Future MCP write tools should require explicit argument-level acknowledgement
and targeted tests before being exposed in `tools/list`.

## Registry

`server.json` points the MCP registry at the npm package with `tokentrace mcp` as
the stdio entrypoint. It must be validated with `mcp-publisher validate
server.json` before release and published only after the matching npm version is
available.
