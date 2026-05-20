import type { ToolEnvelope } from "@/src/lib/mcp/types";

export class HumanConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HumanConfirmationError";
  }
}

function toolEnvelope(envelope: Omit<ToolEnvelope, "data"> & { data: unknown }): ToolEnvelope {
  return {
    summary: envelope.summary,
    confidence: envelope.confidence,
    nextActions: envelope.nextActions,
    warnings: envelope.warnings,
    evidence: envelope.evidence,
    requiresHumanConfirmation: envelope.requiresHumanConfirmation,
    data: envelope.data
  };
}

export function toolResult(value: unknown, metadata: Omit<ToolEnvelope, "data">) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(toolEnvelope({ ...metadata, data: value }), null, 2)
      }
    ]
  };
}

export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const requiresHumanConfirmation = error instanceof HumanConfirmationError;
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          toolEnvelope({
            summary: message,
            confidence: "high",
            nextActions: requiresHumanConfirmation
              ? ["Ask the human for explicit local scan confirmation, then call run_scan with confirmLocalScan=true."]
              : ["Inspect the error and retry the same TokenTrace MCP tool only after correcting the arguments."],
            warnings: requiresHumanConfirmation
              ? ["run_scan performs local file reads and local database writes only after explicit confirmation."]
              : [message],
            evidence: [
              {
                label: "TokenTrace MCP tool error",
                tool: "tools/call"
              }
            ],
            requiresHumanConfirmation,
            data: {
              error: message
            }
          }),
          null,
          2
        )
      }
    ]
  };
}

export function parseToolResponse(response: unknown) {
  const text = (response as { result?: { content?: Array<{ text?: string }> } }).result?.content?.[0]?.text;
  if (!text) throw new Error("MCP tool response did not include text content.");
  return JSON.parse(text) as ToolEnvelope;
}
