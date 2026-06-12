import { listenChatGptAppServer } from "@/src/lib/chatgpt-app/server";
import { runChatGptAppSelfTest } from "@/src/lib/chatgpt-app/prototype";

function usage() {
  return `TokenTrace ChatGPT app prototype

Usage:
  tokentrace chatgpt-app
  tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1
  tokentrace chatgpt-app selftest --json

Options:
  -p, --port <port>          Local HTTP port. Defaults to 8787.
  -H, --hostname <host>      Local bind host. Defaults to 127.0.0.1.
  -h, --help                 Print help

ChatGPT developer mode requires an HTTPS-reachable /mcp URL. For local testing,
start this server and expose it with a secure tunnel.`;
}

function readPort(value: string | undefined) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid --port value: ${value ?? "(missing)"}`);
  }
  return port;
}

function parseServeArgs(args: string[]) {
  const options: { hostname: string; port: number } = {
    hostname: "127.0.0.1",
    port: Number(process.env.TOKENTRACE_CHATGPT_APP_PORT ?? process.env.PORT ?? 8787)
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (arg === "--port" || arg === "-p") {
      options.port = readPort(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg?.startsWith("--port=")) {
      options.port = readPort(arg.slice("--port=".length));
      continue;
    }
    if (arg === "--hostname" || arg === "-H") {
      const hostname = args[index + 1];
      if (!hostname) throw new Error("Missing --hostname value.");
      options.hostname = hostname;
      index += 1;
      continue;
    }
    if (arg?.startsWith("--hostname=")) {
      const hostname = arg.slice("--hostname=".length);
      if (!hostname) throw new Error("Missing --hostname value.");
      options.hostname = hostname;
      continue;
    }
    throw new Error(`Unknown chatgpt-app argument: ${arg}`);
  }

  return options;
}

const args = process.argv.slice(2);

if (args[0] === "selftest") {
  if (args.length > 2 || (args[1] && args[1] !== "--json")) {
    console.error("Usage: tokentrace chatgpt-app selftest --json");
    process.exit(1);
  }

  const result = await runChatGptAppSelfTest();
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(result.ok ? "TokenTrace ChatGPT app self-test passed.\n" : "TokenTrace ChatGPT app self-test failed.\n");
  }
  process.exit(result.ok ? 0 : 1);
}

try {
  const options = parseServeArgs(args);
  const running = await listenChatGptAppServer(options);
  console.log(`TokenTrace ChatGPT app prototype listening on ${running.mcpUrl}`);
  console.log("For ChatGPT developer mode, expose this local server through an HTTPS tunnel and use the /mcp URL.");

  const shutdown = async () => {
    await running.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

