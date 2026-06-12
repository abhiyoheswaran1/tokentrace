# Screenshot Checklist

OpenAI may request screenshots and test prompts during submission. Capture these from the personal OpenAI account and intended publishing organization.

Save final screenshots in this folder only if they do not include private account, email, workspace, or usage data.

## Required Captures

1. ChatGPT connector creation screen with:
   - connector name `TokenTrace`;
   - connector URL ending in `/mcp`;
   - description visible.
2. ChatGPT connector tool list showing:
   - `get_redacted_evidence_pack`;
   - read-only app behavior, if visible.
3. ChatGPT conversation using prompt:
   - `Use TokenTrace to show my redacted evidence pack for processed tokens.`
4. Tool result or widget view showing:
   - evidence-pack summary;
   - no raw prompts or message bodies;
   - redaction language.
5. Mobile ChatGPT view, if requested:
   - connector selected;
   - response readable on a narrow viewport.

## File Naming

Use these names for final local screenshot files:

```text
screenshots/01-connector-create.png
screenshots/02-tool-list.png
screenshots/03-processed-tokens-prompt.png
screenshots/04-redacted-widget.png
screenshots/05-mobile-view.png
```

## Redaction Rules

Before using a screenshot in submission:

- hide personal email addresses;
- hide organization IDs;
- hide private file paths if not needed;
- hide raw prompts, completions, message bodies, and customer data;
- keep the tool name and redaction proof visible.
