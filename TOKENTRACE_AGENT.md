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

If the local dashboard is already running, the same manifest is available from:

```bash
curl http://127.0.0.1:3030/api/agent
curl http://127.0.0.1:3030/api/capabilities
```

## Roadmap Status

Inspect the current 0.12.0 Local Sources & Trust handoff, action recipes, and release blockers:

```bash
tokentrace roadmap --json
curl http://127.0.0.1:3030/api/roadmap
```

## Safe Automation Loop

1. Discover capabilities:

   ```bash
   tokentrace agent --json
   ```

2. Refresh local data when the human expects current usage:

   ```bash
   tokentrace scan --json
   ```

3. Check trust before making claims:

   ```bash
   tokentrace doctor --json
   ```

4. Explain totals with evidence:

   ```bash
   tokentrace evidence --json
   ```

## Guardrails

- Do not run `tokentrace reset` unless the human explicitly asks to clear imported local data.
- Do not call processed tokens current context size. Use `ctx` for live context-window pressure.
- Treat database paths, source file paths, prompts, and raw transcript settings as local sensitive data.
- Discovery is read-only: it does not scan files, initialize the dashboard database, start a server, or make a network request.

## Integrations

Claude Code status line:

```bash
tokentrace statusline setup claude
```

Codex fallback while native status-line hooks remain unstable:

```bash
tokentrace watch --session --compact
```
