import { createInterface } from "node:readline";
import { handleMcpMessage, jsonRpcError, runMcpSelfTest } from "@/src/lib/mcp-server";

function write(message: unknown) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const args = process.argv.slice(2);

if (args[0] === "selftest") {
  if (args.length > 2 || (args[1] && args[1] !== "--json")) {
    console.error("Usage: tokentrace mcp selftest --json");
    process.exit(1);
  }
  const result = await runMcpSelfTest();
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(result.ok ? "TokenTrace MCP self-test passed.\n" : "TokenTrace MCP self-test failed.\n");
  }
  process.exit(result.ok ? 0 : 1);
}

if (args.length) {
  console.error("Usage: tokentrace mcp");
  console.error("   or: tokentrace mcp selftest --json");
  process.exit(1);
}

async function handleLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message: unknown;
  try {
    message = JSON.parse(trimmed);
  } catch {
    write(jsonRpcError(null, -32700, "Parse error: expected one JSON-RPC message per line."));
    return;
  }

  const response = await handleMcpMessage(message as Parameters<typeof handleMcpMessage>[0]);
  if (response) write(response);
}

const reader = createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

let queue = Promise.resolve();

reader.on("line", (line) => {
  queue = queue.then(() => handleLine(line)).catch((error) => {
    write(jsonRpcError(null, -32603, error instanceof Error ? error.message : String(error)));
  });
});

reader.on("close", () => {
  queue.finally(() => process.exit(0));
});
