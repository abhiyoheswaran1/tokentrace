# Agent Preflight Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local agent preflight report and simplify TokenTrace's primary workflow without losing diagnostic depth.

**Architecture:** Implement a pure `buildPreflightReport` composer with a snapshot adapter that reuses analytics, doctor, anomalies, and recommendations. Wire it through CLI, MCP, agent discovery, and documentation, then adjust the dashboard shell copy and overview first-run data path.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, SQLite via existing helpers, MCP stdio server, ProjScan.

---

## File Map

- Create `src/lib/preflight.ts`: pure preflight decision/report builder plus async snapshot adapter.
- Create `scripts/preflight.ts`: JSON/text CLI renderer using existing JSON-report argument style.
- Modify `src/cli/commands.ts`: route `tokentrace preflight`.
- Modify `src/lib/mcp/tools.ts` and `src/lib/mcp-server.ts`: expose `get_preflight`.
- Modify `src/lib/agent-discovery.ts`, `TOKENTRACE_AGENT.md`, `llms.txt`, and `docs/agent-adoption.md`: publish the command/tool contract.
- Modify `src/lib/overview-data.ts`: include latest scan details in primary first-run status.
- Modify `components/sidebar.tsx`, `app/page.tsx`, and guide content: simplify dashboard language to Today and Fix Data.
- Modify `README.md` and `CHANGELOG.md`: document user-facing changes under Unreleased.
- Add/update focused tests under `tests/`.

## Task 1: Preflight Report Core

**Files:**
- Create: `src/lib/preflight.ts`
- Test: `tests/preflight.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildPreflightReport } from "@/src/lib/preflight";

describe("preflight report", () => {
  it("blocks when no successful local scan exists", () => {
    const report = buildPreflightReport({
      now: new Date("2026-06-26T00:00:00.000Z"),
      doctor: {
        status: "warning",
        headline: "No local scan has run",
        latestScan: { id: null, filesScanned: 0, recordsImported: 0 },
        scanFreshness: { state: "missing", description: "No local scan has run yet." },
        pricing: { unknown: 0, interactions: 0 },
        parserCoverage: { parserReviewFiles: 0, failureFiles: 0 },
        recommendations: []
      },
      summary: { interactions: 0, totalTokens: 0, totalCost: 0, unknownCostInteractions: 0 },
      dataConfidence: { score: 0, grade: "unknown", label: "Unknown" },
      guardrails: {
        monthLabel: "June 2026",
        cost: { configured: false, status: "unset", used: 0, limit: 0, percent: 0, remaining: 0 },
        tokens: { configured: false, status: "unset", used: 0, limit: 0, percent: 0, remaining: 0 }
      },
      anomalies: { anomalies: [], summary: { total: 0 } },
      recommendations: []
    });

    expect(report.decision).toBe("blocked");
    expect(report.nextActions[0].command).toEqual(["tokentrace", "scan", "--json"]);
  });

  it("warns when cost confidence is incomplete", () => {
    const report = buildPreflightReport({
      now: new Date("2026-06-26T00:00:00.000Z"),
      doctor: {
        status: "warning",
        headline: "Usage imported with cost repairs",
        latestScan: { id: "scan-1", filesScanned: 4, recordsImported: 10 },
        scanFreshness: { state: "fresh", description: "Recent scan history includes a successful import." },
        pricing: { unknown: 3, interactions: 10 },
        parserCoverage: { parserReviewFiles: 0, failureFiles: 0 },
        recommendations: []
      },
      summary: { interactions: 10, totalTokens: 120000, totalCost: 4.2, unknownCostInteractions: 3 },
      dataConfidence: { score: 0.72, grade: "medium", label: "Medium" },
      guardrails: {
        monthLabel: "June 2026",
        cost: { configured: false, status: "unset", used: 4.2, limit: 0, percent: 0, remaining: 0 },
        tokens: { configured: false, status: "unset", used: 120000, limit: 0, percent: 0, remaining: 0 }
      },
      anomalies: { anomalies: [], summary: { total: 0 } },
      recommendations: []
    });

    expect(report.decision).toBe("caution");
    expect(report.findings.map((finding) => finding.id)).toContain("unknown-cost");
  });
});
```

