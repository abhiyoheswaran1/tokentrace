# Stabilization And Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate TokenTrace as a mature product by dogfooding, checking fresh installs, testing MCP compatibility, updating website handoff material, and fixing only concrete blockers.

**Architecture:** Keep the pass evidence-driven. Add small docs/checklist artifacts under `docs/stabilization/`, use existing smoke scripts and CLI commands for verification, and add targeted tests only if a blocker appears. Avoid new feature surfaces unless they directly remove a stabilization blocker.

**Tech Stack:** Existing Node CLI, Next.js dashboard, Vitest, Playwright browser guard, npm pack/install smoke, ProjScan, MCP stdio server, optional official MCP SDK client smoke.

---

### Task 1: Evidence Workspace

**Files:**
- Create: `docs/stabilization/2026-05-21-adoption-hardening.md`

- [ ] Create a stabilization checklist with sections for dogfood, fresh install, MCP client, website, friction, and verification.
- [ ] Record every command run with pass/fail status and action taken.

### Task 2: Dogfood Current Product

**Files:**
- Modify only if a reproduced blocker appears.

- [ ] Run local CLI discovery commands: `tokentrace agent --json`, `tokentrace capabilities --json`, `tokentrace mcp selftest --json`.
- [ ] Run data workflows on fixture or isolated home: `tokentrace scan fixtures/generic-jsonl --json`, `tokentrace doctor --json`, `tokentrace evidence --json`, `tokentrace repair --json`, `tokentrace report --markdown`.
- [ ] Run dashboard guardrails: keep `http://localhost:3000` live and run `npm run browser:guard`.

### Task 3: Fresh Install And Package Runtime

**Files:**
- Modify only if a reproduced blocker appears.

- [ ] Run `npm pack --ignore-scripts`.
- [ ] Install the tarball into a temporary prefix when sandbox/network allows.
- [ ] Verify `tokentrace --version`, `tokentrace --help`, `tokentrace agent --json`, `tokentrace mcp selftest --json`, and packed payload inspection.

### Task 4: Real MCP Client Compatibility

**Files:**
- Create or modify test/smoke files only if compatibility fails or the check is worth keeping.

- [ ] Prefer the official `@modelcontextprotocol/sdk` client if available or installable.
- [ ] Start TokenTrace over stdio as a client process.
- [ ] Verify `initialize`, `tools/list`, `get_agent_guide`, and `run_scan` refusal behavior through client APIs rather than raw line-delimited JSON.

### Task 5: Website And Friction Notes

**Files:**
- Modify: `docs/WEBSITE-UPDATE-PROMPT.md` only if the handoff misses current product copy.
- Modify: `docs/stabilization/2026-05-21-adoption-hardening.md`

- [ ] Check the live website or record why it cannot be updated from this repo.
- [ ] Record the exact website copy delta for the maintainer or website deploy path.
- [ ] Record user-friction observations and classify each as blocker, follow-up, or no action.

### Task 6: Final Verification

**Files:**
- No new files unless a blocker fix required tests/docs.

- [ ] Run targeted tests changed by this pass.
- [ ] Run `npm run release:check`.
- [ ] Run `npm run browser:guard`.
- [ ] Run `tokentrace mcp selftest --json`.
- [ ] Confirm `git status --short`.
