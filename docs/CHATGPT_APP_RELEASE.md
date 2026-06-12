# ChatGPT App Release

TokenTrace can automate ChatGPT app release readiness, but it does not submit or publish the app. Public distribution still goes through the OpenAI Platform Dashboard review and publish flow.

For the copy, assets, screenshot list, test prompts, and review-response templates used during the manual Dashboard step, use `docs/chatgpt-app/`.

## Account Choice

Use your personal OpenAI account for the ChatGPT app release if you want the app owned outside your work account.

- Log into the OpenAI Platform Dashboard with the personal OpenAI account before creating or submitting the app draft.
- Select or create the intended personal OpenAI Platform organization.
- Complete individual or organization verification from that account or organization.
- Use an Owner role or `api.apps.write` permission to create app drafts and submit them. `api.apps.read` can view drafts and review status.
- Do not commit OpenAI API keys, ChatGPT cookies, session tokens, or account-specific identifiers to this repository.

The Codex session account does not need to be the publishing account. The only value this repo needs for automation is the hosted MCP URL.

## Automated Checks

Local release readiness is included in the standard release gate:

```bash
npm run release:check
```

That command runs `npm run release:chatgpt:check`, which verifies the private ChatGPT app prototype, release docs, and non-publishing checklist.

Before submitting or publishing the ChatGPT app, validate the deployed HTTPS endpoint:

```bash
npm run release:chatgpt:check -- --mcp-url https://example.com/mcp
```

For JSON output:

```bash
npm run release:chatgpt:check -- --mcp-url https://example.com/mcp --json
```

For developer-mode local smoke testing only:

```bash
npm run release:chatgpt:check -- --allow-local --mcp-url http://127.0.0.1:8787/mcp
```

The hosted check validates:

- the URL is a public HTTPS `/mcp` endpoint, unless `--allow-local` is explicitly used;
- the MCP endpoint accepts `initialize`;
- `tools/list` advertises `get_redacted_evidence_pack`;
- the tool is read-only, non-destructive, closed-world, and has Apps SDK widget metadata;
- the widget resource is served as `text/html;profile=mcp-app`;
- the tool call returns `tokentrace.evidence-pack.v1` with `rawContentIncluded: false`.

## CI Setup

The tag-gated npm publish workflow reads an optional GitHub Actions secret:

```text
CHATGPT_APP_MCP_URL=https://your-hosted-domain.example/mcp
```

If the secret is present, the workflow runs:

```bash
npm run release:chatgpt:check -- --mcp-url "$CHATGPT_APP_MCP_URL"
```

If the secret is absent, the normal npm and MCP registry release still proceeds. This is intentional because ChatGPT app submission has a manual Dashboard gate and TokenTrace may not always have a hosted app endpoint ready.

## Manual Dashboard Gate

After the automated checks pass:

1. Sign into the OpenAI Platform Dashboard with the personal OpenAI account.
2. Confirm the selected organization is verified and has the right publishing identity.
3. Create or update the ChatGPT app draft.
4. Set the Connector URL to the hosted HTTPS `/mcp` endpoint.
5. Fill in app name, description, use case, support contact, screenshots, test prompts, privacy policy, and terms metadata.
6. Test in developer mode and confirm the tool list includes `get_redacted_evidence_pack`.
7. Submit the app for review.
8. Publish the approved app from the Dashboard.

This repository automation does not submit or publish the ChatGPT app. It stops at readiness evidence so the final action remains explicit and account-scoped.

## Release Order

Use this order when releasing TokenTrace and the ChatGPT app together:

1. Run the normal TokenTrace release verification.
2. Deploy the hosted ChatGPT app MCP server, if this release changes the app.
3. Run `npm run release:chatgpt:check -- --mcp-url https://example.com/mcp`.
4. Publish the npm package and MCP registry entry through the existing release flow.
5. Submit or publish the ChatGPT app from the OpenAI Platform Dashboard using the personal OpenAI account.

## References

- OpenAI Apps SDK submission guide: https://developers.openai.com/apps-sdk/deploy/submission
- OpenAI Apps SDK connect-from-ChatGPT guide: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- OpenAI app submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines
