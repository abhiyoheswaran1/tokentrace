# Agent Adoption MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TokenTrace's MCP registry listing useful to agents by adding guidance, response metadata, self-test, and adoption docs.

**Architecture:** Keep MCP behavior in `src/lib/mcp-server.ts`, with a small response envelope helper and an in-process self-test function. Wire `tokentrace mcp selftest --json` through existing CLI runtime. Keep docs separate in `docs/agent-adoption.md` and link it from existing agent-facing files.

**Tech Stack:** TypeScript MCP handler, Node CLI wrapper, Vitest, Markdown docs, existing npm package trust scripts.

**Status:** Completed and shipped in TokenTrace 0.14.2.

---

### Task 1: MCP Guide and Response Contract

**Files:**
- Modify: `src/lib/mcp-server.ts`
- Modify: `tests/mcp-server.test.ts`

- [x] Write failing tests that require `get_agent_guide`, response envelopes, and explicit scan-confirmation metadata.
- [x] Run `npx vitest run tests/mcp-server.test.ts` and confirm failure for missing tool/metadata.
- [x] Add `get_agent_guide`, `toolEnvelope()`, and envelope metadata around current command payloads.
- [x] Run `npx vitest run tests/mcp-server.test.ts` and confirm pass.

### Task 2: CLI MCP Self-Test

**Files:**
- Modify: `src/lib/mcp-server.ts`
- Modify: `src/cli/commands.js`
- Modify: `src/cli/help.js`
- Modify: `tests/mcp-server.test.ts`

- [x] Write failing tests for `tokentrace mcp selftest --json`.
- [x] Run the MCP test and confirm failure because the subcommand is not implemented.
- [x] Implement `runMcpSelfTest()` in-process and route `mcp selftest --json` through the CLI.
- [x] Run the MCP test and confirm pass.

### Task 3: Agent Adoption Documentation

**Files:**
- Create: `docs/agent-adoption.md`
- Modify: `README.md`
- Modify: `TOKENTRACE_AGENT.md`
- Modify: `llms.txt`
- Modify: `docs/WEBSITE-UPDATE-PROMPT.md`
- Modify: `package.json`
- Modify: `scripts/package-inspect.mjs`
- Modify: `scripts/smoke-packed-install.mjs`
- Modify: `tests/agent-discovery.test.ts`
- Modify: `tests/package-trust.test.ts`

- [x] Write failing tests that require the adoption doc in package files and agent docs.
- [x] Run targeted docs/package tests and confirm failure.
- [x] Add the adoption doc, link it from existing docs, include it in package files, and extend package inspection.
- [x] Run targeted docs/package tests and confirm pass.

### Task 4: Verification

**Files:**
- No new files.

- [x] Run `npx vitest run tests/mcp-server.test.ts tests/agent-discovery.test.ts tests/package-trust.test.ts`.
- [x] Run `npm run smoke:cli`.
- [x] Run `npm run package:inspect`.
- [x] Run `npm run projscan:doctor`.
- [x] If the dev server is active or docs links affect dashboard rendering, run `npm run browser:guard`.
