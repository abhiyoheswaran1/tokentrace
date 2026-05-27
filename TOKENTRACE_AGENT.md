# TokenTrace Agent Guide

TokenTrace is a local-first CLI and dashboard for AI coding-agent token, cost,
session, parser, and evidence analytics.

## Start Here

Use the read-only discovery manifest before running any other TokenTrace command:

```bash
tokentrace agent --json
```

This alias returns the same manifest:

```bash
tokentrace capabilities --json
```

The manifest follows the schema in `docs/agent-discovery.schema.json`.

MCP-capable clients can use the local stdio server:

```bash
tokentrace mcp
```

MCP registry name:

```text
io.github.abhiyoheswaran1/tokentrace
```

Agents should call `get_agent_guide` first. It returns the recommended workflow,
install snippets, copy-paste `AGENTS.md` guidance, and local-first guardrails.

Verify the MCP entrypoint without scanning files:

```bash
tokentrace mcp selftest --json
```

The MCP server does not scan on startup. Its `run_scan` tool requires
`confirmLocalScan=true` before reading local usage files or writing the local
database.

If the local dashboard is already running, the same manifest is available from:

```bash
curl http://127.0.0.1:3030/api/agent
curl http://127.0.0.1:3030/api/capabilities
```

## Release Status

Inspect the current release handoff, action recipes, and release status:

```bash
tokentrace roadmap --json
curl http://127.0.0.1:3030/api/roadmap
```

## Safe Automation Loop

1. Discover capabilities:

   ```bash
   tokentrace agent --json
   ```

2. In MCP clients, ask for the operating loop:

   ```text
   get_agent_guide
   ```

3. Refresh local data when the human expects current usage:

   ```bash
   tokentrace scan --json
   ```

4. Check trust before making claims:

   ```bash
   tokentrace doctor --json
   ```

5. Explain totals with evidence:

   ```bash
   tokentrace evidence --json
   ```

## Local Intelligence (zero AI tokens)

TokenTrace ships deterministic, local-only analytical surfaces that spend
no AI tokens. The agent on the calling side handles any natural-language
parsing; TokenTrace executes pure SQL and statistics.

Spot unusual local usage days via a modified-z-score (MAD) detector:

```bash
tokentrace anomalies --json [--window=N] [--metric=tokens|cost|all]
```

Run a structured aggregation by model, project, tool, session, or day:

```bash
tokentrace query --group-by model --metric cost --range 7d --json
tokentrace query --group-by day --metric totalTokens --from 2026-05-01 --to 2026-05-15 --json
```

Get deterministic classification suggestions for the unknown-cost queue:

```bash
tokentrace repair auto-classify --json [--min-confidence=N]
```

The matching MCP tools are `get_anomalies`, `query_usage`, and
`get_classifications`. All three are read-only and require no
`confirmLocalScan` acknowledgement.

## Guardrails

- Do not run `tokentrace reset` unless the human explicitly asks to clear imported local data.
- Do not call processed tokens current context size. Use `ctx` for live context-window pressure.
- Treat database paths, source file paths, prompts, and raw transcript settings as local sensitive data.
- Discovery is read-only: it does not scan files, initialize the dashboard database, start a server, or make a network request.
- MCP startup is read-only; use `run_scan` only when the human expects a local scan.

## Integrations

Claude Code status line:

```bash
tokentrace statusline setup claude
```

Codex fallback while native status-line hooks remain unstable:

```bash
tokentrace watch --session --compact
```