- [ ] **Step 2: Run red test**

Run: `npm test -- tests/preflight.test.ts`

Expected: FAIL because `src/lib/preflight.ts` does not exist.

- [ ] **Step 3: Implement minimal report builder**

Implement typed inputs, decision ranking, findings, next actions, and privacy notes in `src/lib/preflight.ts`.

- [ ] **Step 4: Run green test**

Run: `npm test -- tests/preflight.test.ts`

Expected: PASS.

## Task 2: CLI, MCP, And Discovery Wiring

**Files:**
- Create: `scripts/preflight.ts`
- Modify: `src/cli/commands.ts`
- Modify: `src/lib/mcp/tools.ts`
- Modify: `src/lib/mcp-server.ts`
- Modify: `src/lib/agent-discovery.ts`
- Test: `tests/agent-discovery.test.ts`
- Test: `tests/mcp-server.test.ts`

- [ ] **Step 1: Add failing contract tests**

Update agent discovery tests to require `preflight`. Update MCP tools-list expected names to include `get_preflight`, and add one MCP call test that expects an enveloped preflight result with `decision`.

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/agent-discovery.test.ts tests/mcp-server.test.ts`

Expected: FAIL because the command/tool is missing.

- [ ] **Step 3: Implement wiring**

Add the CLI script, command route, MCP tool schema and handler, and agent discovery command/workflow entries.

- [ ] **Step 4: Run green tests**

Run: `npm test -- tests/agent-discovery.test.ts tests/mcp-server.test.ts`

Expected: PASS.

## Task 3: Overview Bug And Navigation Simplification

**Files:**
- Modify: `src/lib/overview-data.ts`
- Modify: `components/sidebar.tsx`
- Modify: `app/page.tsx`
- Modify: `app/guide/guide-content.ts`
- Test: `tests/overview-first-run.test.ts`

- [ ] **Step 1: Write failing overview test**

Add a pure test around `buildFirstRunStatus` usage or exported helper so the latest scan with zero records yields "Latest scan imported no usage" rather than "Run the first local scan".

- [ ] **Step 2: Run red test**

Run: `npm test -- tests/overview-first-run.test.ts`

Expected: FAIL because the primary overview path still drops latest scan context.

- [ ] **Step 3: Fix overview data path and shell labels**

Pass latest scan information into primary first-run status. Rename Overview-facing shell label to Today and Repair-facing shell label to Fix Data while preserving routes.

- [ ] **Step 4: Run green test**

Run: `npm test -- tests/overview-first-run.test.ts tests/typography.test.tsx`

Expected: PASS.

## Task 4: Docs, Performance, And Bug Pass

**Files:**
- Modify: `README.md`
- Modify: `TOKENTRACE_AGENT.md`
- Modify: `llms.txt`
- Modify: `docs/agent-adoption.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Document the simplified workflow**

Add `tokentrace preflight --json` to command lists, agent guidance, and local intelligence docs. Record the user-facing change in `CHANGELOG.md` under Unreleased.

- [ ] **Step 2: Run focused checks**

Run: `npm test -- tests/preflight.test.ts tests/agent-discovery.test.ts tests/mcp-server.test.ts`

Expected: PASS.

- [ ] **Step 3: Run full gates**

Run:

```bash
npm run verify
npm run build
npm run projscan:doctor
```

Expected: all exit 0.

## Self-Review

- Spec coverage: preflight, simplified navigation, overview bug, docs, and verification are represented.
- Placeholder scan: no TBD/TODO/later placeholders.
- Type consistency: `preflight`, `get_preflight`, and `decision` names are used consistently.
