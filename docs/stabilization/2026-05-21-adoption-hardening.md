# TokenTrace Stabilization And Adoption Hardening

Date: 2026-05-21

Scope: mature-product stabilization, dogfood, fresh install, MCP client
compatibility, website handoff, friction capture, and blocker-only fixes.

Isolated test home: `/private/tmp/tokentrace-stabilization.iSDqig`

## Results Summary

Status: complete. One adoption blocker was found and fixed during dogfood:
database-backed command help now prints before touching local runtime state.

## Dogfood

| Check | Result | Notes |
| --- | --- | --- |
| Agent discovery JSON | Pass | `node bin/tokentrace.js agent --json` returned a read-only discovery manifest with MCP listed as an available command. |
| Capabilities alias JSON | Pass | `node bin/tokentrace.js capabilities --json` returned the same discovery manifest. |
| MCP self-test | Pass | `node bin/tokentrace.js mcp selftest --json` completed initialize, tools/list, guide, and scan-confirmation refusal checks. |
| Fixture scan | Pass | Isolated scan of `fixtures/generic-jsonl` imported 2 records from 1 file with 0 warnings and 0 errors. |
| Scan Health doctor | Pass | `doctor --json` returned `success` with healthy scan freshness, parser coverage, and model-rate coverage. |
| Evidence JSON | Pass | `evidence --json` reported 205 processed tokens, 1 session, 2 interactions, and 0 unknown-cost interactions. |
| Repair queue JSON | Pass | `repair --json` returned an empty unresolved queue after the fixture scan. |
| Markdown report | Pass | `report --markdown` rendered deterministic digest, post-session review, and accounting sections. |
| Browser guard | Pass | `npm run browser:guard` passed 10/10 desktop and mobile checks. |

## Fresh Install And Package Runtime

| Check | Result | Notes |
| --- | --- | --- |
| npm pack payload | Pass | `npm pack --json` built `tokentrace-0.14.1.tgz` with 297 entries and the compiled CLI runtime. |
| temporary prefix install | Pass | Clean install into `/private/tmp/tokentrace-fresh-install-0.14.1` added 196 production packages. |
| packed CLI version/help | Pass | Packed binary returned `0.14.1` and top-level CLI help. |
| packed command help on invalid home | Pass | Packed `scan --help`, `evidence --help`, and `repair --help` returned usage text with `TOKENTRACE_HOME` pointing at a file. |
| packed agent discovery | Pass | Packed `tokentrace agent --json` returned the discovery manifest with MCP and agent guardrails. |
| packed fixture scan | Pass | Packed CLI scanned its bundled generic JSONL fixture and imported 2 records with 0 warnings/errors. |
| packed MCP self-test | Pass | Packed `tokentrace mcp selftest --json` passed initialize, tools/list, guide, and scan-confirmation refusal checks. |

## MCP Client Compatibility

| Check | Result | Notes |
| --- | --- | --- |
| Official SDK availability | Pass | Installed `@modelcontextprotocol/sdk@1.29.0` into `/private/tmp/tokentrace-mcp-client-sdk` for client compatibility testing. |
| SDK stdio initialize/list tools | Pass | Official SDK `Client` connected over `StdioClientTransport` and listed 8 TokenTrace tools. |
| SDK get_agent_guide call | Pass | `get_agent_guide` returned registry name `io.github.abhiyoheswaran1/tokentrace` and `tokentrace mcp`/`npx tokentrace mcp` command hints. |
| SDK run_scan refusal | Pass | `run_scan` without confirmation returned an MCP error response with `requiresHumanConfirmation: true`. |
| SDK packed install compatibility | Pass | Official SDK connected to the packed-install binary and successfully called `get_agent_guide` and `get_status`. |

## Website

| Check | Result | Notes |
| --- | --- | --- |
| Local website source found | Pass | No local checkout existed under `/Users/abhyoh/Documents/Brand/Apps`, but the private `abhiyoheswaran1/abhiyoheswaran.com` repo was found via GitHub and cloned to `/private/tmp/abhiyoheswaran.com-tokentrace-update`. |
| Website update prompt current | Pass | `docs/WEBSITE-UPDATE-PROMPT.md` already included 0.14.0/0.14.1 MCP registry, `get_agent_guide`, and self-test copy. |
| Live public page current before source update | No | `https://www.abhiyoheswaran.com/apps/tokentrace` still showed `0.13.0` and did not include MCP registry, `get_agent_guide`, or `tokentrace mcp selftest --json`. |
| Website source update | Pass | Pushed `abhiyoheswaran1/abhiyoheswaran.com@361fe41` with TokenTrace MCP adoption copy and app-card copy updates. Website repo `npm test` passed 7/7 and `npm run build` built 20 pages. |
| Live public page current after source push | Pending deploy | Recheck immediately after push still showed the old `0.13.0` page, so the source is updated but the public deployment had not refreshed yet. |

## Adoption Risk Probes

| Risk | Result | Notes |
| --- | --- | --- |
| First-run / no-data commands | Pass | Empty-home `doctor --json`, `status --json`, and `report --markdown` all exited 0 without stderr. |
| Weird local logs / parser variability | Pass | Mixed malformed JSONL, unsupported text, and valid usage JSONL scan exited 0, imported the valid record, surfaced warnings/errors, and Scan Health reported parser review and unsupported-file state. |
| Duplicate diagnostics | Pass | Re-scanning the same weird-log folder exited 0, imported 0 new records, and surfaced duplicate warnings without crashing. |
| Large local databases | Covered by gates | Browser guard, release checks, and existing pagination/trend/overview tests remain the verification path; no new large-DB blocker reproduced during this pass. |

## Friction Log

| Friction | Classification | Action |
| --- | --- | --- |
| No separate website repo in this workspace | Observation | Private website source was found through GitHub and updated from a temporary clone. |
| `tokentrace <data-command> --help` could initialize or import database-backed runtime before printing help | Adoption blocker | Fixed dispatcher help short-circuiting plus lazy `evidence`/`repair` runtime imports; regression added in `tests/serve-command.test.ts`. |
| Website source push reported Dependabot vulnerabilities in the website repo | Observation | Not a TokenTrace runtime blocker; left for the website repo's security maintenance queue. |

## Final Verification

| Gate | Result | Notes |
| --- | --- | --- |
| Targeted tests | Pass | `npx vitest run tests/serve-command.test.ts` passed 12/12 after the CLI help regression fix. |
| release:check | Pass | `npm run release:check` passed: 109 test files / 335 tests, typecheck, lint, build, CLI smoke, packed payload inspection, IOC scan, package inspection, npm audit, and ProjScan doctor. Serve and packed-install smoke reported sandbox network-binding skips, consistent with this environment. |
| browser:guard | Pass | First rerun hit a stale `next dev` server after `next build`; after restarting the local server on port 3000, `npm run browser:guard` passed 10/10. |
| MCP self-test | Pass | `node bin/tokentrace.js mcp selftest --json` returned `ok: true` with initialize, tools-list, agent-guide, and scan-confirmation refusal checks. |
| ProjScan doctor | Pass | Included in `release:check`: ProjScan v2.1.0 reported Health Score A, 100/100, no issues detected. |
