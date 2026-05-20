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
    name: "get_agent_guide",
    title: "Get TokenTrace agent guide",
    description:
      "Return the recommended MCP operating loop, install snippets, copy-paste AGENTS.md guidance, and local-first guardrails.",
    inputSchema: toolInputSchema()
  },
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
