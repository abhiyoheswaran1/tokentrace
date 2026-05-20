import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { help } from "./help.js";
import { initializeDatabase, runNodeScript } from "./runtime.js";
import { serve } from "./serve.js";

async function scan(context, args) {
  await initializeDatabase(context, { quiet: true });
  await runNodeScript(context, "scan", args);
}

async function agent(context, args) {
  await runNodeScript(context, "agent", args, { env: process.env });
}

async function roadmap(context, args) {
  await runNodeScript(context, "roadmap", args, { env: process.env });
}

async function mcp(context, args) {
  if (args.length) {
    if (args[0] === "selftest" && (args.length === 1 || (args.length === 2 && args[1] === "--json"))) {
      await runNodeScript(context, "mcp", args, { env: process.env });
      return;
    }
    console.error("Usage: tokentrace mcp");
    console.error("   or: tokentrace mcp selftest --json");
    process.exit(1);
  }
  await runNodeScript(context, "mcp", [], { env: process.env });
}

async function doctor(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "doctor", args);
}

async function evidence(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "evidence", args);
}

async function digest(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "digest", args);
}

async function report(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "report", args);
}

async function review(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "review", args);
}

async function insights(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "insights", args);
}

async function repair(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "repair", args);
}

async function refreshPrices(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "pricing-refresh", args.length ? args : ["--json"]);
}

async function status(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "status", args);
}

async function statusLine(context, args) {
  if (args[0] === "claude") {
    await runNodeScript(context, "status", ["statusline", "claude", ...args.slice(1)], { env: process.env });
    return;
  }
  if (args[0] === "setup" && args[1] === "claude") {
    await runNodeScript(context, "status", ["setup", "claude"], { env: process.env });
    return;
  }

  console.error("Usage: tokentrace statusline claude");
  console.error("   or: tokentrace statusline setup claude");
  process.exit(1);
}

async function watch(context, args) {
  await initializeDatabase(context, { quiet: true, refreshPrices: false });
  await runNodeScript(context, "status", ["watch", ...args]);
}

async function reset(context, args) {
  await initializeDatabase(context, { quiet: true });
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
  await runNodeScript(context, "reset", []);
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

async function runWrapped(context, args) {
  if (!args.length) {
    console.error("Usage: tokentrace run <command> [args...]");
    process.exit(1);
  }

  const env = context.runtimeEnv();
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
    cwd: context.invocationCwd,
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
    cwd: context.invocationCwd,
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

export async function runCliCommand(context, rawArgs = process.argv.slice(2)) {
  const effectiveArgs = rawArgs.length === 0 && !process.stdin.isTTY ? ["statusline", "claude"] : rawArgs;
  const [command = "serve", ...args] = effectiveArgs;

  if (command === "--help" || command === "-h" || command === "help") {
    console.log(help());
    return;
  }
  if (command === "--version" || command === "-v") {
    console.log(context.packageJson.version);
    return;
  }
  if (command === "serve") {
    await serve(context, args);
    return;
  }
  if (command === "agent" || command === "capabilities") {
    await agent(context, args);
    return;
  }
  if (command === "roadmap") {
    await roadmap(context, args);
    return;
  }
  if (command === "mcp") {
    await mcp(context, args);
    return;
  }
  if (command === "scan") {
    await scan(context, args);
    return;
  }
  if (command === "doctor") {
    await doctor(context, args);
    return;
  }
  if (command === "evidence") {
    await evidence(context, args);
    return;
  }
  if (command === "digest") {
    await digest(context, args);
    return;
  }
  if (command === "report") {
    await report(context, args);
    return;
  }
  if (command === "review") {
    await review(context, args);
    return;
  }
  if (command === "insights") {
    await insights(context, args);
    return;
  }
  if (command === "repair") {
    await repair(context, args);
    return;
  }
  if (command === "status") {
    await status(context, args);
    return;
  }
  if (command === "statusline") {
    await statusLine(context, args);
    return;
  }
  if (command === "watch") {
    await watch(context, args);
    return;
  }
  if ((command === "pricing" || command === "prices") && args[0] === "refresh") {
    await refreshPrices(context, args.slice(1));
    return;
  }
  if (command === "run") {
    await runWrapped(context, args);
    return;
  }
  if (command === "reset") {
    await reset(context, args);
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  console.error(help());
  process.exit(1);
}
