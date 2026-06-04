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

## Maintenance Pass

TokenTrace is in maintenance mode: feature-complete, iterate from feedback. New features are pull-based (wait for real usage signals); health is push-based (run proactively). A maintenance pass is read-only triage — it reports and proposes, it does not bump versions or release. Run it periodically or when asked for a "health check".

Steps:

- **Test/type/lint gate:** `npm run verify` must be fully green (vitest + `tsc --noEmit` + eslint). Treat any failure as a regression to fix before other work.
- **Dependency drift:** `npm outdated`. Patch/minor bumps within the current major are low-risk; batch and verify them. Hold major bumps (e.g. eslint 10, `@vitejs/plugin-react` 6, `@types/node` 25, `eslint-plugin-react-hooks` 7) for a deliberate, separately-tested upgrade — never fold a major into a routine pass.
- **Security:** `npm audit --audit-level=moderate` (expect 0 vulnerabilities) and `npm run security:ioc`. For release-grade checks use `npm run security:package`.
- **Provider/ecosystem drift (highest-value signal for a cost tool):** check `pricing/default-model-prices.json` freshness and refresh with `npm run pricing:refresh` when models, tokenizers, or provider pricing have changed upstream. This is "feedback from reality," not from users — act on it without waiting for a complaint.
- **Package surface:** `npm pack --dry-run` and confirm the tarball contains only intended files. Nothing untracked-in-git should reach npm. The `files` array includes `public/`, so anything dropped into `public/` ships — keep non-product assets (brand kits, screenshots, scratch files) out of it or `.gitignore` them.
- **ProjScan:** `npm run projscan:doctor` for code-intelligence and release-readiness signal.
- **Report, don't release:** summarize findings and propose fixes. Apply only low-risk, verified maintenance (patch bumps, lockfile, packaging hygiene) under the Release Discipline rules above; leave version bumps and publishing to an explicit maintainer request.

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
