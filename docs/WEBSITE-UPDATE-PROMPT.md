# TokenTrace Website Update Prompt

Use this to update `https://www.abhiyoheswaran.com/apps/tokentrace` so the website matches the current app and README.

## Positioning

TokenTrace is local-first AI CLI usage analytics for developers using Claude Code, Codex, OpenAI, and other local AI CLI tools.

Primary message:

> Local-first AI CLI usage analytics.

Supporting copy:

> TokenTrace scans local AI CLI artifacts, normalizes token usage, estimates missing counts when necessary, and shows cost, model, project, session, parser, and repair evidence in a local dashboard. No cloud account, no telemetry, no proxying.

## Screenshots

Use the refreshed screenshots from this repo:

- `docs/assets/overview-0.10.0.png`
- `docs/assets/evidence-0.10.0.png`
- `docs/assets/repair-0.10.0.png`
- `docs/assets/scan-health-0.10.0.png`

## Sections

1. Hero: TokenTrace, local-first AI CLI usage analytics, `npx tokentrace`.
2. Evidence-first overview: pulse, token accounting, model rates, and trend charts.
3. Scan Health: explain files checked, parser warnings, ignored support files, and cost coverage.
4. Repair workflow: Problem, Evidence, Fix, Recalculate, Verified.
5. Agent-ready entry points: `tokentrace agent --json`, `tokentrace capabilities --json`, `/api/agent`.
6. Privacy: local files stay local; model-rate refresh fetches public rate data only.

## Copy Rules

- Use `Model Rates`, not `Pricing`.
- Use `Scan Health`, not health check or scan doctor.
- Use `Parsers`, not Parser Debug.
- Use `Insights`, not Usage Intelligence.
- Mention that processed tokens are cumulative processed usage, not current context size.
