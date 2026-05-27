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
    name: "get_handoff",
    title: "Get agent handoff envelope",
    description:
      "Return the schema-versioned tokentrace.handoff.v1 envelope summarizing local scan state, repair queue, confidence, recent agent actions, and suggested next actions. Pure read; no scan.",
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
  },
  {
    name: "get_anomalies",
    title: "Get local usage anomalies",
    description:
      "Return modified-z-score (MAD) anomalies for the local daily token and cost trend. Pure-stats detector; spends zero AI tokens.",
    inputSchema: toolInputSchema({
      window: {
        type: "integer",
        minimum: 3,
        maximum: 60,
        description: "Trailing window size in days (default 14)."
      },
      metric: {
        type: "string",
        enum: ["tokens", "cost", "all"],
        description: "Filter anomalies to a specific metric. Defaults to 'all'."
      }
    })
  },
  {
    name: "query_usage",
    title: "Run a structured local usage query",
    description:
      "Run a deterministic, parameterized query over the local TokenTrace database. The caller supplies structured arguments; TokenTrace executes the SQL. No NL parsing happens server-side, so zero AI tokens are spent.",
    inputSchema: toolInputSchema(
      {
        groupBy: {
          type: "string",
          enum: ["model", "project", "tool", "session", "day"],
          description: "Grouping dimension."
        },
        metric: {
          type: "string",
          enum: ["cost", "totalTokens", "interactions"],
          description: "Metric to aggregate per group."
        },
        range: {
          type: "object",
          additionalProperties: false,
          properties: {
            preset: {
              type: "string",
              enum: ["today", "7d", "30d", "60d", "90d", "all"],
              description: "Preset window. Mutually exclusive with from/to."
            },
            from: { type: "string", description: "ISO date inclusive lower bound." },
            to: { type: "string", description: "ISO date exclusive upper bound." }
          }
        },
        filters: {
          type: "object",
          additionalProperties: false,
          properties: {
            model: { type: "string" },
            project: { type: "string" },
            tool: { type: "string" }
          }
        },
        topN: { type: "integer", minimum: 1, maximum: 200, description: "Default 20." },
        sort: { type: "string", enum: ["asc", "desc"], description: "Default 'desc'." }
      },
      ["groupBy", "metric"]
    )
  },
  {
    name: "get_classifications",
    title: "Get unknown-cost auto-classifications",
    description:
      "Return the local unknown-cost repair queue with deterministic classification suggestions (exact-model, family-fragment, or parser-source). Read-only; spends zero AI tokens.",
    inputSchema: toolInputSchema({
      minConfidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Filter to suggestions with confidence >= this value (default 0)."
      }
    })
  }
];
