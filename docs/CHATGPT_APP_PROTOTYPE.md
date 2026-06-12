# ChatGPT App Prototype

TokenTrace includes a private developer-mode ChatGPT app prototype for redacted evidence packs. It is meant for local testing only.

## What It Does

- Starts a local HTTP MCP server at `/mcp`.
- Registers one read-only Apps SDK tool: `get_redacted_evidence_pack`.
- Returns `tokentrace.evidence-pack.v1` data built from the local TokenTrace database.
- Renders a compact Apps SDK widget from `structuredContent`.
- Excludes raw prompts, completions, message bodies, and raw text previews.

## What It Does Not Do

- It does not submit or publish a public ChatGPT app.
- It does not scan files on startup.
- It does not upload local usage history by itself.
- It does not add telemetry, cloud sync, browser extensions, desktop scraping, or hosted storage.
- It does not expose raw prompts or message bodies through the normal tool result.

## Local Commands

Run the self-test:

```bash
tokentrace chatgpt-app selftest --json
```

Start the local prototype server:

```bash
tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1
```

The local MCP URL is:

```text
http://127.0.0.1:8787/mcp
```

Health check:

```bash
curl http://127.0.0.1:8787/
```

## ChatGPT Developer-Mode Test

ChatGPT requires an HTTPS-reachable connector URL. For local development, expose the local server through a secure tunnel:

```bash
ngrok http 8787
```

Use the tunnel's HTTPS URL with `/mcp` appended, for example:

```text
https://example.ngrok.app/mcp
```

In ChatGPT:

1. Open Settings -> Apps & Connectors.
2. Enable developer mode under Advanced settings if available.
3. Create a connector.
4. Set the connector URL to the HTTPS `/mcp` URL.
5. Confirm the tool list includes `get_redacted_evidence_pack`.

Suggested prompt:

```text
Use TokenTrace to show my redacted evidence pack for processed tokens.
```

## Verification

Local checks:

```bash
npm test -- tests/chatgpt-app-prototype.test.ts tests/chatgpt-app-cli.test.ts tests/evidence-pack.test.ts tests/evidence-pack-api.test.ts
tsc --noEmit
npm run lint
npm run projscan:doctor
```

Release readiness:

```bash
npm run release:chatgpt:check
npm run release:chatgpt:check -- --mcp-url https://example.com/mcp
```

For MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest --server-url http://127.0.0.1:8787/mcp --transport http
```

## Current Release Posture

Keep this prototype private until developer-mode testing proves that the redacted evidence-pack workflow is useful without weakening TokenTrace's local-first promise. Public app submission still requires a separate privacy, support, metadata, screenshot, auth, and review pass.

For release setup, account choice, CI wiring, and the OpenAI Dashboard manual gate, see `docs/CHATGPT_APP_RELEASE.md`.
