import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { stopChild, waitFor } from "./processes.mjs";

async function prepareDashboardRuntime(context, dashboardRoot) {
  await fs.rm(dashboardRoot, { recursive: true, force: true });
  await fs.mkdir(dashboardRoot, { recursive: true });
  await fs.cp(path.join(context.root, ".next"), path.join(dashboardRoot, ".next"), { recursive: true });
  await fs.copyFile(path.join(context.root, "package.json"), path.join(dashboardRoot, "package.json"));

  const publicDir = path.join(context.root, "public");
  try {
    await fs.cp(publicDir, path.join(dashboardRoot, "public"), { recursive: true });
  } catch {
    // Static assets are optional for this smoke path.
  }

  const nodeModules = path.join(context.root, "node_modules");
  try {
    await fs.symlink(nodeModules, path.join(dashboardRoot, "node_modules"), "dir");
  } catch {
    // next start can still work when modules resolve from the package root.
  }

  await fs.writeFile(
    path.join(dashboardRoot, ".tokentrace-dashboard-version"),
    `${context.packageJson.version}\n`
  );
}

export async function smokeServe(context) {
  if (process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1") {
    console.log("skip serve smoke: sandbox network binding is disabled");
    return;
  }

  const buildId = path.join(context.root, ".next", "BUILD_ID");
  try {
    await fs.access(buildId);
  } catch {
    console.log("skip serve smoke: .next/BUILD_ID is missing");
    return;
  }

  const dashboardRoot = path.join(context.home, "dashboard-runtime");
  try {
    await prepareDashboardRuntime(context, dashboardRoot);
  } catch (error) {
    console.log(
      `skip serve smoke: could not reuse root dashboard build (${error instanceof Error ? error.message : String(error)})`
    );
    return;
  }

  const port = Number(process.env.TOKENTRACE_SMOKE_PORT ?? 3979);
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [context.bin, "serve", "--hostname", "127.0.0.1", "--port", String(port), "--no-open"], {
    cwd: context.root,
    env: context.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    await waitFor(url, child);
  } catch (error) {
    throw new Error(`dashboard serve smoke failed: ${error instanceof Error ? error.message : String(error)}\nstderr:\n${stderr}`);
  } finally {
    await stopChild(child);
  }
}
