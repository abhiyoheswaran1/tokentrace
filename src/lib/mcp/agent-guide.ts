import { registryName } from "@/src/lib/mcp/types";

export function agentGuide() {
  const agentsMdBlock = [
    "Before reporting AI token, cost, model, or session usage, use TokenTrace through MCP.",
    "Start with get_agent_guide, get_status, and run_doctor.",
    "Use get_evidence before making numeric usage or cost claims.",
    "Use get_repair_queue when costs are unknown or model-rate coverage is incomplete.",
    "Only call run_scan when the human expects a local filesystem scan, and pass confirmLocalScan=true.",
    "Never request raw prompts or message bodies through normal TokenTrace workflows."
  ].join("\n");

  return {
    registryName,
    npmCommand: ["npx", "tokentrace", "mcp"],
    localCommand: ["tokentrace", "mcp"],
    selfTestCommand: ["tokentrace", "mcp", "selftest", "--json"],
    workflow: [
      {
        tool: "get_capabilities",
        purpose: "Discover the installed TokenTrace command contract, privacy model, workflows, and guardrails.",
        requiresHumanConfirmation: false
      },
      {
        tool: "get_status",
        purpose: "Check the current local usage snapshot before deciding whether data is fresh enough.",
        requiresHumanConfirmation: false
      },
      {
        tool: "run_doctor",
        purpose: "Inspect Scan Health, parser trust, source coverage, package trust, and repair recommendations.",
        requiresHumanConfirmation: false
      },
      {
        tool: "get_evidence",
        purpose: "Ground token, cost, session, guardrail, and unknown-cost claims in local evidence.",
        requiresHumanConfirmation: false
      },
      {
        tool: "get_repair_queue",
        purpose: "Explain unknown-cost causes and the next best repair path before making cost claims.",
        requiresHumanConfirmation: false
      },
      {
        tool: "get_handoff",
        purpose: "Get a structured tokentrace.handoff.v1 envelope summarizing local state for the next agent.",
        requiresHumanConfirmation: false
      },
      {
        tool: "get_report",
        purpose: "Produce a deterministic local report for summaries, check-ins, and handoffs.",
        requiresHumanConfirmation: false
      },
      {
        tool: "run_scan",
        purpose: "Refresh local usage data only when the human expects a filesystem scan.",
        requiresHumanConfirmation: true
      }
    ],
    recipes: [
      {
        id: "usage-health",
        title: "Check local AI usage health",
        tools: ["get_status", "run_doctor", "get_evidence"]
      },
      {
        id: "usage-spike",
        title: "Explain a token or cost spike",
        tools: ["run_doctor", "get_evidence", "get_report"]
      },
      {
        id: "unknown-cost",
        title: "Find why costs are unknown",
        tools: ["run_doctor", "get_repair_queue", "get_evidence"]
      },
      {
        id: "fresh-scan",
        title: "Refresh local data after human confirmation",
        tools: ["run_scan", "run_doctor", "get_report"]
      }
    ],
    guardrails: [
      "TokenTrace is local-first: no telemetry, cloud sync, proxying, packet capture, or browser-extension scraping.",
      "MCP startup is read-only and does not scan files.",
      "run_scan requires confirmLocalScan=true before local file reads and local database writes.",
      "Use get_evidence before reporting numeric token, cost, model, or session claims.",
      "Do not describe processed tokens as current context size; use ctx for live context-window pressure."
    ],
    agentsMdBlock
  };
}
