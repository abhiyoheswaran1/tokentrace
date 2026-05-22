# Release Checklist

TokenTrace keeps development slices separate from public releases. Do not bump,
tag, create a GitHub Release, push release tags, or publish npm unless a
maintainer explicitly asks for that public release.

## Development Slice Checklist

- Keep `package.json` and `package-lock.json` at the current development version.
- Add user-facing changes to `CHANGELOG.md` under `Unreleased`.
- Use the Superpowers workflow for non-trivial coding work.
- Run targeted tests for the slice.
- Run `npm run verify` before considering the slice stable.
- Run `npm run projscan:doctor` after substantial changes.
- Run `npm run package:inspect` when package contents or dependencies change.
  It verifies the publish tarball does not contain generated Next.js output and
  includes the agent discovery docs, schema, and executable CLI bin.
- Run `npm run security:ioc` after dependency scares or workflow changes. It
  checks lockfiles, privileged workflow triggers, and local AI-tool hook files
  for high-signal supply-chain indicators.
- Run `npm run smoke:packed` when CLI or package-discovery surfaces change.
  In sandboxed runs it may skip packed installation, but the tarball payload
  inspection still runs.
- Use `tokentrace roadmap --json` or `/api/roadmap` to confirm release blockers
  stay aligned with the current milestone. During pre-bump development,
  `releaseAllowed` should remain `false`; after a maintainer-approved bump it
  should be `true`.
- Keep the release-note extractor green when release documentation changes:
  `npm run release:notes -- v0.12.0`.
- For UI milestones, manually smoke the live app before release notes are
  considered current:
  - Overview renders Usage Pulse, accounting, cost/session, trends, Review
    Status, and Top repair items without blank charts.
  - Configure scan opens `/settings#scan-controls` and lands on Scan Controls
    after hydration.
  - Settings deep links land on Custom Folders, Scan Controls, Scan Scheduling,
    Scoped Guardrails, Package Trust, Import Profiles, and Local Exports.
  - Scan now feedback reports files checked, records imported, warnings, errors,
    recalculated costs, unknown cost, stale support imports, aliases, and links
    to Scan Health, Repair, Discovery, and Model Rates.
  - Evidence opened directly explains its contextual role, supports JSON and
    Markdown exports, and provides next actions to Overview, Sessions, Repair,
    and Model Rates.
  - Mobile Overview keeps period controls, trend controls, charts, and dense
    summaries usable without widening the page.
- Commit the slice with a plain milestone message.
- Do not run `npm version`, `git tag`, `gh release create`, or `npm publish`.

## Final Public Release Checklist

Use this only when the maintainer explicitly asks to release.

1. Confirm the target version, for example `0.12.0`.
2. Move changelog entries from `Unreleased` into the target version section.
3. Run:

   ```bash
   npm version 0.12.0 --no-git-tag-version
   npm run release:check
   ```

   `release:check` includes package verification, CLI smoke, packed-install
   smoke, supply-chain IOC scanning, package security inspection, and ProjScan
   doctor.

4. Smoke test a clean package install from the packed tarball or a temporary
   global install.
5. Commit the release bump:

   ```bash
   git add package.json package-lock.json CHANGELOG.md README.md docs SECURITY.md .github scripts tests
   git commit -m "Release 0.12.0"
   ```

6. Tag and push only after verification:

   ```bash
   git tag -a v0.12.0 -m "Release 0.12.0"
   git push origin main
   git push origin v0.12.0
   ```

7. Push the tag. The GitHub Actions `Publish Package` workflow verifies the tag,
   publishes to npm with Trusted Publishing and provenance, authenticates to the
   MCP registry via GitHub OIDC and publishes the matching `server.json`, then
   creates or updates the GitHub Release using the complete matching
   `CHANGELOG.md` section. Do not replace the release notes with generated text
   or a link-only changelog.
8. Confirm the GitHub Actions `Publish Package` workflow succeeds. The MCP
   registry step uses `mcp-publisher login github-oidc`; if the registry rejects
   the OIDC claim, fall back to a local `mcp-publisher login github` plus
   `mcp-publisher publish` from the verified release commit.
9. Verify npm:

   ```bash
   npm view tokentrace version
   ```

If automation fails, fix the workflow or package issue before attempting a
manual npm publish from the verified release commit.

10. Verify the MCP registry entry:

    ```bash
    curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=tokentrace" | jq '.servers[] | select(.name == "io.github.abhiyoheswaran1/tokentrace") | .version'
    ```

    The returned version should match the tag.
