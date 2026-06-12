# Review Response Template

Use this when responding to OpenAI review feedback.

## Metadata Or Listing Feedback

Subject: TokenTrace ChatGPT app review response - Case ID: [CASE_ID]

Hello OpenAI review team,

Thank you for the feedback on TokenTrace. I updated the app metadata to clarify that TokenTrace is a read-only, local-first AI usage analytics app. The description now states that the app returns redacted evidence packs and excludes raw prompts, completions, and message bodies.

Hosted MCP URL:

```text
https://YOUR_HOSTED_DOMAIN/mcp
```

Validation command:

```bash
npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
```

## MCP Connectivity Feedback

Subject: TokenTrace MCP endpoint review response - Case ID: [CASE_ID]

Hello OpenAI review team,

I corrected the hosted MCP endpoint and revalidated it. The endpoint is public, uses HTTPS, ends in `/mcp`, and advertises the read-only `get_redacted_evidence_pack` tool.

Validation result summary:

- `initialize`: pass
- `tools/list`: pass
- widget resource: pass
- redacted tool call: pass
- `rawContentIncluded`: false

## Privacy Or Data Handling Feedback

Subject: TokenTrace privacy clarification - Case ID: [CASE_ID]

Hello OpenAI review team,

TokenTrace returns redacted evidence packs only. Raw prompts, completions, message bodies, and raw text previews are excluded from normal tool output. The tool is read-only and does not add telemetry, hosted storage, cloud sync, browser extensions, packet capture, or desktop app scraping.

The app's release gate verifies that the tool result has `rawContentIncluded: false`.

## Resubmission Note

I have made the requested change and resubmitted the app version for review. Please use the current hosted MCP URL and the test prompts included in the submission form.
