import { spawn } from "node:child_process";
import getPort, { portNumbers } from "get-port";
import open from "open";
import { serveHelp } from "./help.js";
import { ensureDashboardBuild, initializeDatabase } from "./runtime.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

export function parseServeOptions(args, env = process.env) {
  const options = {
    help: false,
    hostname: env.TOKENTRACE_HOSTNAME ?? "127.0.0.1",
    port:
      env.TOKENTRACE_PORT || env.PORT
        ? parsePort(env.TOKENTRACE_PORT ?? env.PORT)
        : null,
    openBrowser: env.TOKENTRACE_NO_OPEN !== "1" && env.CI !== "true"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--no-open") {
      options.openBrowser = false;
      continue;
    }
    if (arg === "--port" || arg === "-p") {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a port value.`);
      options.port = parsePort(value);
      index += 1;
      continue;
    }
    if (arg === "--hostname" || arg === "-H") {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a hostname value.`);
      options.hostname = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown serve option: ${arg}`);
  }

  return options;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`TokenTrace server exited with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // Keep polling until the server is ready or the timeout expires.
    }
    await sleep(300);
  }
  throw new Error("Timed out waiting for the TokenTrace server to start.");
}

export function startupProgress(step, detail = "") {
  console.log(detail ? `TokenTrace: ${step} - ${detail}` : `TokenTrace: ${step}`);
}

export function formatServeError(error, options = {}) {
  const message = error instanceof Error ? error.message : "Failed to start TokenTrace.";
  const lines = [`TokenTrace serve failed: ${message}`];
  if (/EADDRINUSE|address already in use|Requested port .* busy|port .*busy/i.test(message)) {
    const port = options.port == null ? "the configured port" : options.port;
    const host = options.hostname ? ` on ${options.hostname}` : "";
    lines.push(`Requested port ${port} is busy${host}.`);
    lines.push("Try: tokentrace serve --port 3211 --no-open");
    lines.push("Or omit --port to let TokenTrace choose an available local port.");
  }
  if (/Timed out waiting/i.test(message)) {
    lines.push("The dashboard process started but did not answer health checks within 30 seconds.");
  }
  return lines.join("\n");
}

export async function resolveServePort(options) {
  if (options.port != null) {
    const availablePort = await getPort({ port: options.port, host: options.hostname });
    if (availablePort !== options.port) {
      throw new Error(`Requested port ${options.port} is busy on ${options.hostname}.`);
    }
    return { port: options.port, fixed: true };
  }

  const port = await getPort({ port: portNumbers(3030, 3999), host: options.hostname });
  return { port, fixed: false };
}

export async function serve(context, args = []) {
  const options = parseServeOptions(args);
  if (options.help) {
    console.log(serveHelp());
    return;
  }

  const hostname = options.hostname;
  let port = options.port;
  let child = null;

  try {
    let resolvedPort = null;
    if (options.port != null) {
      resolvedPort = await resolveServePort(options);
      port = resolvedPort.port;
    }
    startupProgress("Preparing local database", context.appDataDir());
    await initializeDatabase(context);
    startupProgress("Checking dashboard build", "reused after the first run");
    const dashboardRoot = await ensureDashboardBuild(context);
    resolvedPort ??= await resolveServePort(options);
    port = resolvedPort.port;
    if (!resolvedPort.fixed && port !== 3030) {
      startupProgress("Port selected", `3030 was unavailable, using ${port}`);
    }
    const url = `http://${hostname}:${port}`;

    startupProgress("Starting dashboard", url);
    console.log("Press Ctrl+C to stop the server.");

    child = spawn(
      process.execPath,
      [context.nextBin(), "start", "--hostname", hostname, "--port", String(port)],
      {
        cwd: dashboardRoot,
        env: {
          ...context.runtimeEnv(),
          PORT: String(port),
          HOSTNAME: hostname
        },
        stdio: "inherit"
      }
    );

    const stop = () => {
      if (child && !child.killed) child.kill("SIGINT");
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);

    await waitForServer(url, child);
    startupProgress("Dashboard ready", url);
    if (options.openBrowser) {
      await open(url).catch(() => {
        console.log(`Open this URL in your browser: ${url}`);
      });
    } else {
      console.log(`Open this URL in your browser: ${url}`);
    }
  } catch (error) {
    console.error(formatServeError(error, { hostname, port }));
    if (child && !child.killed) child.kill("SIGINT");
    process.exit(1);
  }

  child.on("exit", (code) => process.exit(code ?? 0));
}
