# TokenTrace ChatGPT App Submission Kit

This folder contains the material needed for the manual OpenAI Platform Dashboard release step.

For developer-mode testing, use a temporary HTTPS tunnel to the local MCP server.
For public app review, use a stable hosted HTTPS MCP endpoint.

## Which URL To Paste

The ChatGPT app form cannot use `http://127.0.0.1:8787/mcp` directly because
ChatGPT has to connect to the server from outside your machine.

For a developer-mode test, start TokenTrace locally:

```bash
tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1
```

Then expose that local port with a tunnel such as ngrok:

```bash
ngrok http 8787
```

Paste the tunnel URL with `/mcp` appended:

```text
https://YOUR_TUNNEL_SUBDOMAIN.ngrok.app/mcp
```

For a public ChatGPT app submission, do not use localhost, an ngrok-only URL, or
a placeholder. Deploy the MCP server behind a stable HTTPS domain and paste:

```text
https://YOUR_HOSTED_DOMAIN/mcp
```

Validate the public endpoint before submission:

```bash
npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
```

## Files

- `manual-release-steps.md` - step-by-step personal-account Dashboard release flow.
- `dashboard-fields.json` - structured, ready-to-paste submission fields.
- `submission-copy.md` - listing copy, short descriptions, and support copy.
- `privacy-and-data.md` - privacy/data handling text for review forms.
- `test-prompts-and-responses.md` - prompts and expected results for reviewer testing.
- `screenshot-checklist.md` - screenshots to capture from ChatGPT developer mode.
- `review-response-template.md` - templates for responding to review feedback.
- `assets/icon.png` - ChatGPT app icon. PNG only, 256 x 256 px, under 10 KB.
- `assets/listing-card.svg` and `assets/widget-preview.svg` - optional supporting visuals that use the existing TokenTrace dashboard visual language.

## Manual Step

The repository does not submit or publish the ChatGPT app. Sign into the OpenAI Platform Dashboard with the intended personal OpenAI account, create or update the app draft, submit it for review, respond to feedback, and publish the approved version from that account.
