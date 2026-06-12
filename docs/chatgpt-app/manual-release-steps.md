# Manual ChatGPT App Release Steps

These are the steps that cannot be completed by repo automation. Use your personal OpenAI account if you want TokenTrace published outside the work account used for this Codex session.

## 1. Prepare The Hosted Endpoint

1. Deploy the TokenTrace ChatGPT app MCP server to a public HTTPS domain.
2. Confirm the endpoint path ends in `/mcp`.
3. Run:

   ```bash
   npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
   ```

4. Keep the output as readiness evidence for review feedback if needed.

Do not submit a local, ngrok-only, localhost, or placeholder URL for public review.

## 2. Sign In With The Publishing Account

1. Open the OpenAI Platform Dashboard in a browser where you are signed into your personal OpenAI account.
2. Confirm the account shown in the Dashboard is the personal account, not the work account.
3. Select or create the OpenAI Platform organization that should own the ChatGPT app.

The Codex session account does not need to match this account. The repo only uses the hosted MCP URL.

## 3. Complete Verification And Permissions

1. In the OpenAI Platform Dashboard, complete individual verification if publishing under your own name.
2. Complete organization verification if publishing under a business name.
3. Confirm the selected organization has app-management permissions.
4. Use an Owner role or an account with `api.apps.write` to create drafts and submit for review.
5. Use `api.apps.read` to view drafts and review status.

## 4. Create Or Update The App Draft

1. Go to the Apps or app submission area in the OpenAI Platform Dashboard.
2. Create a new app draft for TokenTrace, or open the existing TokenTrace draft.
3. Add the MCP server details:
   - MCP Server URL: `https://YOUR_HOSTED_DOMAIN/mcp`
   - Authentication: none for the current read-only prototype unless you intentionally add OAuth later.
   - Template MCP URL: leave blank unless the hosted endpoint uses workspace-specific tenant URLs.
4. Refresh or scan metadata.
5. Confirm the tool list includes `get_redacted_evidence_pack`.

## 5. Fill The Submission Form

Use `dashboard-fields.json` and `submission-copy.md` for paste-ready content.

Required fields commonly include:

1. App name.
2. Logo or icon.
3. Description.
4. Company or publisher name.
5. Privacy policy URL.
6. Terms or support URL.
7. MCP and tool information.
8. Screenshots.
9. Test prompts and expected responses.
10. Localization information, if requested.

## 6. Test In ChatGPT Developer Mode

1. In ChatGPT, open Settings -> Apps & Connectors -> Advanced settings.
2. Enable developer mode if the selected organization allows it.
3. Create a connector.
4. Enter:
   - Connector name: `TokenTrace`
   - Connector URL: `https://YOUR_HOSTED_DOMAIN/mcp`
   - Description: use the short description from `submission-copy.md`.
5. Click Create.
6. Verify ChatGPT shows `get_redacted_evidence_pack`.
7. Run the prompts in `test-prompts-and-responses.md`.
8. Capture the screenshots listed in `screenshot-checklist.md`.

## 7. Submit For Review

1. Re-check that you are still in the personal OpenAI account and intended publishing organization.
2. Confirm the hosted MCP URL is not local or a test-only tunnel.
3. Confirm the privacy policy and support URLs are public.
4. Check all confirmation boxes.
5. Click Submit for review.
6. Save the confirmation email and Case ID.

## 8. Respond To Review Feedback

1. Read the feedback and identify whether the issue is app metadata, policy, MCP connectivity, tool behavior, screenshots, or privacy copy.
2. Use `review-response-template.md` to draft the response.
3. Apply any required code or doc fixes.
4. Re-run:

   ```bash
   npm run release:chatgpt:check -- --mcp-url https://YOUR_HOSTED_DOMAIN/mcp
   ```

5. Resubmit the corrected app version or reply to the review email with the Case ID.

## 9. Publish After Approval

1. Wait for OpenAI's approval email.
2. Open the app draft in the OpenAI Platform Dashboard.
3. Review the approved version one final time.
4. Click Publish.
5. Save the public listing URL.
6. Add the listing URL to the next TokenTrace changelog or website update.

## 10. Post-Publish Checks

1. Open the public listing URL while signed out or from a clean browser profile.
2. Install or connect the app from ChatGPT.
3. Run the prompts in `test-prompts-and-responses.md`.
4. Confirm the tool returns redacted evidence only.
5. Confirm no raw prompts, completions, or message bodies appear in normal app output.
