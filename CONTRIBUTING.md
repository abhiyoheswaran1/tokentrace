# Contributing

Thanks for helping improve TokenTrace. The project is built around one principle: local-first analytics for AI CLI usage without collecting user data.

## Product Principles

- Keep ingestion local and filesystem-based by default.
- Do not add telemetry, cloud sync, proxying, packet capture, browser extensions, or traffic interception.
- Never store full prompts or responses by default.
- Keep exact, estimated, and unknown token values clearly separated.
- Prefer small, typed, testable changes over broad rewrites.
- Make parser failures visible and understandable in diagnostics.

## Development Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run verify
npm run build
npm run scan
```

## Parser Contributions

Adapters live in `src/ingestion/adapters/`.

When adding or improving a parser:

1. Detect compatibility defensively.
2. Parse partial records when complete metadata is unavailable.
3. Mark token confidence as `exact`, `high-confidence estimate`, `low-confidence estimate`, or `unknown`.
4. Avoid importing duplicate records.
5. Add or update fixtures under `fixtures/`.
6. Add parser tests under `tests/`.

Do not include private logs, full prompts, API keys, home directory details, or customer data in fixtures or issues. Redact samples before sharing them.

## Pricing Contributions

Default pricing lives in `pricing/default-model-prices.json`.

When updating prices:

- Use public provider pricing pages as sources.
- Keep prices editable by users.
- Preserve manual user overrides.
- Note date-sensitive pricing changes in `CHANGELOG.md`.
- Be explicit when a price is a list price, fallback, or approximation.

## Pull Requests

Good pull requests usually include:

- A clear user-facing problem statement.
- Focused code changes.
- Tests for parser, pricing, cost, or ingestion behavior when relevant.
- Screenshots for UI changes.
- README or changelog updates when behavior changes.

Before opening a pull request, run:

```bash
npm run verify
npm run build
```

## Release Policy

Maintainers publish releases. Contributors do not need npm access.

During active 0.4.0 development, internal milestone names such as `0.3.2` or
`0.3.5` are planning labels only. Keep changes under `CHANGELOG.md`
`Unreleased` and do not bump, tag, create a GitHub Release, or publish npm until
the maintainer explicitly asks for a public release.

For every public package release, maintainers must:

- Update `CHANGELOG.md`.
- Use semantic versioning.
- Push a matching Git tag, for example `v0.1.1`.
- Create a GitHub Release for the tag with user-facing release notes.
- Publish npm only from the same versioned source.

From now on, no npm release should exist without a matching Git tag and GitHub Release.

Use [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for the exact release
gate and command sequence.
