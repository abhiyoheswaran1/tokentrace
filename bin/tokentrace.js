#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import getPort, { portNumbers } from "get-port";
import open from "open";

const binPath = fs.realpathSync(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(path.dirname(binPath), "..");
const require = createRequire(import.meta.url);
const invocationCwd = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")
);

function help() {
  return `TokenTrace CLI

Usage:
  tokentrace              Start local dashboard
  tokentrace serve        Start local dashboard
  tokentrace agent --json
                          Print machine-readable agent discovery manifest
  tokentrace capabilities --json
                          Alias for agent discovery manifest
  tokentrace roadmap --json
                          Print Local Sources & Trust release handoff
  tokentrace scan         Scan local AI CLI usage logs
  tokentrace doctor --json
                          Inspect scan health and repair recommendations
  tokentrace evidence --json
                          Print metric evidence trail as JSON
  tokentrace digest --json
                          Print current-month local usage digest
  tokentrace report --markdown
                          Print a deterministic local Markdown report
  tokentrace review --json
                          Print post-session review movement as JSON
  tokentrace insights --json
                          Print local recommendations as JSON
  tokentrace repair --json
                          Print unknown-cost repair queue as JSON
  tokentrace status --json
                          Print local usage status as JSON
  tokentrace statusline claude
                          Render a Claude Code status line from stdin
  tokentrace statusline setup claude
                          Print Claude Code statusLine setup JSON
  tokentrace watch --session
                          Watch local usage status in the terminal
  tokentrace pricing refresh
                          Refresh public model prices
  tokentrace run <cmd>    Run a command and record wrapper diagnostics
  tokentrace reset        Reset local database
  tokentrace --version    Print version`;
}

function serveHelp() {
  return `TokenTrace dashboard server

Usage:
  tokentrace serve
  tokentrace serve --port 3210
  tokentrace serve --hostname 127.0.0.1 --no-open

Options:
  -p, --port <port>          Use a fixed port. Also reads TOKENTRACE_PORT or PORT.
  -H, --hostname <host>      Bind to a fixed host. Defaults to 127.0.0.1.
      --no-open              Do not open a browser after the server starts.
  -h, --help                 Print serve help`;
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
  try {
    return require.resolve("next/dist/bin/next");
  } catch {
    return path.join(packageRoot, "node_modules", "next", "dist", "bin", "next");
  }
}

function dashboardBuildId() {
  return path.join(dashboardWorkdir(), ".next", "BUILD_ID");
}

function dashboardWorkdir() {
  return path.join(appDataDir(), "dashboard-runtime");
}

function dashboardBuildMarker() {
  return path.join(dashboardWorkdir(), ".tokentrace-dashboard-version");
}

function dependencyModulesDir() {
  const localNodeModules = path.join(packageRoot, "node_modules");
  if (fs.existsSync(localNodeModules)) return localNodeModules;

  const parent = path.dirname(packageRoot);
  if (path.basename(parent) === "node_modules") return parent;

  return localNodeModules;
}

function copyDashboardSource(targetRoot) {
  const directories = ["app", "components", "pricing", "public", "src"];
  const files = [
    "components.json",
    "next.config.mjs",
    "package.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json"
  ];

  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const directory of directories) {
    const source = path.join(packageRoot, directory);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(targetRoot, directory), { recursive: true });
    }
  }

  for (const file of files) {
    const source = path.join(packageRoot, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(targetRoot, file));
    }
  }

  const nodeModulesTarget = dependencyModulesDir();
  const nodeModulesLink = path.join(targetRoot, "node_modules");
  fs.symlinkSync(
    nodeModulesTarget,
    nodeModulesLink,
    process.platform === "win32" ? "junction" : "dir"
  );
}

