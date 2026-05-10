# TokenTrace 0.5.0 Roadmap

0.5.0 is the Package Trust + Usage Intelligence release.

The release should make three things clear:

- The npm package is transparent and scanner-friendly.
- The app explains what changed in usage, not just what totals are.
- Local scan and pricing problems are easier to repair without expanding beyond CLI usage.

## Release Rules

- No desktop app scraping.
- No browser extension.
- No proxy, packet capture, or network interception.
- No telemetry or cloud sync.
- No public tag, GitHub Release, or npm publish until the maintainer explicitly asks for release.
- GitHub Release notes must include the complete changelog section for the released version.

## 0.5.0 Slices

### 0.4.1 Package Trust

- Disable Next server minification for published server bundles.
- Keep generated route bundles readable for Socket and maintainers.
- Add package inspection that fails on packed generated route bundles.
- Remove unused package dependencies.
- Raise vulnerable dependency floors.
- Verify `npm audit --omit=dev --audit-level=high` is clean.

### 0.4.2 Release Automation

- Add GitHub Actions Trusted Publishing for tag-based npm releases.
- Add package and security CI checks.
- Add release checklist steps for full GitHub Release notes.
- Add an automated release-note extractor so GitHub Releases use the complete
  matching changelog section.
- Update the existing `v0.4.0` GitHub Release body with the full changelog section.

### 0.4.3 ProjScan And Repo Hygiene

- Add ProjScan configuration.
- Add ESLint, Prettier, and EditorConfig.
- Add lint to the verification path.
- Keep ProjScan focused on actionable issues instead of Next.js route export false positives.

### 0.4.4 Usage Pulse

- Add previous-period comparison analytics.
- Show token, cost, session, and unknown-cost movement on Overview.
- Compare selected date ranges to the immediately previous matching range.
- Compare all-time view using the latest seven days against the previous seven days.

### 0.4.5 Scan History And Trust Visibility

- Add recent scan history to Scan Doctor.
- Add package trust visibility in Settings.
- Keep trust copy factual: local only, no telemetry, no install scripts, tag-based release.

### 0.5.0 Hardening

- Run `npm run package:test`.
- Run `npm run package:inspect`.
- Run `npm audit --omit=dev --audit-level=high`.
- Run `npx projscan@latest doctor`.
- Smoke test a packed install before release.
- Refresh README and changelog before tagging.

## Release Criteria

0.5.0 is not releasable until:

- Socket no longer has a justified obfuscated-code alert for TokenTrace source behavior.
- Production dependency audit reports zero high vulnerabilities.
- ProjScan reports no actionable issues.
- Overview, Doctor, Settings, Pricing, Sessions, and Discovery remain visually usable.
- GitHub Actions publish workflow is present and tag-gated.
- The 0.5.0 GitHub Release body includes the complete 0.5.0 changelog section.
