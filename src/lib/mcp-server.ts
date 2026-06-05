import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { agentGuide } from "@/src/lib/mcp/agent-guide";
import { HumanConfirmationError, parseToolResponse, toolError, toolResult } from "@/src/lib/mcp/envelope";
import { mcpTools } from "@/src/lib/mcp/tools";
import { protocolVersion, registryName } from "@/src/lib/mcp/types";

export { mcpTools } from "@/src/lib/mcp/tools";

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

function packageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : "unknown";
  } catch {
    return "unknown";
  }
}

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
  const output = command(args);
  try {
    return JSON.parse(output);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`tokentrace ${args.join(" ")} returned invalid JSON: ${detail}`);
  }
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function queryUsageArgs(args: Record<string, unknown>) {
  const cliArgs: string[] = ["query"];
  const groupBy = stringArg(args, "groupBy");
  const metric = stringArg(args, "metric");
  if (!groupBy) throw new Error("query_usage requires a groupBy argument.");
  if (!metric) throw new Error("query_usage requires a metric argument.");
  cliArgs.push("--group-by", groupBy, "--metric", metric);

  const range = args.range && typeof args.range === "object" ? (args.range as Record<string, unknown>) : null;
  if (range) {
    const preset = stringArg(range, "preset");
    const from = stringArg(range, "from");
    const to = stringArg(range, "to");
    if (preset) cliArgs.push("--range", preset);
    if (from) cliArgs.push("--from", from);
    if (to) cliArgs.push("--to", to);
  }

  const filters = args.filters && typeof args.filters === "object" ? (args.filters as Record<string, unknown>) : null;
  if (filters) {
    const model = stringArg(filters, "model");
    const project = stringArg(filters, "project");
    const tool = stringArg(filters, "tool");
    if (model) cliArgs.push("--model", model);
    if (project) cliArgs.push("--project", project);
    if (tool) cliArgs.push("--tool", tool);
  }

  if (typeof args.topN === "number" && Number.isInteger(args.topN)) {
    cliArgs.push(`--top=${args.topN}`);
  }
  const sort = stringArg(args, "sort");
  if (sort) cliArgs.push(`--sort=${sort}`);
  cliArgs.push("--json");
  return cliArgs;
}

