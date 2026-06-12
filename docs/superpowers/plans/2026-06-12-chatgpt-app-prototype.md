# ChatGPT App Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private developer-mode ChatGPT app prototype for redacted TokenTrace evidence packs.

**Architecture:** Keep the prototype additive. Reuse the existing evidence-pack builder, add a focused `src/lib/chatgpt-app` module for Apps SDK tool/resource registration, and expose it through a new `tokentrace chatgpt-app` CLI command. The app remains local-first and read-only.

**Tech Stack:** TypeScript, Node HTTP server, `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, Vitest, existing TokenTrace CLI runtime.

---

## File Structure

- Create: `src/lib/chatgpt-app/prototype.ts` — pure Apps SDK descriptor, widget resource, tool result, and self-test helpers.
- Create: `src/lib/chatgpt-app/server.ts` — local HTTP `/mcp` server using official MCP streamable HTTP transport.
- Create: `scripts/chatgpt-app.ts` — CLI script for serving or self-testing the prototype.
- Modify: `src/lib/evidence-pack.ts` — add a shared metric evidence-pack builder.
- Modify: `app/api/evidence-pack/route.ts` — reuse the shared builder instead of duplicating pack assembly.
- Modify: `src/cli/commands.ts` and `src/cli/help.ts` — route and document `tokentrace chatgpt-app`.
- Modify: `scripts/build-cli-runtime.mjs` — include the new runtime entry.
- Create: `tests/chatgpt-app-prototype.test.ts` — tool, widget, result, and self-test coverage.
- Create: `tests/chatgpt-app-cli.test.ts` — CLI routing coverage.
- Create: `docs/CHATGPT_APP_PROTOTYPE.md` — developer-mode runbook.
- Modify: `CHANGELOG.md` — record the prototype under Unreleased.

## Tasks

### Task 1: Red Tests

- [x] **Step 1: Write failing tests**

Add tests that import `@/src/lib/chatgpt-app/prototype` and assert:

- The tool list includes `get_redacted_evidence_pack`.
- The descriptor has `annotations.readOnlyHint=true`, `openWorldHint=false`, and `destructiveHint=false`.
- The descriptor points `_meta.ui.resourceUri` and `_meta["openai/outputTemplate"]` at `ui://tokentrace/evidence-pack.html`.
- The widget resource uses `text/html;profile=mcp-app`.
- The tool result returns `structuredContent.pack.schemaVersion === "tokentrace.evidence-pack.v1"`.
- `tokentrace chatgpt-app selftest --json` exits successfully and reports the tool name.

- [x] **Step 2: Run tests and confirm expected failure**

Run:

```bash
npm test -- tests/chatgpt-app-prototype.test.ts tests/chatgpt-app-cli.test.ts
```

Expected: fail because `src/lib/chatgpt-app/prototype.ts` and the `chatgpt-app` CLI command do not exist.

### Task 2: Shared Evidence-Pack Builder

- [x] **Step 1: Implement shared builder**

Move the metric evidence-pack assembly currently inside `app/api/evidence-pack/route.ts` into `buildMetricEvidencePack({ metric })` in `src/lib/evidence-pack.ts`.

- [x] **Step 2: Reuse from API route**

Update `app/api/evidence-pack/route.ts` to call `buildMetricEvidencePack({ metric })` and keep its JSON/Markdown response behavior unchanged.

- [x] **Step 3: Run evidence-pack tests**

Run:

```bash
npm test -- tests/evidence-pack.test.ts tests/evidence-pack-api.test.ts
```

Expected: pass.

### Task 3: ChatGPT App Module

- [x] **Step 1: Add dependencies**

Install the official packages used by the OpenAI Apps SDK quickstart:

```bash
npm install @modelcontextprotocol/sdk @modelcontextprotocol/ext-apps zod
```

- [x] **Step 2: Add prototype helpers**

Create `src/lib/chatgpt-app/prototype.ts` with:

- `CHATGPT_APP_TOOL_NAME = "get_redacted_evidence_pack"`.
- `CHATGPT_APP_WIDGET_URI = "ui://tokentrace/evidence-pack.html"`.
- `createTokenTraceChatGptAppServer()`.
- `chatGptAppWidgetResource()`.
- `buildChatGptEvidencePackToolResult(args)`.
- `runChatGptAppSelfTest()`.

- [x] **Step 3: Run prototype tests**

Run:

```bash
npm test -- tests/chatgpt-app-prototype.test.ts
```

Expected: pass.

### Task 4: Local HTTP Server and CLI

- [x] **Step 1: Add server wrapper**

Create `src/lib/chatgpt-app/server.ts` to listen on a local host/port, handle `GET /`, CORS preflight, and MCP requests at `/mcp`.

- [x] **Step 2: Add CLI script and route**

Create `scripts/chatgpt-app.ts`, add it to `scripts/build-cli-runtime.mjs`, route `tokentrace chatgpt-app` in `src/cli/commands.ts`, and list it in `src/cli/help.ts`.

- [x] **Step 3: Run CLI tests**

Run:

```bash
npm test -- tests/chatgpt-app-cli.test.ts
```

Expected: pass.

### Task 5: Docs and Verification

- [x] **Step 1: Add runbook and changelog**

Add `docs/CHATGPT_APP_PROTOTYPE.md` with local commands, tunnel instructions, developer-mode connector steps, and privacy constraints. Add a `CHANGELOG.md` Unreleased entry.

- [x] **Step 2: Run targeted verification**

Run:

```bash
npm test -- tests/chatgpt-app-prototype.test.ts tests/chatgpt-app-cli.test.ts tests/evidence-pack.test.ts tests/evidence-pack-api.test.ts
tsc --noEmit
npm run lint
npm run projscan:doctor
```

- [x] **Step 3: Smoke the local server**

Run `tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1`, confirm `GET http://127.0.0.1:8787/` returns the health text, and stop the process.
