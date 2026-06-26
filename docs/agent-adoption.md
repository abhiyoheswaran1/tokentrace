# Use TokenTrace With Agents

TokenTrace gives coding agents local evidence for AI CLI token, cost, model,
session, parser, and repair questions. The goal is not to make agents guess from
terminal history. The goal is to make them check local TokenTrace data first,
then report with confidence labels and evidence.

## MCP Install

MCP registry name:

```text
io.github.abhiyoheswaran1/tokentrace
```

Local stdio command:

```bash
npx tokentrace mcp
```

Installed command:

```bash
tokentrace mcp
```

Self-test the local MCP entrypoint without scanning files:

```bash
tokentrace mcp selftest --json
```

## Recommended MCP Loop

1. Call `get_agent_guide` to read the current operating loop and guardrails.
2. Call `get_capabilities` to inspect the local-first command contract.
3. Call `get_preflight` before another long or expensive agent run.
4. Call `get_status` to check the current local usage snapshot.
5. Call `run_doctor` before making data-quality, parser-trust, or cost-confidence claims.
6. Call `get_evidence` before reporting token, cost, model, or session numbers.
7. Call `get_repair_queue` when costs are unknown or model-rate coverage is incomplete.
8. Call `get_report` when the human needs a handoff summary.
9. Call `run_scan` only when the human expects a local filesystem scan, and pass `confirmLocalScan=true`.

## AGENTS.md Copy Block

```md
Before reporting AI token, cost, model, or session usage, use TokenTrace through MCP.
Start with get_agent_guide, get_preflight, get_status, and run_doctor.
Use get_evidence before making numeric usage or cost claims.
Use get_repair_queue when costs are unknown or model-rate coverage is incomplete.
Only call run_scan when the human expects a local filesystem scan, and pass confirmLocalScan=true.
Never request raw prompts or message bodies through normal TokenTrace workflows.
```

## Recipes

### Check Usage Health

Use this when the human asks whether local usage data is trustworthy.

1. `get_preflight`
2. `get_status`
3. `run_doctor`
4. `get_evidence`

Report scan freshness, parser trust, source coverage, unknown-cost count, and
any next repair action. Do not overstate totals when Scan Health reports gaps.

### Preflight The Next Agent Run

Use this before starting another long coding-agent session.

1. `get_preflight`
2. Follow its top `nextActions`
3. Use `run_scan` only if the human expects a local refresh

Report the decision as proceed, caution, or blocked. Include the top finding and
whether any action reads local files or writes the local database.

### Explain A Token Or Cost Spike

Use this when the human asks why usage changed.

1. `run_doctor`
2. `get_evidence`
3. `get_report`

Ground the answer in evidence totals, top sessions or projects when available,
and confidence labels. If costs are unknown, explain what is blocked before
estimating.

### Repair Unknown Cost

Use this when costs are missing or model rates are incomplete.

1. `run_doctor`
2. `get_repair_queue`
3. `get_evidence` with the unknown-cost metric when needed

Report the top cause, next best repair, and what should change after the repair.
Do not invent prices or model aliases.

### Refresh Local Data

Use this only when the human expects a local scan.

1. Ask for or confirm local scan intent.
2. `run_scan` with `confirmLocalScan=true`.
3. `run_doctor`
4. `get_report`

`run_scan` reads local usage files and writes the local TokenTrace database.
MCP startup itself does not scan.

### Evidence-Backed Cost Report

Use this when the human asks for costs, budget, or totals.

1. `run_doctor`
2. `get_evidence`
3. `get_repair_queue` if unknown costs exist
4. `get_report`

State whether values are exact, estimated, unknown, cached, or non-cache where
that distinction matters.

## Guardrails

- TokenTrace is local-first: no telemetry, cloud sync, proxying, packet capture,
  browser-extension scraping, or raw prompt upload.
- The MCP server starts over stdio and stays local to the user's machine.
- MCP startup is read-only.
- `get_preflight` is read-only and does not scan files.
- `run_scan` requires `confirmLocalScan=true`.
- Use `get_evidence` before reporting numeric claims.
- Do not describe processed tokens as current context size. Use `ctx` for live
  context-window pressure.
