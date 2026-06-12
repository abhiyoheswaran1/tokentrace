#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 15_000;
const CHATGPT_APP_TOOL_NAME = "get_redacted_evidence_pack";
const CHATGPT_APP_WIDGET_URI = "ui://tokentrace/evidence-pack.html";

function usage() {
  return `TokenTrace ChatGPT app release check

Usage:
  npm run release:chatgpt:check
  npm run release:chatgpt:check -- --json
  npm run release:chatgpt:check -- --mcp-url https://example.com/mcp
  npm run release:chatgpt:check -- --allow-local --mcp-url http://127.0.0.1:8787/mcp

Options:
  --mcp-url <url>      HTTPS /mcp endpoint to validate before OpenAI Dashboard submission.
  --allow-local        Permit http://localhost and loopback URLs for developer-mode smoke tests only.
  --json               Print a machine-readable report.
  -h, --help           Print help.

The check does not submit or publish the ChatGPT app. Public release remains an OpenAI Dashboard manual gate.`;
}

export function parseArgs(args, env = process.env) {
  const options = {
    json: false,
    help: false,
    allowLocal: false,
    mcpUrl: env.CHATGPT_APP_MCP_URL || ""
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--allow-local") {
      options.allowLocal = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--mcp-url") {
      const value = args[index + 1];
      if (!value) throw new Error("Missing --mcp-url value.");
      options.mcpUrl = value;
      index += 1;
      continue;
    }
    if (arg?.startsWith("--mcp-url=")) {
      options.mcpUrl = arg.slice("--mcp-url=".length);
      continue;
    }
    throw new Error(`Unknown ChatGPT app release check argument: ${arg}`);
  }

  return options;
}

function isLoopbackHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  return normalized === "localhost" || normalized === "::1" || /^127\./.test(normalized);
}

