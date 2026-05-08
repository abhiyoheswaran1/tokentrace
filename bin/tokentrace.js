#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import getPort, { portNumbers } from "get-port";
import open from "open";

const binPath = fs.realpathSync(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(path.dirname(binPath), "..");
const invocationCwd = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")
);

function help() {
  return `TokenTrace CLI

Usage:
  tokentrace              Start local dashboard
  tokentrace serve        Start local dashboard
  tokentrace scan         Scan local AI CLI usage logs
  tokentrace pricing refresh
                          Refresh public model prices
  tokentrace run <cmd>    Run a command and record wrapper diagnostics
  tokentrace reset        Reset local database
  tokentrace --version    Print version`;
}

function appDataDir() {
  if (process.env.TOKENTRACE_HOME) return path.resolve(process.env.TOKENTRACE_HOME);
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "TokenTrace");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(home, "AppData", "Roaming"), "TokenTrace");
  }
  return path.join(process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share"), "tokentrace");
}

function runtimeEnv() {
  const dataDir = appDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "tokentrace.db");
  return {
    ...process.env,
    TOKENTRACE_DB: process.env.TOKENTRACE_DB ?? dbPath,
    DATABASE_URL: process.env.DATABASE_URL ?? `file:${dbPath}`,
    TOKENTRACE_APP_DATA_DIR: dataDir,
    TOKENTRACE_WORKDIR: invocationCwd,
    NEXT_TELEMETRY_DISABLED: "1"
  };
}

function nextBin() {
  return path.join(packageRoot, "node_modules", "next", "dist", "bin", "next");
}

function runtimeScriptPath(scriptName) {
  const compiled = path.join(packageRoot, "dist", "runtime", `${scriptName}.mjs`);
  if (fs.existsSync(compiled)) return compiled;
  return path.join(packageRoot, "scripts", `${scriptName}.ts`);
}

function scriptCommand(scriptName, args) {
  const scriptPath = runtimeScriptPath(scriptName);
  if (scriptPath.endsWith(".mjs")) {
    return [process.execPath, [scriptPath, ...args]];
  }
  const tsx = path.join(packageRoot, "node_modules", "tsx", "dist", "cli.mjs");
  return [process.execPath, [tsx, scriptPath, ...args]];
}

