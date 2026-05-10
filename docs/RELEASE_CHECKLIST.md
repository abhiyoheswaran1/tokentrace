# Release Checklist

TokenTrace uses internal milestone commits while building toward the next public
minor release. Do not bump, tag, create a GitHub Release, push release tags, or
publish npm for internal planning checkpoints unless a maintainer explicitly
asks for that public release.

## Internal Milestone Checklist

- Keep `package.json` and `package-lock.json` at the current development version.
- Add user-facing changes to `CHANGELOG.md` under `Unreleased`.
- Run targeted tests for the slice.
- Run `npm run verify` before considering the slice stable.
- Run `npm run package:inspect` after a production build when package contents
  or dependencies change.
- Keep the release-note extractor green when release documentation changes:
  `npm run release:notes -- v0.4.0`.
- Commit the slice with a plain milestone message.
- Do not run `npm version`, `git tag`, `gh release create`, or `npm publish`.

## Final Public Release Checklist

Use this only when the maintainer explicitly asks to release.

1. Confirm the target version, for example `0.4.0`.
2. Move changelog entries from `Unreleased` into the target version section.
3. Run:

   ```bash
   npm version 0.5.0 --no-git-tag-version
   npm run release:check
   ```

4. Smoke test a clean package install from the packed tarball or a temporary
   global install.
5. Commit the release bump:

   ```bash
   git add package.json package-lock.json CHANGELOG.md README.md docs SECURITY.md .github scripts tests
   git commit -m "Release 0.5.0"
   ```

6. Tag and push only after verification:

   ```bash
   git tag -a v0.5.0 -m "Release 0.5.0"
   git push origin main
   git push origin v0.5.0
   ```

7. Push the tag. The GitHub Actions `Publish Package` workflow verifies the tag,
   publishes to npm with Trusted Publishing and provenance, then creates or
   updates the GitHub Release using the complete matching `CHANGELOG.md`
   section. Do not replace it with generated notes or a link-only changelog.
8. Confirm the GitHub Actions `Publish Package` workflow succeeds.
9. Verify npm:

   ```bash
   npm view tokentrace version
   ```

If automation fails, fix the workflow or package issue before attempting a
manual npm publish from the verified release commit.
