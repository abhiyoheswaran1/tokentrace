# Release Checklist

TokenTrace uses internal milestone commits while building toward the next public
minor release. Do not bump, tag, create a GitHub Release, push release tags, or
publish npm for internal `0.3.x` planning checkpoints unless a maintainer
explicitly asks for that public release.

## Internal Milestone Checklist

- Keep `package.json` and `package-lock.json` at the current development version.
- Add user-facing changes to `CHANGELOG.md` under `Unreleased`.
- Run targeted tests for the slice.
- Run `npm run verify` before considering the slice stable.
- Commit the slice with a plain milestone message.
- Do not run `npm version`, `git tag`, `gh release create`, or `npm publish`.

## Final Public Release Checklist

Use this only when the maintainer explicitly asks to release.

1. Confirm the target version, for example `0.4.0`.
2. Move changelog entries from `Unreleased` into the target version section.
3. Run:

   ```bash
   npm version 0.4.0 --no-git-tag-version
   npm run package:test
   ```

4. Smoke test a clean package install from the packed tarball or a temporary
   global install.
5. Commit the release bump:

   ```bash
   git add package.json package-lock.json CHANGELOG.md README.md docs
   git commit -m "Release 0.4.0"
   ```

6. Tag and push only after verification:

   ```bash
   git tag -a v0.4.0 -m "Release 0.4.0"
   git push origin main
   git push origin v0.4.0
   ```

7. Create the GitHub Release and explicitly mark it as latest.
8. Publish npm from the same commit:

   ```bash
   npm publish --access public
   npm view tokentrace version
   ```

npm may require OTP or browser-based authentication. If automation cannot
complete the npm auth flow, the maintainer publishes manually from the verified
release commit.
