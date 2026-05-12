# TokenTrace 0.9.0 Roadmap

0.9.0 is the Daily Operating Loop release.

The release should make TokenTrace useful before, during, and after AI CLI
work. 0.7.0 introduced local usage intelligence. 0.8.0 should make evidence and
repair stronger. 0.9.0 should turn that foundation into a steady daily workflow
without adding cloud accounts or unsupported ingestion scope.

## Product Thesis

TokenTrace should become the local ritual around AI CLI work:

- before work: check guardrails, stale scans, unknown costs, and saved views;
- during work: keep a concise Claude Code status line or terminal watch view;
- after work: inspect session timeline, digest, report, and repair queue.

The product should feel like a precise local ledger, not a monitoring cloud or
generic analytics dashboard.

## Release Principles

- Make repeated daily workflows faster, not broader.
- Prefer saved local views, reports, and session timelines over more charts.
- Keep CLI output scriptable and dashboard output evidence-backed.
- Keep Claude Code live status first-class.
- Treat Codex native sticky integration as out of scope unless the official CLI
  exposes a stable contract.
- Preserve the CLI-only product boundary.

## Release Rules

- No public tag, GitHub Release, npm publish, or version bump until the
  maintainer explicitly asks for release.
- GitHub Release notes must include the complete changelog section for the
  released version.
- Work may land incrementally on `main`, but npm release waits for the explicit
  release request.

## 0.9.0 Cards

### TT-090-01 Session Timeline

**Outcome:** A user can inspect one session as a sequence of usage events
without storing or exposing raw prompts by default.

- Add a session detail/timeline view for interactions, model changes, token
  spikes, cache read/write behavior, cost spikes, parser confidence, and tool
  calls.
- Keep raw content hidden by default and respect the existing raw-content
  setting.
- Link from Sessions, Review Queue, Evidence Trail, and Claude status-line
  repair hints.
- Start with a dense timeline/table hybrid rather than a complex visualization.

### TT-090-02 Saved Local Views

**Outcome:** Users can save useful filters locally and return to them quickly.

- Add local saved views for high-value filters: unknown cost, high-cost
  sessions, Claude this month, Codex this month, estimated tokens, guardrail
  review, and parser review.
- Store saved views locally in SQLite.
- Show saved views in page-level toolbars on Sessions and Usage Intelligence
  without adding account concepts.
- Support a small set of built-in views and user-created views.

### TT-090-03 Digest And Markdown Reports

**Outcome:** TokenTrace can create a concise local report for daily notes,
issues, or release review.

- Extend `tokentrace digest` with `--since last-scan`, `--since yesterday`, and
  `--since YYYY-MM-DD`.
- Add `tokentrace report --markdown` for local markdown summaries.
- Include guardrails, top sessions, unknown costs, parser warnings, project
  signals, and next actions.
- Keep report generation local and deterministic.

### TT-090-04 Claude Status Line V2

**Outcome:** Live Claude Code usage is more useful without becoming noisy.

- Improve compact and wide formatting for model, token, cost, cache, stale scan,
  and unknown pricing states.
- Add concise repair hints when pricing or scan freshness needs attention.
- Keep the command stdin-compatible with Claude Code `statusLine`.
- Add tests with realistic statusLine stdin JSON and transcript metadata.

### TT-090-05 Post-Session Review Loop

**Outcome:** After a CLI session, users can see what changed and whether action
is needed.

- Add a post-session review entry point from digest, watch mode, and the
  dashboard.
- Summarize newly imported sessions, guardrail movement, unknown costs,
  expensive sessions, and parser warnings since the last scan.
- Keep this as local deterministic analysis, not an AI-generated summary.

### TT-090-06 Visual QA And Release Hardening

**Outcome:** Daily workflow features remain calm, compact, and reliable.

- Verify Overview, Usage Intelligence, Sessions, session timeline, saved views,
  Doctor, Settings, Pricing, and mobile Overview.
- Run CLI smoke for digest/report/statusline/watch flows.
- Refresh README screenshots and CLI examples if visible workflows change.
- Preserve package trust gates and forced packed-install smoke before release.

## Release Criteria

0.9.0 is not releasable until:

- `npm run release:check` passes.
- Forced packed-install smoke passes outside sandbox when needed.
- `tokentrace digest`, `tokentrace report --markdown`, `tokentrace statusline
  claude`, and `tokentrace watch --session` have smoke coverage.
- Session timeline works without raw message storage.
- Saved views are local-only and survive restart.
- Claude status line V2 remains compatible with Claude Code stdin JSON.
- README and changelog are updated before tagging.
- GitHub Release body includes the complete 0.9.0 changelog section.
