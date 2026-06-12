# Privacy And Data Handling

## Plain-English Summary

TokenTrace is local-first. The ChatGPT app only returns a selected redacted evidence pack for review. Raw prompts, completions, and message bodies are excluded from normal tool output.

## Data Returned To ChatGPT

The `get_redacted_evidence_pack` tool may return:

- aggregate token totals;
- estimated cost totals;
- session and interaction counts;
- unknown-cost interaction counts;
- confidence drivers;
- source-file paths used as provenance references;
- parser notes;
- model-rate state;
- local dashboard repair links.

## Data Excluded From Normal Output

Raw prompts, completions, and message bodies are excluded. Raw text previews are also excluded.

## Network And Storage

The app does not add telemetry, cloud sync, packet capture, browser extensions, desktop app scraping, or hosted storage. The hosted MCP endpoint is used so ChatGPT can connect to the app during developer-mode testing and public app review.

## User Control

Users choose whether to connect TokenTrace in ChatGPT. The app tool is read-only and returns redacted evidence. Write actions are not part of the current ChatGPT app prototype.

## Reviewer Assurance

The release gate verifies that the hosted tool call returns `tokentrace.evidence-pack.v1` and that `rawContentIncluded` is `false`:

```bash
npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
```
