# ChatGPT App Submission Copy

## App Name

TokenTrace

## One-Line Description

Local-first AI usage analytics for token, cost, and session review.

## Short App Description

TokenTrace helps you understand AI CLI usage with redacted, evidence-backed summaries of tokens, costs, sessions, unknown-cost drivers, and review status.

## Long App Description

TokenTrace is a local-first dashboard and CLI for reviewing AI usage from developer tools. The ChatGPT app exposes one read-only workflow: a redacted evidence pack that ChatGPT can explain without receiving raw prompts, completions, message bodies, or raw text previews.

Use TokenTrace in ChatGPT when you want help interpreting token totals, session counts, estimated costs, unknown-cost items, cache/non-cache token state, and confidence drivers from local TokenTrace data.

## Connector Description

Use TokenTrace to explain redacted local AI usage evidence, including token totals, cost confidence, unknown-cost drivers, session counts, and review status.

## Tool Description

`get_redacted_evidence_pack` returns a selected TokenTrace evidence pack for ChatGPT review. The tool is read-only, non-destructive, closed-world, and excludes raw prompts, completions, and message bodies.

## Reviewer Notes

TokenTrace is intentionally local-first. The current ChatGPT app prototype exposes a redacted evidence-pack workflow only. It does not initiate local scans, does not write to the user's machine, does not add telemetry, and does not expose raw message bodies through the normal app path.

## Support Copy

Support is available through GitHub issues:

https://github.com/abhiyoheswaran1/tokentrace/issues

## Public Links

- Website: https://www.baseframelabs.com/apps/tokentrace
- Source: https://github.com/abhiyoheswaran1/tokentrace
- Support: https://github.com/abhiyoheswaran1/tokentrace/issues
- Privacy policy: https://www.baseframelabs.com/privacy
- Terms: https://www.baseframelabs.com/terms
