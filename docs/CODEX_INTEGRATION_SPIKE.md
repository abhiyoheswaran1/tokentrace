# Codex CLI Integration Spike

Checked on 2026-05-09.

## Decision

TokenTrace should not claim native Codex sticky/status-line integration yet.
The safe supported path before 0.4.0 is:

```bash
tokentrace watch --session --compact
```

Use it in a terminal split or tmux pane next to Codex.

## Findings

- Claude Code has a documented custom status-line command contract that runs a
  user-provided command, sends session JSON on stdin, and refreshes as messages
  update. TokenTrace supports this directly with `tokentrace statusline claude`.
- Codex CLI has status-line discussion and configuration activity, but the
  public surface found during this spike describes built-in status-line fields,
  not a stable custom command contract equivalent to Claude Code's `statusLine`.
- Codex hooks/config behavior is still moving across versions, and issues show
  active compatibility churn around `config.toml`, hooks, and TUI status.

## Sources

- Claude Code status line docs: https://code.claude.com/docs/en/statusline
- OpenAI Codex CLI help: https://help.openai.com/en/articles/11096431
- OpenAI Codex repository: https://github.com/openai/codex
- Codex status-line issue: https://github.com/openai/codex/issues/13660
- Codex hooks issue: https://github.com/openai/codex/issues/17532

## 0.4.0 Scope

- Keep Claude Code native status-line support.
- Keep Codex fallback watch mode.
- Do not modify `~/.codex/config.toml`.
- Do not parse Codex terminal output.
- Revisit native Codex support when an official custom status-line or hook
  contract is documented and stable.