export function validateReleaseTarget(value, { allowLocal = false } = {}) {
  if (!value) {
    throw new Error("Missing ChatGPT app MCP URL. Pass --mcp-url or set CHATGPT_APP_MCP_URL.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ChatGPT app MCP URL: ${value}`);
  }

  const isLocal = isLoopbackHost(url.hostname);
  if (!url.pathname.endsWith("/mcp")) {
    throw new Error("ChatGPT app MCP URL must end with /mcp.");
  }
  if (url.protocol !== "https:" && !(allowLocal && url.protocol === "http:")) {
    throw new Error("ChatGPT public app release target must use HTTPS; pass --allow-local only for localhost smoke tests.");
  }
  if (isLocal && !allowLocal) {
    throw new Error("ChatGPT public app release target must not be localhost or loopback; use a hosted HTTPS /mcp endpoint.");
  }

  return url;
}

export function buildSubmissionChecklist({ mcpUrl = "" } = {}) {
  return [
    {
      id: "hosted-mcp-url",
      status: mcpUrl ? "ready" : "manual",
      detail: mcpUrl ? `Validated connector URL: ${mcpUrl}` : "Deploy the MCP server to a public HTTPS /mcp URL."
    },
    {
      id: "personal-account-owner",
      status: "manual",
      detail:
        "Log into the OpenAI Platform Dashboard with the personal OpenAI account and select the intended publishing organization."
    },
    {
      id: "organization-verification",
      status: "manual",
      detail: "Complete individual or organization verification in the OpenAI Platform Dashboard."
    },
    {
      id: "dashboard-permission",
      status: "manual",
      detail: "Use an Owner role or api.apps.write permission for drafts and submission."
    },
    {
      id: "privacy-policy",
      status: "manual",
      detail: "Provide privacy policy, support, terms, and data handling metadata for the redacted evidence-pack workflow."
    },
    {
      id: "screenshots-and-prompts",
      status: "manual",
      detail: "Capture screenshots and golden prompts from developer-mode testing."
    },
    {
      id: "dashboard-review",
      status: "manual",
      detail: "Create or update the app draft, attach the connector URL, and submit it in the OpenAI Dashboard."
    },
    {
      id: "manual-publish",
      status: "manual",
      detail: "Publish the approved app from the OpenAI Dashboard after review approval."
    }
  ];
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function captureCheck(id, detail, action) {
  try {
    const evidence = await action();
    return {
      id,
      ok: true,
      detail,
      ...(evidence === undefined ? {} : { evidence })
    };
  } catch (error) {
    return {
      id,
      ok: false,
      detail,
      error: errorMessage(error)
    };
  }
}

function checkRequiredDocs(root) {
  const requiredDocs = [
    "docs/CHATGPT_APP_FEASIBILITY.md",
    "docs/CHATGPT_APP_PROTOTYPE.md",
    "docs/CHATGPT_APP_RELEASE.md"
  ];
  const missing = requiredDocs.filter((file) => !existsSync(path.join(root, file)));
  if (missing.length > 0) {
    throw new Error(`Missing ChatGPT app release documentation: ${missing.join(", ")}`);
  }

  const releaseDoc = readFileSync(path.join(root, "docs/CHATGPT_APP_RELEASE.md"), "utf8");
  for (const phrase of ["OpenAI Platform Dashboard", "personal OpenAI account", "does not submit or publish"]) {
    if (!releaseDoc.includes(phrase)) {
      throw new Error(`docs/CHATGPT_APP_RELEASE.md is missing required release guidance: ${phrase}`);
    }
  }

  return requiredDocs;
}

export function checkLocalPrototype({ root = process.cwd(), env = process.env } = {}) {
  const result = spawnSync(process.execPath, ["bin/tokentrace.js", "chatgpt-app", "selftest", "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    env: {
      ...process.env,
      ...env
    }
  });

  if (result.status !== 0) {
    throw new Error(`tokentrace chatgpt-app selftest failed:\n${result.stdout}\n${result.stderr}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`tokentrace chatgpt-app selftest returned invalid JSON: ${errorMessage(error)}`);
  }

  if (parsed.ok !== true) {
    throw new Error("tokentrace chatgpt-app selftest reported a failing check.");
  }
  if (parsed.mutatedLocalState !== false) {
    throw new Error("tokentrace chatgpt-app selftest must not mutate local state.");
  }
  if (!Array.isArray(parsed.tools) || !parsed.tools.includes(CHATGPT_APP_TOOL_NAME)) {
    throw new Error(`tokentrace chatgpt-app selftest did not report ${CHATGPT_APP_TOOL_NAME}.`);
  }

  return {
    app: parsed.app,
    registryName: parsed.registryName,
    tools: parsed.tools,
    mutatedLocalState: parsed.mutatedLocalState
  };
}

async function rpc(fetchImpl, mcpUrl, id, method, params = {}) {
  const activeFetch = fetchImpl ?? globalThis.fetch;
  if (typeof activeFetch !== "function") {
    throw new Error("This Node runtime does not provide fetch; use Node 20 or newer.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await activeFetch(mcpUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params
      }),
      signal: controller.signal
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`MCP ${method} request failed with HTTP ${response.status}: ${body.slice(0, 400)}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error(`MCP ${method} response was not JSON: ${errorMessage(error)}`);
    }

    if (parsed.error) {
      throw new Error(`MCP ${method} returned JSON-RPC error: ${JSON.stringify(parsed.error)}`);
    }

    return parsed.result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHostedMcp({ mcpUrl, fetchImpl = globalThis.fetch } = {}) {
  const checks = [];

  checks.push(
    await captureCheck("hosted-initialize", "Hosted MCP endpoint accepts initialize.", async () => {
      const initializeResult = await rpc(fetchImpl, mcpUrl, 1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "tokentrace-chatgpt-app-release-check",
          version: "0.1.0"
        }
      });
      if (initializeResult?.serverInfo?.name !== "tokentrace-chatgpt-app") {
        throw new Error("Hosted MCP endpoint did not report tokentrace-chatgpt-app.");
      }
      return initializeResult.serverInfo;
    })
  );

  if (!checks.at(-1)?.ok) return checks;

  checks.push(
    await captureCheck("hosted-tools-list", "Hosted MCP endpoint advertises the Apps SDK evidence-pack tool.", async () => {
      const toolsResult = await rpc(fetchImpl, mcpUrl, 2, "tools/list");
      const tool = toolsResult?.tools?.find((candidate) => candidate.name === CHATGPT_APP_TOOL_NAME);
      if (!tool) throw new Error(`Hosted MCP endpoint does not advertise ${CHATGPT_APP_TOOL_NAME}.`);
      if (tool.annotations?.readOnlyHint !== true) throw new Error("Tool must be marked read-only.");
      if (tool.annotations?.destructiveHint !== false) throw new Error("Tool must be marked non-destructive.");
      if (tool.annotations?.openWorldHint !== false) throw new Error("Tool must be marked closed-world.");
      if (tool._meta?.ui?.resourceUri !== CHATGPT_APP_WIDGET_URI) throw new Error("Tool is missing Apps SDK widget URI.");
      if (tool._meta?.["openai/outputTemplate"] !== CHATGPT_APP_WIDGET_URI) {
        throw new Error("Tool is missing openai/outputTemplate metadata.");
      }
      return {
        tool: tool.name,
        widgetUri: tool._meta.ui.resourceUri
      };
    })
  );

  if (!checks.at(-1)?.ok) return checks;

  checks.push(
    await captureCheck("hosted-widget-resource", "Hosted MCP endpoint serves the widget resource.", async () => {
      const resourceResult = await rpc(fetchImpl, mcpUrl, 3, "resources/read", {
        uri: CHATGPT_APP_WIDGET_URI
      });
      const [resource] = resourceResult?.contents ?? [];
      if (resource?.uri !== CHATGPT_APP_WIDGET_URI) throw new Error("Widget resource URI mismatch.");
      if (resource.mimeType !== "text/html;profile=mcp-app") throw new Error("Widget resource must use MCP Apps MIME type.");
      if (!String(resource.text ?? "").includes("window.openai")) {
        throw new Error("Widget resource must use the MCP Apps iframe bridge.");
      }
      return {
        uri: resource.uri,
        mimeType: resource.mimeType
      };
    })
  );

  if (!checks.at(-1)?.ok) return checks;

  checks.push(
    await captureCheck("hosted-tool-call-redaction", "Hosted tool call returns a redacted evidence-pack payload.", async () => {
      const callResult = await rpc(fetchImpl, mcpUrl, 4, "tools/call", {
        name: CHATGPT_APP_TOOL_NAME,
        arguments: {
          metric: "sessions"
        }
      });
      const pack = callResult?.structuredContent?.pack;
      if (pack?.schemaVersion !== "tokentrace.evidence-pack.v1") {
        throw new Error("Tool call did not return tokentrace.evidence-pack.v1.");
      }
      if (pack.redaction?.rawContentIncluded !== false) {
        throw new Error("Tool call must not include raw content.");
      }
      if (callResult?._meta?.rawContentIncluded !== false) {
        throw new Error("Tool call metadata must mark rawContentIncluded false.");
      }
      return {
        schemaVersion: pack.schemaVersion,
        rawContentIncluded: pack.redaction.rawContentIncluded
      };
    })
  );

  return checks;
}

export async function runReleaseCheck(args = process.argv.slice(2), env = process.env, options = {}) {
  const parsedArgs = parseArgs(args, env);
  const root = options.root ?? process.cwd();
  const checks = [];

  if (parsedArgs.help) {
    return {
      ok: true,
      help: usage()
    };
  }

  let validatedMcpUrl = "";
  if (parsedArgs.mcpUrl) {
    const targetCheck = await captureCheck("release-target", "Validate public ChatGPT app MCP target.", () => {
      const target = validateReleaseTarget(parsedArgs.mcpUrl, { allowLocal: parsedArgs.allowLocal });
      validatedMcpUrl = target.toString();
      return {
        mcpUrl: validatedMcpUrl,
        allowLocal: parsedArgs.allowLocal
      };
    });
    checks.push(targetCheck);
    if (!targetCheck.ok) {
      return {
        ok: false,
        mode: "hosted-endpoint",
        submissionRequired: true,
        dashboardManualGate: true,
        publishesPublicApp: false,
        checks,
        checklist: buildSubmissionChecklist()
      };
    }
  }

  checks.push(
    await captureCheck("release-docs", "ChatGPT app release, feasibility, and prototype docs are present.", () =>
      checkRequiredDocs(root)
    )
  );

  checks.push(
    await captureCheck("prototype-selftest", "Private ChatGPT app prototype self-test passes without scanning files.", () =>
      checkLocalPrototype({ root, env })
    )
  );

  if (validatedMcpUrl) {
    const hostedChecks = await checkHostedMcp({
      mcpUrl: validatedMcpUrl,
      fetchImpl: options.fetchImpl ?? globalThis.fetch
    });
    checks.push(...hostedChecks);
  }

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    mode: validatedMcpUrl ? "hosted-endpoint" : "local-readiness",
    mcpUrl: validatedMcpUrl || undefined,
    submissionRequired: true,
    dashboardManualGate: true,
    publishesPublicApp: false,
    checks,
    checklist: buildSubmissionChecklist({ mcpUrl: validatedMcpUrl })
  };
}

