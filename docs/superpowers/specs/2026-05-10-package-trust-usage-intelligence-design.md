# Package Trust And Usage Intelligence Design

## Goal

Build 0.5.0 as a trust-centered release: the package is transparent to scanners, release automation is verifiable, and users can understand what changed in their CLI usage without leaving the local dashboard.

## Scope

TokenTrace stays CLI-only. The product continues to read local CLI artifacts through filesystem adapters. The release does not add desktop app scraping, browser extensions, proxies, packet capture, telemetry, or cloud sync.

## Package Trust

The npm package should be easy to explain. It has no install lifecycle scripts. Generated Next.js server route bundles are intentionally left readable instead of server-minified. A package inspection script checks those expectations before release. Dependency floors are raised when audit or Socket identifies a real risk.

## Release Automation

Publishing moves to GitHub Actions Trusted Publishing. A pushed version tag triggers package verification and npm publish with provenance. Manual npm publish is a fallback only after fixing automation problems. GitHub Release notes must contain the complete changelog section for the version.

## Usage Intelligence

Overview gains a Usage Pulse. For selected date ranges, the pulse compares the current range with the immediately previous matching range. For unbounded all-time viewing, it compares the latest seven days of imported interactions with the previous seven days. This gives users a quick answer to what changed.

## Scan Trust

Scan Doctor gains a recent scan history section. Settings gains a package trust section that summarizes no install scripts, local-first network behavior, and tag-based releases. These are informational and deterministic.

## Testing

The release requires tests for package trust and usage comparison analytics. The verification path runs Vitest, TypeScript, ESLint, production build, npm pack dry-run, package inspection, npm audit, and ProjScan.
