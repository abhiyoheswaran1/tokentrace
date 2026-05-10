# Security Policy

TokenTrace is local-first software for AI CLI usage analytics. It should be easy
to audit, predictable to install, and clear about what it reads, writes, and
downloads.

## Security Guarantees

- No telemetry, cloud sync, traffic interception, proxying, packet sniffing, or
  browser extension is part of the product.
- The TokenTrace package has no `preinstall`, `install`, or `postinstall`
  npm lifecycle scripts.
- Runtime state is stored locally in the user's TokenTrace app-data directory.
- Raw full prompts and responses are off by default.
- Pricing refresh downloads a public model-pricing manifest only. It does not
  send usage logs, prompts, file paths, analytics, or identifiers. Set
  `TOKENTRACE_DISABLE_PRICE_REFRESH=1` to use bundled prices only.
- The published package ships readable application source and the compiled CLI
  runtime, not generated `.next/server` route bundles. `tokentrace serve`
  prepares the local dashboard build in the user's app-data directory when
  needed.

## What TokenTrace Reads

By default, TokenTrace scans known local AI CLI folders, project-level hidden
CLI folders, TokenTrace wrapper logs, and folders explicitly configured by the
user in Settings. It ignores known non-usage support paths such as CLI caches,
plugin folders, and todo metadata.

TokenTrace is not designed to scrape desktop apps, browser history, chat apps,
or network traffic.

## What TokenTrace Writes

TokenTrace writes normalized analytics, scan history, editable pricing, and
optional local debug previews to SQLite in the TokenTrace app-data directory.
When running from source, the default development database is
`.tokentrace/tokentrace.db`.

## Release Trust

Public package releases are built from Git tags. The release flow includes
package inspection, production dependency audit, ProjScan checks, and npm
Trusted Publishing through GitHub Actions.

## Reporting

For non-sensitive issues, open a GitHub issue:

https://github.com/abhiyoheswaran1/tokentrace/issues

For sensitive reports, use GitHub's private vulnerability reporting if it is
enabled for the repository. Please do not include private prompts, logs, API
keys, home-directory details, or customer data in public issues.
