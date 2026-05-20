import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type ToolCallParams = {
  name?: string;
  arguments?: Record<string, unknown>;
};

const protocolVersion = "2025-06-18";

function packageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : "unknown";
  } catch {
    return "unknown";
  }
}

function toolInputSchema(properties: Record<string, unknown> = {}, required: string[] = []) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required
  };
}

export const mcpTools = [
  {
    name: "get_capabilities",
    title: "Get TokenTrace capabilities",
    description: "Return the read-only TokenTrace agent discovery manifest. Does not initialize local app data.",
    inputSchema: toolInputSchema()
  },
  {
    name: "get_status",
    title: "Get local usage status",
    description: "Return the current local TokenTrace usage status snapshot as JSON.",
    inputSchema: toolInputSchema()
  },
  {
    name: "run_doctor",
    title: "Run Scan Health doctor",
    description: "Inspect scan freshness, parser trust, source coverage, package trust, and repair recommendations.",
    inputSchema: toolInputSchema()
  },
  {
    name: "get_evidence",
    title: "Get metric evidence trail",
    description: "Return evidence behind a TokenTrace metric without raw prompt or message bodies.",
    inputSchema: toolInputSchema({
      metric: {
        type: "string",
        enum: [
          "processed-tokens",
          "non-cache-tokens",
          "cached-tokens",
          "estimated-cost",
          "sessions",
          "unknown-cost",
          "guardrails",
          "review-queue"
        ],
        description: "Evidence metric to inspect. Defaults to processed-tokens."
      }
    })
  },
  {
    name: "get_repair_queue",
    title: "Get unknown-cost repair queue",
    description: "Return grouped unknown-cost repair causes, next actions, and review state.",
    inputSchema: toolInputSchema()
  },
  {
    name: "get_report",
    title: "Get local usage report",
    description: "Return a deterministic local report as markdown or JSON.",
    inputSchema: toolInputSchema({
      format: {
        type: "string",
        enum: ["markdown", "json"],
        description: "Report format. Defaults to markdown."
      },
      since: {
        type: "string",
        description: "Optional scope: last-scan, yesterday, or YYYY-MM-DD."
      }
    })
  },
  {
    name: "run_scan",
    title: "Run local scan",
    description:
      "Explicitly scan local AI CLI artifacts and update the local TokenTrace database. Requires confirmLocalScan=true.",
    inputSchema: toolInputSchema(
      {
        confirmLocalScan: {
          type: "boolean",
          description: "Must be true to confirm local file reads and local database writes."
        },
        folders: {
          type: "array",
          items: { type: "string" },
          description: "Optional local folders to scan. Defaults to TokenTrace's supported local roots."
        },
        force: {
          type: "boolean",
          description: "Force parser reprocessing for files that would otherwise be deduplicated."
        }
      },
      ["confirmLocalScan"]
    )
  }
];

function jsonRpcResponse(id: JsonRpcId | undefined, result: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

export function jsonRpcError(id: JsonRpcId | undefined, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message }
  };
}

function command(args: string[]) {
  const bin = path.join(process.cwd(), "bin", "tokentrace.js");
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    throw new Error(stderr || stdout || `tokentrace ${args.join(" ")} exited with code ${result.status}`);
  }
  return result.stdout;
}

function commandJson(args: string[]) {
  return JSON.parse(command(args));
}

function toolResult(value: unknown) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2)
      }
    ]
  };
}

function toolError(error: unknown) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error)
      }
    ]
  };
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function scanArgs(args: Record<string, unknown>) {
  if (args.confirmLocalScan !== true) {
    throw new Error("run_scan requires confirmLocalScan=true to acknowledge local file reads and local database writes.");
  }

  const cliArgs = ["scan"];
  if (args.force === true) cliArgs.push("--force");
  if (Array.isArray(args.folders)) {
    for (const folder of args.folders) {
      if (typeof folder !== "string" || !folder.trim()) {
        throw new Error("run_scan folders must be non-empty strings.");
      }
      cliArgs.push(folder);
    }
  }
  cliArgs.push("--json");
  return cliArgs;
}

async function callTool(params: ToolCallParams) {
  const args = params.arguments ?? {};

  try {
    if (params.name === "get_capabilities") {
      return toolResult(commandJson(["agent", "--json"]));
    }
    if (params.name === "get_status") {
      return toolResult(commandJson(["status", "--json"]));
    }
    if (params.name === "run_doctor") {
      return toolResult(commandJson(["doctor", "--json"]));
    }
    if (params.name === "get_evidence") {
      const metric = stringArg(args, "metric");
      return toolResult(commandJson(metric ? ["evidence", "--json", `--metric=${metric}`] : ["evidence", "--json"]));
    }
    if (params.name === "get_repair_queue") {
      return toolResult(commandJson(["repair", "--json"]));
    }
    if (params.name === "get_report") {
      const format = stringArg(args, "format") ?? "markdown";
      const since = stringArg(args, "since");
      const cliArgs = ["report", format === "json" ? "--json" : "--markdown"];
      if (since) cliArgs.push("--since", since);
      const output = command(cliArgs);
      return toolResult(format === "json" ? JSON.parse(output) : output.trimEnd());
    }
    if (params.name === "run_scan") {
      return toolResult(commandJson(scanArgs(args)));
    }
    throw new Error(`Unknown TokenTrace MCP tool: ${params.name ?? "(missing name)"}`);
  } catch (error) {
    return toolError(error);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function handleMcpMessage(message: JsonRpcRequest) {
  const id = message.id;
  const method = message.method;

  if (!method) return jsonRpcError(id, -32600, "Invalid JSON-RPC request: missing method.");

  if (method.startsWith("notifications/")) return null;

  if (method === "initialize") {
    return jsonRpcResponse(id, {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: {
        name: "tokentrace",
        version: packageVersion()
      },
      instructions:
        "TokenTrace is local-first. Tools read local TokenTrace data; run_scan requires explicit confirmation before local file reads and database writes."
    });
  }

  if (method === "ping") {
    return jsonRpcResponse(id, {});
  }

  if (method === "tools/list") {
    return jsonRpcResponse(id, { tools: mcpTools });
  }

  if (method === "tools/call") {
    return jsonRpcResponse(id, await callTool(asObject(message.params) as ToolCallParams));
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}