function scanArgs(args: Record<string, unknown>) {
  if (args.confirmLocalScan !== true) {
    throw new HumanConfirmationError(
      "run_scan requires confirmLocalScan=true to acknowledge local file reads and local database writes."
    );
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
    if (params.name === "get_agent_guide") {
      return toolResult(agentGuide(), {
        summary: "Returned the recommended TokenTrace MCP operating loop for agents.",
        confidence: "high",
        nextActions: [
          "Call get_status to inspect the current local usage snapshot.",
          "Call run_doctor before reporting data quality, parser trust, or cost confidence.",
          "Call get_evidence before making numeric usage or cost claims."
        ],
        warnings: [],
        evidence: [
          {
            label: "MCP registry server name",
            tool: registryName
          },
          {
            label: "Local stdio command",
            command: ["tokentrace", "mcp"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_capabilities") {
      return toolResult(commandJson(["agent", "--json"]), {
        summary: "Returned the TokenTrace agent discovery manifest.",
        confidence: "high",
        nextActions: [
          "Call get_status for the current local usage snapshot.",
          "Call run_doctor before making trust or cost-confidence claims."
        ],
        warnings: [],
        evidence: [
          {
            label: "Agent discovery manifest",
            command: ["tokentrace", "agent", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_status") {
      return toolResult(commandJson(["status", "--json"]), {
        summary: "Returned the current local TokenTrace status snapshot.",
        confidence: "medium",
        nextActions: [
          "Call run_doctor to validate freshness, parser trust, and repair recommendations.",
          "Call get_evidence before reporting totals."
        ],
        warnings: ["Status reflects the current local database; run_scan is needed only when the human expects a refresh."],
        evidence: [
          {
            label: "Local status JSON",
            command: ["tokentrace", "status", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "run_doctor") {
      return toolResult(commandJson(["doctor", "--json"]), {
        summary: "Returned Scan Health, parser trust, source coverage, and repair recommendations.",
        confidence: "high",
        nextActions: [
          "Call get_repair_queue if doctor reports unknown-cost or model-rate gaps.",
          "Call get_evidence before making token, cost, or session claims."
        ],
        warnings: [],
        evidence: [
          {
            label: "Scan Health JSON",
            command: ["tokentrace", "doctor", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_evidence") {
      const metric = stringArg(args, "metric");
      return toolResult(commandJson(metric ? ["evidence", "--json", `--metric=${metric}`] : ["evidence", "--json"]), {
        summary: `Returned TokenTrace evidence${metric ? ` for ${metric}` : ""}.`,
        confidence: "high",
        nextActions: [
          "Use the evidence totals and confidence labels when reporting usage.",
          "Call get_repair_queue if the evidence shows unknown cost."
        ],
        warnings: [],
        evidence: [
          {
            label: "Metric evidence JSON",
            command: metric ? ["tokentrace", "evidence", "--json", `--metric=${metric}`] : ["tokentrace", "evidence", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_repair_queue") {
      return toolResult(commandJson(["repair", "--json"]), {
        summary: "Returned the unknown-cost repair queue.",
        confidence: "high",
        nextActions: [
          "Use the top repair cause and next best repair before making cost claims.",
          "Call get_evidence with metric=unknown-cost for source-backed details."
        ],
        warnings: [],
        evidence: [
          {
            label: "Unknown-cost repair queue",
            command: ["tokentrace", "repair", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_handoff") {
      const envelope = commandJson(["agent", "--handoff", "--json"]);
      return toolResult(envelope, {
        summary: "Returned the tokentrace.handoff.v1 envelope for the next agent.",
        confidence: "high",
        nextActions: [
          "Read suggestedNextActions for the recommended local commands.",
          "Call get_evidence before quoting any numeric claim from the envelope."
        ],
        warnings: [],
        evidence: [
          {
            label: "Agent handoff envelope",
            command: ["tokentrace", "agent", "--handoff", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_report") {
      const format = stringArg(args, "format") ?? "markdown";
      const since = stringArg(args, "since");
      const cliArgs = ["report", format === "json" ? "--json" : "--markdown"];
      if (since) cliArgs.push("--since", since);
      const output = command(cliArgs);
      return toolResult(format === "json" ? JSON.parse(output) : { format: "markdown", report: output.trimEnd() }, {
        summary: `Returned a local TokenTrace ${format === "json" ? "JSON" : "Markdown"} report.`,
        confidence: "high",
        nextActions: [
          "Use this report for handoffs after checking Scan Health.",
          "Call get_evidence for any numeric claim that needs source details."
        ],
        warnings: [],
        evidence: [
          {
            label: "Local report",
            command: cliArgs
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "run_scan") {
      return toolResult(commandJson(scanArgs(args)), {
        summary: "Local scan completed after explicit confirmation.",
        confidence: "high",
        nextActions: [
          "Call run_doctor to inspect Scan Health after the scan.",
          "Call get_report or get_evidence before summarizing updated totals."
        ],
        warnings: [],
        evidence: [
          {
            label: "Local scan JSON",
            command: ["tokentrace", "scan", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_anomalies") {
      const cliArgs = ["anomalies", "--json"];
      if (typeof args.window === "number" && Number.isInteger(args.window)) {
        cliArgs.push(`--window=${args.window}`);
      }
      const metric = stringArg(args, "metric");
      if (metric) cliArgs.push(`--metric=${metric}`);
      return toolResult(commandJson(cliArgs), {
        summary: "Returned the local daily-trend anomaly report (modified-z-score, MAD detector). Zero AI tokens spent.",
        confidence: "high",
        nextActions: [
          "Inspect anomalies[] for severity, metric, and date.",
          "Call get_evidence before reporting any underlying cost or token totals."
        ],
        warnings: [],
        evidence: [
          {
            label: "Local anomaly report",
            command: ["tokentrace", "anomalies", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "query_usage") {
      const cliArgs = queryUsageArgs(args);
      return toolResult(commandJson(cliArgs), {
        summary: "Returned a structured local usage query result. No natural-language parsing happened server-side.",
        confidence: "high",
        nextActions: [
          "Use rows[] for deterministic group-by aggregations.",
          "Call get_evidence before quoting individual numbers."
        ],
        warnings: [],
        evidence: [
          {
            label: "Structured local query",
            command: ["tokentrace", ...cliArgs]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    if (params.name === "get_classifications") {
      const cliArgs = ["repair", "auto-classify", "--json"];
      if (typeof args.minConfidence === "number" && Number.isFinite(args.minConfidence)) {
        cliArgs.push(`--min-confidence=${args.minConfidence}`);
      }
      return toolResult(commandJson(cliArgs), {
        summary: "Returned local unknown-cost groups with deterministic classification suggestions.",
        confidence: "high",
        nextActions: [
          "Inspect each group's classification field for suggestedModel and confidence.",
          "Call `tokentrace repair auto-classify --apply --min-confidence=0.9` only after a human approves the suggestions."
        ],
        warnings: ["Suggestions are advisory; --apply writes to the local parser-override store."],
        evidence: [
          {
            label: "Local classification suggestions",
            command: ["tokentrace", "repair", "auto-classify", "--json"]
          }
        ],
        requiresHumanConfirmation: false
      });
    }
    throw new Error(`Unknown TokenTrace MCP tool: ${params.name ?? "(missing name)"}`);
  } catch (error) {
    return toolError(error);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function selfTestCheck(id: string, detail: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => ({ id, ok: true, detail }))
    .catch((error) => ({
      id,
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    }));
}

export async function runMcpSelfTest() {
  const checks = [];
  let listedTools: string[] = [];

  checks.push(
    await selfTestCheck("initialize", "MCP initialize returns TokenTrace server metadata.", async () => {
      const response = await handleMcpMessage({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion }
      });
      const serverInfo = (response as { result?: { serverInfo?: { name?: string } } }).result?.serverInfo;
      if (serverInfo?.name !== "tokentrace") throw new Error("initialize did not return tokentrace serverInfo.");
    })
  );

  checks.push(
    await selfTestCheck("tools-list", "MCP tools/list exposes agent guide and local scan guardrails.", async () => {
      const response = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      listedTools =
        (response as { result?: { tools?: Array<{ name?: string }> } }).result?.tools
          ?.map((tool) => tool.name)
          .filter((name): name is string => Boolean(name)) ?? [];
      if (!listedTools.includes("get_agent_guide")) throw new Error("tools/list is missing get_agent_guide.");
      if (!listedTools.includes("run_scan")) throw new Error("tools/list is missing run_scan.");
    })
  );

  checks.push(
    await selfTestCheck("agent-guide", "get_agent_guide returns registry, npm, workflow, and guardrail instructions.", async () => {
      const response = await handleMcpMessage({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_agent_guide", arguments: {} }
      });
      const payload = parseToolResponse(response);
      const data = payload.data as { registryName?: string; workflow?: Array<{ tool?: string }> };
      if (data.registryName !== registryName) throw new Error("Agent guide registryName is incorrect.");
      if (!data.workflow?.some((step) => step.tool === "get_evidence")) {
        throw new Error("Agent guide workflow is missing get_evidence.");
      }
    })
  );

  checks.push(
    await selfTestCheck("scan-confirmation-refusal", "run_scan refuses to scan without confirmLocalScan=true.", async () => {
      const response = await handleMcpMessage({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "run_scan", arguments: {} }
      });
      const result = (response as { result?: { isError?: boolean } }).result;
      const payload = parseToolResponse(response);
      if (result?.isError !== true) throw new Error("run_scan without confirmation did not return an MCP tool error.");
      if (payload.requiresHumanConfirmation !== true) {
        throw new Error("run_scan refusal did not mark requiresHumanConfirmation.");
      }
    })
  );

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    protocolVersion,
    server: "tokentrace",
    registryName,
    mutatedLocalState: false,
    tools: listedTools,
    checks
  };
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
