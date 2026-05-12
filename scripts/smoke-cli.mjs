#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const bin = path.join(root, "bin", "tokentrace.js");
const home = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-cli-smoke-"));
const env = {
  ...process.env,
  TOKENTRACE_HOME: home,
  TOKENTRACE_DB: path.join(home, "tokentrace.db"),
  DATABASE_URL: `file:${path.join(home, "tokentrace.db")}`,
  TOKENTRACE_NO_OPEN: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  CI: "true"
};

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    env,
    encoding: "utf8",
    input: options.input,
    timeout: options.timeout ?? 30_000
  });

  if (result.status !== 0) {
    throw new Error(
      `tokentrace ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result.stdout;
}

function jsonCommand(args) {
  const output = run(args);
  return JSON.parse(output);
}

async function waitFor(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`serve exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // wait
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopChild(child) {
  if (child.exitCode != null || child.signalCode != null) return;

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);

  if (child.exitCode == null && child.signalCode == null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1_000))
    ]);
  }
}

async function smokeServe() {
  if (process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1") {
    console.log("skip serve smoke: sandbox network binding is disabled");
    return;
  }

  const buildId = path.join(root, ".next", "BUILD_ID");
  try {
    await fs.access(buildId);
  } catch {
    console.log("skip serve smoke: .next/BUILD_ID is missing");
    return;
  }

  const port = Number(process.env.TOKENTRACE_SMOKE_PORT ?? 3979);
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [bin, "serve", "--hostname", "127.0.0.1", "--port", String(port), "--no-open"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    await waitFor(url, child);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nstderr:\n${stderr}`);
  } finally {
    await stopChild(child);
  }
}

async function smokeWatch() {
  const child = spawn(process.execPath, [bin, "watch", "--session", "--compact", "--interval", "250"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  const deadline = Date.now() + 5_000;
  try {
    while (Date.now() < deadline) {
      if (child.exitCode != null) {
        throw new Error(`watch exited early with code ${child.exitCode}`);
      }
      if (/(TokenTrace|TT)/.test(stdout)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for watch output\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  } finally {
    await stopChild(child);
  }
}

try {
  const version = run(["--version"]).trim();
  if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`Unexpected version output: ${version}`);

  const scan = jsonCommand(["scan", "fixtures/generic-jsonl", "--json"]);
  if (scan.recordsImported < 1) throw new Error("Expected fixture scan to import records.");

  const doctor = jsonCommand(["doctor", "--json"]);
  if (!doctor.supportMatrix?.summary) throw new Error("Doctor JSON is missing support matrix.");

  const evidence = jsonCommand(["evidence", "--json"]);
  if (!evidence.metric || !evidence.totals) throw new Error("Evidence JSON is missing trail data.");

  const repair = jsonCommand(["repair", "--json"]);
  if (!repair.summary || !Array.isArray(repair.groups)) throw new Error("Repair JSON is missing workbench data.");

  const digest = jsonCommand(["digest", "--json"]);
  if (!digest.topReviewItem?.title) throw new Error("Digest JSON is missing topReviewItem.");

  const status = jsonCommand(["status", "--json"]);
  if (typeof status.totalTokens !== "number") throw new Error("Status JSON is missing totalTokens.");

  const setup = run(["statusline", "setup", "claude"]);
  if (!setup.includes("statusLine")) throw new Error("Claude setup output is missing statusLine config.");

  const statusLine = run(["statusline", "claude", "--compact"], {
    input: JSON.stringify({
      transcript_path: path.join(home, "missing-transcript.jsonl"),
      model: { display_name: "Claude" },
      workspace: { current_dir: root }
    })
  });
  if (!/(TokenTrace|TT)/.test(statusLine)) throw new Error("Claude status line output is missing TokenTrace branding.");

  await smokeWatch();
  await smokeServe();
  console.log("TokenTrace CLI smoke passed");
} finally {
  await fs.rm(home, { recursive: true, force: true });
}

process.exit(0);
