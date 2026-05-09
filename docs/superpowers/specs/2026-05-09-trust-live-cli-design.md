# Trust + Live CLI Design

## Goal

TokenTrace 0.4.0 should make local AI CLI usage feel trustworthy, repairable,
and useful during live Claude Code sessions without expanding into desktop app
scraping, browser extensions, proxies, packet capture, or cloud telemetry.

## Product Shape

The release remains CLI-only. TokenTrace scans local CLI artifacts, prices what
it can, explains what it cannot price, and gives the user enough evidence to
trust or repair each number. The UI should behave like a local ledger: compact,
precise, and explicit about uncertainty.

## Milestone Strategy

Internal milestone labels are used for planning, not public releases. All work
lands as normal commits under `CHANGELOG.md` `Unreleased`. The only public bump,
tag, GitHub release, and npm publish target is 0.4.0.

## Feature Areas

### Runtime Version Visibility

Users should be able to see the running TokenTrace version after starting the
app. The version appears in the desktop sidebar footer, mobile header, and
Settings. It is read from package metadata at runtime so packaged and local
builds agree.

### Parser Trust

Discovery and adapters should prefer known CLI usage locations and ignore known
support/cache/plugin/todo files. Diagnostics should distinguish imported,
ignored, duplicate, unsupported, and failed files. Parser metadata should remain
visible enough for bug reports.

### Doctor

Doctor becomes the main repair page. It explains scan health, roots, file
statuses, parser coverage, pricing coverage, unknown-cost causes, and next
actions. It should answer why a scan imported nothing.

### Evidence Trail

Numbers should be inspectable. Cost and token summaries should connect back to
sessions, source files, parser confidence, and pricing rows. Unknown costs should
be grouped by cause so users can repair them without guessing.

### Live CLI

Claude Code status-line support should be concise, readable, and configurable.
Codex should use documented fallback behavior unless a stable native status-line
surface is confirmed.

### Local Brain

Recommendations are deterministic local rules, not cloud AI. They rank useful
next actions from database facts: unknown pricing, dominant projects, estimated
tools, duplicate-only scans, cache-heavy usage, parser warnings, and alias gaps.

## Testing

Every implementation slice adds Vitest coverage before or alongside code. Final
hardening includes package tests, clean-home CLI smoke tests, and browser visual
checks for the most important pages.
