# ChatGPT App Prototype Design

## Purpose

Build a private developer-mode ChatGPT app prototype for TokenTrace without changing the local-first product boundary. The prototype gives ChatGPT one read-only tool for a selected, redacted evidence pack and a compact widget for inspecting that pack inside ChatGPT.

This is not a public app launch. It is a local development connector that can be exposed through an HTTPS tunnel for testing in ChatGPT developer mode.

## Source Notes

OpenAI's Apps SDK documentation says a ChatGPT app needs an HTTP-reachable MCP server, tool descriptors, structured tool results, and optional iframe UI resources. The docs also recommend the MCP Apps UI bridge, `structuredContent`, `_meta.ui.resourceUri`, and a `text/html;profile=mcp-app` UI resource.

Primary docs checked on 2026-06-12:

- https://developers.openai.com/apps-sdk/quickstart
- https://developers.openai.com/apps-sdk/build/mcp-server
- https://developers.openai.com/apps-sdk/build/chatgpt-ui
- https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- https://developers.openai.com/apps-sdk/deploy/testing

## Scope

The prototype includes:

- A local command: `tokentrace chatgpt-app`.
- A local HTTP MCP endpoint at `/mcp`.
- One read-only Apps SDK tool: `get_redacted_evidence_pack`.
- One widget resource: `ui://tokentrace/evidence-pack.html`.
- A self-test command: `tokentrace chatgpt-app selftest --json`.
- Documentation for developer-mode testing with an HTTPS tunnel.

The prototype excludes:

- Public ChatGPT app submission.
- OAuth, account linking, or hosted storage.
- Cloud sync, telemetry, packet capture, browser extensions, or desktop app scraping.
- Any normal UI path that exposes raw prompts or message bodies.

## Tool Behavior

`get_redacted_evidence_pack` accepts an optional `metric` enum matching TokenTrace evidence metrics. It returns:

- `structuredContent.pack`: a `tokentrace.evidence-pack.v1` artifact.
- `structuredContent.summary`: short model-visible guidance about the selected evidence.
- `content`: short text for the assistant response.
- `_meta`: widget-only detail such as the redaction policy and source count.

The tool is idempotent, read-only, and local database backed. It does not scan files, mutate data, or make network requests.

## UI Behavior

The widget is a single HTML resource with inline CSS and JavaScript. It listens for `ui/notifications/tool-result`, also reads `window.openai.toolOutput` when available, and renders the evidence pack totals, redaction policy, confidence drivers, and source-file counts.

The widget inherits system fonts, uses restrained color, and does not include a logo because ChatGPT supplies app branding around widgets.

## CLI and Server

`tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1` starts a local HTTP server. The server:

- Handles `GET /` as a health check.
- Handles CORS preflight for `/mcp`.
- Serves MCP over HTTP at `/mcp` using the official Model Context Protocol SDK transport.
- Registers the tool and widget resource through the Apps SDK helper package.

The command prints the local MCP URL and reminds the user that ChatGPT requires an HTTPS tunnel for developer-mode connector testing.

## Testing

Tests cover:

- Tool descriptor metadata, read-only annotations, widget URI, and output template.
- Tool result shape and redaction guarantees.
- Widget resource MIME type and bridge listener.
- Self-test behavior.
- CLI command routing for `chatgpt-app selftest --json`.

The implementation also runs targeted tests, TypeScript, lint, ProjScan doctor, and a local server smoke check before completion claims.