function runNodeScript(scriptName, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const [command, commandArgs] = scriptCommand(scriptName, args);
    const child = spawn(command, commandArgs, {
      cwd: packageRoot,
      env: runtimeEnv(),
      stdio: options.stdio ?? "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function initializeDatabase({ quiet = false, refreshPrices = true } = {}) {
  const env = runtimeEnv();
  if (!quiet) {
    console.log(`TokenTrace data: ${env.TOKENTRACE_APP_DATA_DIR}`);
  }
  await runNodeScript("db-migrate", [], { stdio: quiet ? "ignore" : "inherit" });
  await runNodeScript("db-seed", [], { stdio: quiet ? "ignore" : "inherit" });
  if (refreshPrices) {
    await runNodeScript("pricing-refresh", ["--quiet"], { stdio: quiet ? "ignore" : "inherit" }).catch(
      () => {
        if (!quiet) {
          console.log("Pricing refresh skipped; using bundled default prices.");
        }
      }
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function serve() {
  const buildId = path.join(packageRoot, ".next", "BUILD_ID");
  if (!fs.existsSync(buildId)) {
    console.error("TokenTrace is not built yet. Run `npm run build` before using the package CLI from a source checkout.");
    process.exit(1);
  }

  await initializeDatabase();
  const port = await getPort({ port: portNumbers(3030, 3999) });
  const hostname = "127.0.0.1";
  const url = `http://localhost:${port}`;

  console.log(`Starting TokenTrace at ${url}`);
  console.log("Press Ctrl+C to stop the server.");

  const child = spawn(
    process.execPath,
    [nextBin(), "start", "--hostname", hostname, "--port", String(port)],
    {
      cwd: packageRoot,
      env: {
        ...runtimeEnv(),
        PORT: String(port),
        HOSTNAME: hostname
      },
      stdio: "inherit"
    }
  );

  const stop = () => {
    if (!child.killed) child.kill("SIGINT");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    await waitForServer(url, child);
    await open(url).catch(() => {
      console.log(`Open this URL in your browser: ${url}`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to start TokenTrace.");
  }

  child.on("exit", (code) => process.exit(code ?? 0));
}

async function scan(args) {
  await initializeDatabase({ quiet: true });
  await runNodeScript("scan", args);
}

async function refreshPrices(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("pricing-refresh", args.length ? args : ["--json"]);
}

async function reset(args) {
  await initializeDatabase({ quiet: true });
  if (!args.includes("--yes")) {
    const rl = createInterface({ input, output });
    const answer = await rl.question(
      "Reset TokenTrace imported data and scan history? Settings and pricing will be kept. Continue? [y/N] "
    );
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("Reset cancelled.");
      return;
    }
  }
  await runNodeScript("reset", []);
}

function looksStructured(text) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 100_000) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Not structured JSON.
  }
  return null;
}

async function runWrapped(args) {
  if (!args.length) {
    console.error("Usage: tokentrace run <command> [args...]");
    process.exit(1);
  }

  const env = runtimeEnv();
  fs.mkdirSync(path.join(env.TOKENTRACE_APP_DATA_DIR, "wrapper-runs"), {
    recursive: true
  });

  const [command, ...commandArgs] = args;
  const startedAt = new Date();
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const stdoutChunks = [];
  const stderrChunks = [];

  const child = spawn(command, commandArgs, {
    cwd: invocationCwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32"
  });

  child.stdout.on("data", (chunk) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes <= 100_000) stdoutChunks.push(chunk);
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrBytes += chunk.length;
    if (stderrBytes <= 100_000) stderrChunks.push(chunk);
    process.stderr.write(chunk);
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });

  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const stdoutSample = Buffer.concat(stdoutChunks).toString("utf8");
  const stderrSample = Buffer.concat(stderrChunks).toString("utf8");
  const structuredOutput = looksStructured(stdoutSample);
  const sessionId = `wrapper-${randomUUID()}`;
  const record = {
    timestamp: endedAt.toISOString(),
    session_id: sessionId,
    role: "tool",
    type: "tokentrace.wrapper_run",
    cwd: invocationCwd,
    content: `Wrapper run for ${command} completed in ${durationMs}ms with ${stdoutBytes} stdout bytes and ${stderrBytes} stderr bytes.`,
    command,
    args: commandArgs,
    duration_ms: durationMs,
    stdout_bytes: stdoutBytes,
    stderr_bytes: stderrBytes,
    exit_code: exitCode,
    structured_output_detected: Boolean(structuredOutput),
    structured_output_preview: structuredOutput ?? undefined
  };
  const logPath = path.join(env.TOKENTRACE_APP_DATA_DIR, "wrapper-runs", "runs.jsonl");
  fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`);

  console.log("");
  console.log("TokenTrace wrapper summary");
  console.log(`Duration: ${durationMs}ms`);
  console.log(`stdout bytes: ${stdoutBytes}`);
  console.log(`stderr bytes: ${stderrBytes}`);
  console.log(`exit code: ${exitCode}`);
  console.log(`diagnostic log: ${logPath}`);

  process.exit(exitCode);
}

async function main() {
  const [command = "serve", ...args] = process.argv.slice(2);

  if (command === "--help" || command === "-h" || command === "help") {
    console.log(help());
    return;
  }
  if (command === "--version" || command === "-v") {
    console.log(packageJson.version);
    return;
  }
  if (command === "serve") {
    await serve();
    return;
  }
  if (command === "scan") {
    await scan(args);
    return;
  }
  if ((command === "pricing" || command === "prices") && args[0] === "refresh") {
    await refreshPrices(args.slice(1));
    return;
  }
  if (command === "run") {
    await runWrapped(args);
    return;
  }
  if (command === "reset") {
    await reset(args);
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  console.error(help());
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
