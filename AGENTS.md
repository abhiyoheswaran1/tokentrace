# TokenTrace Agent Instructions

These instructions apply to coding agents working in this repository.

## Mandatory Workflow

- Use the Superpowers methodology from <https://github.com/obra/superpowers> for coding work.
- Before non-trivial implementation, use the relevant Superpowers skills for brainstorming, systematic debugging, test-driven development, planning, code review, and verification.
- Prefer TDD for behavior changes: write a failing test, verify it fails for the expected reason, implement the smallest fix, and verify it passes.
- Use ProjScan from <https://www.npmjs.com/package/projscan> as a standard code-intelligence and quality gate.
- Run targeted `projscan` commands when exploring substantial changes, and run `npm run projscan:doctor` after substantial implementation or before release readiness claims.
- ProjScan does not replace tests, typecheck, lint, build, package, or smoke verification.

## Release Discipline

- Do not bump `package.json`, update `package-lock.json` for a version bump, create git tags, push release tags, create GitHub Releases, or publish to npm unless the maintainer explicitly asks for a release.
- Build and test substantial improvements before any release conversation.
- User-facing changes must be recorded in `CHANGELOG.md` under `Unreleased` while in development.
- Read `docs/RELEASE_CHECKLIST.md` before any release work.
- Final public release gates include `npm run release:check`, packed-install smoke when needed, ProjScan doctor, changelog section extraction, tag/version matching, GitHub Trusted Publishing, and npm verification.

## TokenTrace Product Guardrails

- Keep TokenTrace local-first: no telemetry, cloud sync, proxies, packet capture, browser extensions, or desktop app scraping.
- Keep raw prompts and message bodies out of normal UI paths.
- Distinguish exact, estimated, unknown, cached, and non-cache values in UI copy and data models.
- Prefer compact, evidence-backed product UI over decorative dashboards.

## Product Discovery For Agents

- Use `tokentrace agent --json` or `tokentrace capabilities --json` as the stable machine-readable discovery entry point.
- Keep `TOKENTRACE_AGENT.md`, `llms.txt`, and `docs/agent-discovery.schema.json` aligned with the discovery manifest when the agent contract changes.
- Treat discovery as read-only: it must not scan files, initialize the dashboard database, start a server, or make a network request.
- Before reporting usage numbers, prefer `tokentrace scan --json`, `tokentrace doctor --json`, and `tokentrace evidence --json` so claims are grounded in local data.
