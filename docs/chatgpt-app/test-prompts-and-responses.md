# Test Prompts And Expected Responses

Use these prompts during ChatGPT developer-mode testing and paste the useful examples into the OpenAI Platform Dashboard submission form.

## Prompt 1

```text
Use TokenTrace to show my redacted evidence pack for processed tokens.
```

Expected behavior:

- ChatGPT invokes `get_redacted_evidence_pack`.
- The result schema is `tokentrace.evidence-pack.v1`.
- The response summarizes token totals and confidence drivers.
- The response states that raw prompts and message bodies are excluded.

## Prompt 2

```text
Use TokenTrace to explain what is driving unknown cost in my local usage.
```

Expected behavior:

- ChatGPT invokes `get_redacted_evidence_pack`.
- The response explains unknown-cost interaction counts and model-rate state.
- The response can suggest checking TokenTrace repair links.
- The response does not display raw prompts or completions.

## Prompt 3

```text
Use TokenTrace to summarize my session evidence without showing raw prompts.
```

Expected behavior:

- ChatGPT invokes `get_redacted_evidence_pack` with a session-oriented metric when available.
- The response summarizes session count, interaction count, and confidence drivers.
- The response avoids raw message content.

## Prompt 4

```text
Use TokenTrace to tell me whether raw message content is included in the evidence pack.
```

Expected behavior:

- ChatGPT invokes `get_redacted_evidence_pack`.
- The response explicitly says `rawContentIncluded` is `false`.
- The response explains that raw prompts, completions, and message bodies are excluded by default.

## Reviewer Troubleshooting Notes

If the tool is not visible, refresh connector metadata in ChatGPT after redeploying the hosted MCP server. If the connector fails to create, run:

```bash
npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
```
