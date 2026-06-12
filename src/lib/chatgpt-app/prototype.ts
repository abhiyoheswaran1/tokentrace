import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildMetricEvidencePack, type EvidencePack } from "@/src/lib/evidence-pack";
import { evidenceMetrics, type EvidenceMetric } from "@/src/lib/evidence/metrics";
import { registryName } from "@/src/lib/mcp/types";

export const CHATGPT_APP_TOOL_NAME = "get_redacted_evidence_pack";
export const CHATGPT_APP_WIDGET_URI = "ui://tokentrace/evidence-pack.html";

type ChatGptEvidencePackArgs = {
  metric?: EvidenceMetric;
};

type TextContent = {
  type: "text";
  text: string;
};

export type ChatGptEvidencePackToolResult = {
  structuredContent: {
    summary: string;
    pack: EvidencePack;
  };
  content: TextContent[];
  _meta: {
    widgetMode: "evidence-pack-summary";
    rawContentIncluded: false;
    redactionPolicy: EvidencePack["redaction"]["rawContentPolicy"];
    sourceFileCount: number;
    recordCount: number;
  };
};

const metricEnumValues = evidenceMetrics as [EvidenceMetric, ...EvidenceMetric[]];

const metricInputSchema = {
  metric: z.enum(metricEnumValues).optional()
};

const evidencePackOutputSchema = {
  summary: z.string(),
  pack: z.object({
    schemaVersion: z.literal("tokentrace.evidence-pack.v1")
  }).passthrough()
};

const jsonMetricInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    metric: {
      type: "string",
      enum: evidenceMetrics,
      description: "Evidence metric to export. Defaults to processed-tokens."
    }
  }
};

const jsonEvidencePackOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    pack: {
      type: "object",
      additionalProperties: true,
      properties: {
        schemaVersion: { const: "tokentrace.evidence-pack.v1" },
        redaction: {
          type: "object",
          properties: {
            rawContentIncluded: { const: false },
            rawContentPolicy: { const: "excluded by default" }
          }
        }
      },
      required: ["schemaVersion", "redaction"]
    }
  },
  required: ["summary", "pack"]
};

export function chatGptAppToolDescriptors() {
  return [
    {
      name: CHATGPT_APP_TOOL_NAME,
      title: "Get redacted evidence pack",
      description:
        "Return a selected TokenTrace evidence pack for ChatGPT review. The pack is read-only and excludes raw prompts, completions, and message bodies.",
      inputSchema: jsonMetricInputSchema,
      outputSchema: jsonEvidencePackOutputSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false
      },
      _meta: {
        ui: { resourceUri: CHATGPT_APP_WIDGET_URI },
        "openai/outputTemplate": CHATGPT_APP_WIDGET_URI,
        "openai/toolInvocation/invoking": "Preparing redacted evidence pack...",
        "openai/toolInvocation/invoked": "Redacted evidence pack ready."
      }
    }
  ];
}

export function chatGptAppWidgetResource() {
  return {
    uri: CHATGPT_APP_WIDGET_URI,
    mimeType: RESOURCE_MIME_TYPE,
    text: widgetHtml(),
    _meta: {
      ui: {
        csp: {
          connectDomains: [],
          resourceDomains: []
        }
      },
      "openai/widgetDescription": "Shows a redacted TokenTrace evidence pack summary with totals and confidence drivers."
    }
  };
}

export async function buildChatGptEvidencePackToolResult(
  args: ChatGptEvidencePackArgs = {}
): Promise<ChatGptEvidencePackToolResult> {
  const metric = args.metric ?? "processed-tokens";
  const pack = buildMetricEvidencePack({ metric });
  const summary = [
    `Redacted TokenTrace evidence pack for ${pack.scope.label}.`,
    `Raw content included: ${pack.redaction.rawContentIncluded ? "yes" : "no"}.`,
    `Records: ${pack.records.length.toLocaleString()}; source files: ${pack.sourceFiles.length.toLocaleString()}.`
  ].join(" ");

  return {
    structuredContent: {
      summary,
      pack
    },
    content: [
      {
        type: "text",
        text: `Prepared a redacted evidence pack for ${pack.scope.label}. Raw prompts and message bodies are excluded.`
      }
    ],
    _meta: {
      widgetMode: "evidence-pack-summary",
      rawContentIncluded: false,
      redactionPolicy: pack.redaction.rawContentPolicy,
      sourceFileCount: pack.sourceFiles.length,
      recordCount: pack.records.length
    }
  };
}