function runNextBuild(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin(), "build"], {
      cwd,
      env: runtimeEnv(),
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with code ${code}`));
    });
  });
}

async function ensureDashboardBuild() {
  const workdir = dashboardWorkdir();
  const marker = dashboardBuildMarker();
  const builtVersion = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : null;
  if (fs.existsSync(dashboardBuildId()) && builtVersion === packageJson.version) {
    return workdir;
  }

  console.log("Preparing TokenTrace dashboard for this install...");
  console.log("This runs locally and may take a moment the first time.");
  copyDashboardSource(workdir);
  await runNextBuild(workdir);
  fs.writeFileSync(marker, `${packageJson.version}\n`);
  return workdir;
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
      env: options.env ?? runtimeEnv(),
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

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function parseServeOptions(args) {
  const options = {
    help: false,
    hostname: process.env.TOKENTRACE_HOSTNAME ?? "127.0.0.1",
    port:
      process.env.TOKENTRACE_PORT || process.env.PORT
        ? parsePort(process.env.TOKENTRACE_PORT ?? process.env.PORT)
        : null,
    openBrowser: process.env.TOKENTRACE_NO_OPEN !== "1" && process.env.CI !== "true"
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

async function serve(args = []) {
  const options = parseServeOptions(args);
  if (options.help) {
    console.log(serveHelp());
    return;
  }

  await initializeDatabase();
  const dashboardRoot = await ensureDashboardBuild();
  const hostname = options.hostname;
  const port = options.port ?? (await getPort({ port: portNumbers(3030, 3999), host: hostname }));
  const url = `http://${hostname}:${port}`;

  console.log(`Starting TokenTrace at ${url}`);
  console.log("Press Ctrl+C to stop the server.");

  const child = spawn(
    process.execPath,
    [nextBin(), "start", "--hostname", hostname, "--port", String(port)],
    {
      cwd: dashboardRoot,
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
    if (options.openBrowser) {
      await open(url).catch(() => {
        console.log(`Open this URL in your browser: ${url}`);
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to start TokenTrace.");
    stop();
    process.exit(1);
  }

  child.on("exit", (code) => process.exit(code ?? 0));
}

async function scan(args) {
  await initializeDatabase({ quiet: true });
  await runNodeScript("scan", args);
}

async function agent(args) {
  await runNodeScript("agent", args, { env: process.env });
}

async function roadmap(args) {
  await runNodeScript("roadmap", args, { env: process.env });
}

async function doctor(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("doctor", args);
}

async function evidence(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("evidence", args);
}

async function digest(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("digest", args);
}

async function report(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("report", args);
}

async function review(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("review", args);
}

async function insights(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("insights", args);
}

async function repair(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("repair", args);
}

async function refreshPrices(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("pricing-refresh", args.length ? args : ["--json"]);
}

async function status(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("status", args);
}

async function statusLine(args) {
  if (args[0] === "claude") {
    await runNodeScript("status", ["statusline", "claude", ...args.slice(1)], { env: process.env });
    return;
  }
  if (args[0] === "setup" && args[1] === "claude") {
    await runNodeScript("status", ["setup", "claude"], { env: process.env });
    return;
  }

  console.error("Usage: tokentrace statusline claude");
  console.error("   or: tokentrace statusline setup claude");
  process.exit(1);
}

async function watch(args) {
  await initializeDatabase({ quiet: true, refreshPrices: false });
  await runNodeScript("status", ["watch", ...args]);
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
  const rawArgs = process.argv.slice(2);
  const effectiveArgs = rawArgs.length === 0 && !process.stdin.isTTY ? ["statusline", "claude"] : rawArgs;
  const [command = "serve", ...args] = effectiveArgs;

  if (command === "--help" || command === "-h" || command === "help") {
    console.log(help());
    return;
  }
  if (command === "--version" || command === "-v") {
    console.log(packageJson.version);
    return;
  }
  if (command === "serve") {
    await serve(args);
    return;
  }
  if (command === "agent" || command === "capabilities") {
    await agent(args);
    return;
  }
  if (command === "roadmap") {
    await roadmap(args);
    return;
  }
  if (command === "scan") {
    await scan(args);
    return;
  }
  if (command === "doctor") {
    await doctor(args);
    return;
  }
  if (command === "evidence") {
    await evidence(args);
    return;
  }
  if (command === "digest") {
    await digest(args);
    return;
  }
  if (command === "report") {
    await report(args);
    return;
  }
  if (command === "review") {
    await review(args);
    return;
  }
  if (command === "insights") {
    await insights(args);
    return;
  }
  if (command === "repair") {
    await repair(args);
    return;
  }
  if (command === "status") {
    await status(args);
    return;
  }
  if (command === "statusline") {
    await statusLine(args);
    return;
  }
  if (command === "watch") {
    await watch(args);
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
