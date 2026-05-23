import { describe, expect, it } from "vitest";
import { handleMcpMessage } from "@/src/lib/mcp-server";
import { mcpTools } from "@/src/lib/mcp/tools";

describe("MCP get_handoff tool", () => {
  it("registers get_handoff in the tool list", () => {
    expect(mcpTools.map((tool) => tool.name)).toContain("get_handoff");
  });

  it("responds to tools/call for get_handoff with the handoff envelope", async () => {
    const response = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_handoff", arguments: {} }
    } as unknown as Parameters<typeof handleMcpMessage>[0]);

    expect(response).toBeTruthy();
    const result = (response as { result: { content: Array<{ text: string }> } }).result;
    expect(result).toBeDefined();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.data.$schema).toBe("tokentrace.handoff.v1");
    expect(payload.summary).toMatch(/handoff/i);
    expect(payload.requiresHumanConfirmation).toBe(false);
  }, 30_000);
});