export function createTokenTraceChatGptAppServer() {
  const [descriptor] = chatGptAppToolDescriptors();
  if (!descriptor) throw new Error("TokenTrace ChatGPT app tool descriptor is missing.");

  const server = new McpServer(
    {
      name: "tokentrace-chatgpt-app",
      version: "0.1.0"
    },
    {
      instructions:
        "TokenTrace is local-first. Use get_redacted_evidence_pack only for selected, redacted evidence exports; do not request raw prompts or local message bodies."
    }
  );

  registerAppResource(
    server,
    "TokenTrace evidence pack widget",
    CHATGPT_APP_WIDGET_URI,
    {
      description: "Compact redacted evidence-pack summary for ChatGPT developer-mode testing.",
      _meta: chatGptAppWidgetResource()._meta
    },
    async () => ({
      contents: [chatGptAppWidgetResource()]
    })
  );

  registerAppTool(
    server,
    CHATGPT_APP_TOOL_NAME,
    {
      title: "Get redacted evidence pack",
      description:
        "Return a selected TokenTrace evidence pack for ChatGPT review. The pack is read-only and excludes raw prompts, completions, and message bodies.",
      inputSchema: metricInputSchema,
      outputSchema: evidencePackOutputSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false
      },
      _meta: descriptor._meta
    },
    async (args) => buildChatGptEvidencePackToolResult(args)
  );

  return server;
}

function check(id: string, detail: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => ({ id, ok: true, detail }))
    .catch((error) => ({
      id,
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    }));
}

export async function runChatGptAppSelfTest() {
  const checks = [];

  checks.push(
    await check("tool-descriptor", "Tool descriptor advertises a read-only Apps SDK evidence-pack tool.", () => {
      const [tool] = chatGptAppToolDescriptors();
      if (tool?.name !== CHATGPT_APP_TOOL_NAME) throw new Error("missing get_redacted_evidence_pack tool");
      if (tool._meta.ui.resourceUri !== CHATGPT_APP_WIDGET_URI) throw new Error("tool is missing widget URI");
      if (tool.annotations.readOnlyHint !== true) throw new Error("tool is not marked read-only");
      if (tool.annotations.openWorldHint !== false) throw new Error("tool openWorldHint must be false");
      if (tool.annotations.destructiveHint !== false) throw new Error("tool destructiveHint must be false");
    })
  );

  checks.push(
    await check("widget-resource", "Widget resource is a text/html;profile=mcp-app document.", () => {
      const resource = chatGptAppWidgetResource();
      if (resource.mimeType !== RESOURCE_MIME_TYPE) throw new Error("widget resource has wrong MIME type");
      if (!resource.text.includes("ui/notifications/tool-result")) {
        throw new Error("widget does not listen for MCP Apps tool results");
      }
    })
  );

  checks.push(
    await check("tool-result", "Tool result returns a redacted evidence-pack payload.", async () => {
      const result = await buildChatGptEvidencePackToolResult();
      if (result.structuredContent.pack.schemaVersion !== "tokentrace.evidence-pack.v1") {
        throw new Error("tool result has the wrong evidence-pack schema");
      }
      if (result.structuredContent.pack.redaction.rawContentIncluded !== false) {
        throw new Error("tool result must not include raw content");
      }
    })
  );

  checks.push(
    await check("server-registration", "MCP server can be constructed with Apps SDK tool and resource registrations.", () => {
      const server = createTokenTraceChatGptAppServer();
      void server.close();
    })
  );

  return {
    ok: checks.every((entry) => entry.ok),
    registryName,
    app: "TokenTrace ChatGPT app prototype",
    mcpPath: "/mcp",
    widgetUri: CHATGPT_APP_WIDGET_URI,
    tools: chatGptAppToolDescriptors().map((tool) => tool.name),
    mutatedLocalState: false,
    checks
  };
}

function widgetHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TokenTrace Evidence Pack</title>
    <style>
      :root {
        color: #172026;
        background: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 16px;
        color: #172026;
        background: #ffffff;
      }
      main {
        display: grid;
        gap: 14px;
        max-width: 680px;
      }
      h1, h2, p {
        margin: 0;
      }
      h1 {
        font-size: 1rem;
        font-weight: 680;
      }
      h2 {
        font-size: 0.78rem;
        font-weight: 680;
        color: #41515c;
        text-transform: uppercase;
      }
      .summary {
        display: grid;
        gap: 6px;
      }
      .summary p {
        color: #52616b;
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .metric {
        border: 1px solid #d9e0e6;
        border-radius: 8px;
        padding: 10px;
        min-width: 0;
      }
      .metric span {
        display: block;
        color: #5d6c76;
        font-size: 0.74rem;
      }
      .metric strong {
        display: block;
        margin-top: 4px;
        font-size: 1rem;
        font-weight: 700;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: #36464f;
        font-size: 0.86rem;
        line-height: 1.45;
      }
      .empty {
        color: #6d7a83;
        font-size: 0.86rem;
      }
      .badge {
        width: fit-content;
        border: 1px solid #bfd8c5;
        border-radius: 999px;
        padding: 3px 8px;
        color: #1f6b3b;
        background: #f3fbf5;
        font-size: 0.76rem;
        font-weight: 620;
      }
      @media (max-width: 440px) {
        body {
          padding: 12px;
        }
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="summary">
        <span class="badge" id="redaction">rawContentIncluded: false</span>
        <h1 id="title">TokenTrace evidence pack</h1>
        <p id="summary">Waiting for a redacted evidence pack.</p>
      </section>
      <section class="grid" aria-label="Evidence pack totals">
        <div class="metric"><span>Tokens</span><strong id="tokens">0</strong></div>
        <div class="metric"><span>Cost</span><strong id="cost">$0.00</strong></div>
        <div class="metric"><span>Sessions</span><strong id="sessions">0</strong></div>
        <div class="metric"><span>Interactions</span><strong id="interactions">0</strong></div>
      </section>
      <section>
        <h2>Confidence drivers</h2>
        <ul id="drivers"><li class="empty">No evidence loaded yet.</li></ul>
      </section>
      <section>
        <h2>Source files</h2>
        <p class="empty" id="sources">No source-file metadata loaded yet.</p>
      </section>
    </main>
    <script>
      const state = { pack: window.openai?.toolOutput?.pack ?? null, summary: window.openai?.toolOutput?.summary ?? "" };
      const nf = new Intl.NumberFormat();
      const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

      function setText(id, value) {
        document.getElementById(id).textContent = value;
      }

      function renderDrivers(items) {
        const list = document.getElementById("drivers");
        list.textContent = "";
        if (!items || items.length === 0) {
          const item = document.createElement("li");
          item.className = "empty";
          item.textContent = "No confidence drivers reported.";
          list.appendChild(item);
          return;
        }
        for (const value of items.slice(0, 6)) {
          const item = document.createElement("li");
          item.textContent = value;
          list.appendChild(item);
        }
      }

      function render() {
        const pack = state.pack;
        if (!pack) return;
        setText("title", pack.scope?.label ? "Evidence: " + pack.scope.label : "TokenTrace evidence pack");
        setText("summary", state.summary || "Redacted evidence pack loaded.");
        setText("tokens", nf.format(pack.totals?.tokens ?? 0));
        setText("cost", usd.format(pack.totals?.cost ?? 0));
        setText("sessions", nf.format(pack.totals?.sessions ?? 0));
        setText("interactions", nf.format(pack.totals?.interactions ?? 0));
        setText("redaction", "rawContentIncluded: " + String(pack.redaction?.rawContentIncluded === true));
        renderDrivers(pack.confidenceDrivers);
        setText("sources", nf.format(pack.sourceFiles?.length ?? 0) + " source file(s); " + nf.format(pack.records?.length ?? 0) + " record(s).");
      }

      window.addEventListener("message", (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;
        if (message.method !== "ui/notifications/tool-result") return;
        const data = message.params?.structuredContent;
        state.pack = data?.pack ?? null;
        state.summary = data?.summary ?? "";
        render();
      }, { passive: true });

      render();
    </script>
  </body>
</html>`;
}
