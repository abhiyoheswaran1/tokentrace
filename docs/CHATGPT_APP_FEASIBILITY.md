# ChatGPT App Feasibility

## Recommendation

Do not pursue a public ChatGPT app release yet. Build a private developer-mode prototype only if TokenTrace keeps its local-first boundary and avoids uploading raw prompts, local paths, or full usage history.

The safest first experiment is a read-only evidence-pack workflow: the local TokenTrace CLI produces a user-selected, redacted artifact, and the ChatGPT app explains that artifact without scanning the user's machine.

## Can

TokenTrace can technically become a ChatGPT app. OpenAI's Apps SDK is built around an MCP server, tool metadata, and optional embedded UI components. TokenTrace already has MCP-oriented discovery, tool concepts, local reports, and structured evidence surfaces.

The gap is distribution shape. A ChatGPT app connector needs an MCP server that ChatGPT can reach over HTTPS for testing or production. TokenTrace's current value proposition is local scanning against private CLI artifacts on the user's own machine. A hosted public app cannot read those local files unless the user sends data to it or runs a tunnel.

## Could

TokenTrace could support three levels of ChatGPT app work:

1. Private developer-mode prototype: expose a local MCP server through a secure tunnel and test whether ChatGPT can explain selected local reports.
2. Evidence-pack companion: add an explicit `tokentrace evidence` or report export flow that produces redacted JSON for a ChatGPT app to analyze.
3. Public app: host an MCP server and embedded UI that only works from user-provided exports or authenticated storage the user chooses.

The second option fits TokenTrace best. It keeps scanning local, makes user consent explicit, and gives ChatGPT a bounded artifact instead of broad filesystem access.

## Should

Do not ship a public ChatGPT app now. Public distribution requires review, metadata, screenshots, privacy decisions, authentication or storage choices, and a support posture. Those requirements can conflict with the current no-telemetry, no-cloud, local-first promise if the app tries to duplicate the full dashboard online.

Ship order should be:

1. Keep improving the local dashboard and CLI/MCP contract.
2. Define a redacted evidence-pack schema for explicit user handoff.
3. Build a private developer-mode ChatGPT app prototype around that schema.
4. Reassess public distribution only after the prototype proves useful without weakening the privacy model.

## Source Notes

- OpenAI Apps SDK overview: https://developers.openai.com/apps-sdk
- Build your MCP server: https://developers.openai.com/apps-sdk/build/mcp-server
- Build your ChatGPT UI: https://developers.openai.com/apps-sdk/build/chatgpt-ui
- Connect from ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- Submit and maintain your app: https://developers.openai.com/apps-sdk/deploy/submission
- App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines
- Security and privacy: https://developers.openai.com/apps-sdk/guides/security-privacy