function formatHuman(result) {
  if (result.help) return `${result.help}\n`;

  const lines = [
    "TokenTrace ChatGPT app release check",
    `- mode: ${result.mode}`,
    `- status: ${result.ok ? "pass" : "fail"}`,
    "- public submit/publish: manual OpenAI Dashboard gate"
  ];

  if (result.mcpUrl) lines.push(`- mcpUrl: ${result.mcpUrl}`);
  for (const check of result.checks ?? []) {
    lines.push(`- ${check.ok ? "pass" : "fail"} ${check.id}: ${check.error ?? check.detail}`);
  }
  lines.push("- next: use the personal OpenAI account in the OpenAI Platform Dashboard to submit or publish after review.");
  return `${lines.join("\n")}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const wantsJson = args.includes("--json");
  try {
    const result = await runReleaseCheck(args);
    if (wantsJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(formatHuman(result));
    }
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    const result = {
      ok: false,
      mode: "argument-error",
      submissionRequired: true,
      dashboardManualGate: true,
      publishesPublicApp: false,
      checks: [
        {
          id: "arguments",
          ok: false,
          detail: "Parse ChatGPT app release check arguments.",
          error: errorMessage(error)
        }
      ],
      checklist: buildSubmissionChecklist()
    };
    if (wantsJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stderr.write(`${errorMessage(error)}\n\n${usage()}\n`);
    }
    process.exit(1);
  }
}
