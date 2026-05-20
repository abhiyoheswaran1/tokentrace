import { createInterface } from "node:readline";
import { handleMcpMessage, jsonRpcError } from "@/src/lib/mcp-server";

function write(message: unknown) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
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
