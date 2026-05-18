# Agent Discovery Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only machine-readable TokenTrace discovery command for coding agents.

**Architecture:** Put the manifest builder in `src/lib/agent-discovery.ts`, expose it through `scripts/agent.ts`, and route `tokentrace agent --json` plus `tokentrace capabilities --json` from `bin/tokentrace.js`. Documentation and Guide updates explain the same surface without changing release state.

**Tech Stack:** Node CLI wrapper, TypeScript runtime scripts, Vitest, React server render tests.

---

### Task 1: Manifest And CLI Tests

**Files:**
- Create: `tests/agent-discovery.test.ts`
- Modify: `tests/statusline-cli.test.ts`

- [x] **Step 1: Write failing tests**

Add a manifest unit test that imports `buildAgentDiscoveryManifest()` and asserts schema version, command IDs, local-first privacy, Claude/Codex integrations, and guardrails. Add a CLI safety test that runs `node bin/tokentrace.js agent --json` with `TOKENTRACE_HOME` pointing at a file and expects valid JSON.

- [x] **Step 2: Run focused tests to verify failure**

Run:

```bash
npm test -- tests/agent-discovery.test.ts tests/statusline-cli.test.ts
```

Expected before implementation: fail because `src/lib/agent-discovery.ts` does not exist and the CLI command is unknown.

### Task 2: Manifest And CLI Implementation

**Files:**
- Create: `src/lib/agent-discovery.ts`
- Create: `scripts/agent.ts`
- Modify: `scripts/build-cli-runtime.mjs`
- Modify: `bin/tokentrace.js`
- Modify: `scripts/smoke-cli.mjs`

- [x] **Step 1: Implement manifest builder**

Create a typed manifest with stable command arrays, workflows, integrations, privacy notes, and guardrails.

- [x] **Step 2: Implement script parser**

Accept only `--json`, `--help`, and `-h`. Print JSON for `--json`; print usage otherwise.

- [x] **Step 3: Route CLI aliases**

Add `agent` and `capabilities` to the CLI help and dispatch. Do not call database initialization before running the discovery script.

- [x] **Step 4: Add runtime and smoke coverage**

Add `agent` to the runtime bundle map and smoke-check `tokentrace agent --json`.

### Task 3: Documentation And Guide

**Files:**
- Modify: `README.md`
- Modify: `app/guide/page.tsx`
- Modify: `tests/guide-page.test.tsx`
- Modify: `docs/ROADMAP-0.10.0.md`
- Modify: `CHANGELOG.md`

- [x] **Step 1: Document agent discovery**

Add concise README and Guide instructions that tell agents to start with `tokentrace agent --json`.

- [x] **Step 2: Update roadmap and changelog**

Record this under the 0.10.0 development line and `Unreleased`.

### Task 4: Verification

**Files:**
- No source changes expected.

- [x] **Step 1: Run focused tests**

```bash
npm test -- tests/agent-discovery.test.ts tests/statusline-cli.test.ts tests/guide-page.test.tsx
```

- [x] **Step 2: Run full gates**

```bash
npm run verify
npm run build
npm run projscan:doctor
```

- [x] **Step 3: Confirm release boundary**

Check `package.json` version remains `0.9.0`; do not bump, tag, publish, or release.

### Task 5: Package-Level Agent Discovery

**Files:**
- Create: `TOKENTRACE_AGENT.md`
- Create: `llms.txt`
- Create: `docs/agent-discovery.schema.json`
- Modify: `src/lib/agent-discovery.ts`
- Modify: `tests/agent-discovery.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `app/guide/page.tsx`
- Modify: `tests/guide-page.test.tsx`

- [x] **Step 1: Write failing tests**

Add tests requiring structured follow-up command arrays, the published schema file, package-level agent docs, and package inclusion.

- [x] **Step 2: Verify tests fail**

Run:

```bash
npm test -- tests/agent-discovery.test.ts
```

Expected before implementation: fail because follow-ups are shell strings and the schema/docs do not exist.

- [x] **Step 3: Implement package-level discovery**

Add schema-aligned manifest follow-ups, `TOKENTRACE_AGENT.md`, `llms.txt`, and npm package inclusion.

- [x] **Step 4: Verify the full 0.10 slice again**

Run focused tests, full verify, build, CLI smoke, package inspection, and ProjScan doctor.
