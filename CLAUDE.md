# TokenTrace Claude Code Instructions

Follow the same repository rules as Codex in `AGENTS.md`.

Key requirements:

- Use Superpowers methodology from <https://github.com/obra/superpowers> for coding workflow.
- Use ProjScan from <https://www.npmjs.com/package/projscan> for code intelligence and release-quality checks.
- Run `npm run projscan:doctor` after substantial changes and before release readiness claims.
- Do not bump versions, tag, push release tags, create GitHub Releases, or publish npm unless the maintainer explicitly asks for a release.
- Keep user-facing work documented in `CHANGELOG.md` under `Unreleased` until a maintainer requests the final release process.
- Read `docs/RELEASE_CHECKLIST.md` before any release work.
- Use `tokentrace agent --json` or `tokentrace capabilities --json` as TokenTrace's read-only machine-readable product discovery entry point.
- Keep `TOKENTRACE_AGENT.md`, `llms.txt`, and `docs/agent-discovery.schema.json` aligned when the agent contract changes.
