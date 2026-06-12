import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTokenTraceChatGptAppServer } from "@/src/lib/chatgpt-app/prototype";

const MCP_PATH = "/mcp";
const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);

export type ChatGptAppServerOptions = {
  hostname?: string;
  port?: number;
};

export type RunningChatGptAppServer = {
  server: Server;
  url: string;
  mcpUrl: string;
  close: () => Promise<void>;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id"
  };
}

function directMcpVisitHtml(mcpUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TokenTrace ChatGPT app prototype</title>
    <style>
      :root { color: #172026; background: #ffffff; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; padding: 24px; }
      main { max-width: 720px; display: grid; gap: 14px; }
      h1, p { margin: 0; }
      h1 { font-size: 1.25rem; }
      p { color: #52616b; line-height: 1.5; }
      code { background: #eef2f5; border: 1px solid #d8e0e6; border-radius: 6px; padding: 2px 5px; }
      pre { white-space: pre-wrap; background: #101820; color: #edf5f7; border-radius: 8px; padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>
    <main>
      <h1>TokenTrace ChatGPT app prototype</h1>
      <p>This is the MCP endpoint for ChatGPT developer mode and MCP clients, not a normal browser page.</p>
      <p>Real MCP clients must call <code>${mcpUrl}</code> with an <code>Accept</code> header that includes <code>text/event-stream</code>.</p>
      <p>For ChatGPT, expose this local server through an HTTPS tunnel and use the tunneled <code>/mcp</code> URL as the connector URL.</p>
      <pre>tokentrace chatgpt-app selftest --json
tokentrace chatgpt-app --port 8787 --hostname 127.0.0.1</pre>
    </main>
  </body>
</html>`;
}

function acceptsMcpStream(req: IncomingMessage) {
  const accept = req.headers.accept ?? "";
  return accept.includes("text/event-stream");
}

export function createChatGptAppHttpServer() {
  return createServer((req, res) => {
    void handleChatGptAppHttpRequest(req, res);
  });
}

async function handleChatGptAppHttpRequest(req: IncomingMessage, res: ServerResponse) {
  if (!req.url) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res
      .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
      .end("TokenTrace ChatGPT app prototype. Connect ChatGPT developer mode to /mcp.");
    return;
  }

  if (req.method === "GET" && url.pathname === MCP_PATH && !acceptsMcpStream(req)) {
    res
      .writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end(directMcpVisitHtml(`${url.origin}${MCP_PATH}`));
    return;
  }

  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    for (const [key, value] of Object.entries(corsHeaders())) {
      res.setHeader(key, value);
    }

    const mcpServer = createTokenTraceChatGptAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => {
      void transport.close();
      void mcpServer.close();
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling TokenTrace ChatGPT app MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not Found");
}

export async function listenChatGptAppServer(
  options: ChatGptAppServerOptions = {}
): Promise<RunningChatGptAppServer> {
  const hostname = options.hostname ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const server = createChatGptAppHttpServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, hostname, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const urlHost = hostname === "0.0.0.0" ? "127.0.0.1" : hostname;
  const url = `http://${urlHost}:${actualPort}`;

  return {
    server,
    url,
    mcpUrl: `${url}${MCP_PATH}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      })
  };
}
