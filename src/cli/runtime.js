import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function dashboardWorkdir(context) {
  return path.join(context.appDataDir(), "dashboard-runtime");
}

function dashboardBuildId(context) {
  return path.join(dashboardWorkdir(context), ".next", "BUILD_ID");
}

function dashboardBuildMarker(context) {
  return path.join(dashboardWorkdir(context), ".tokentrace-dashboard-version");
}

function dependencyModulesDir(context) {
  const localNodeModules = path.join(context.packageRoot, "node_modules");
  if (fs.existsSync(localNodeModules)) return localNodeModules;

  const parent = path.dirname(context.packageRoot);
  if (path.basename(parent) === "node_modules") return parent;

  return localNodeModules;
}

function copyDashboardSource(context, targetRoot) {
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
    const source = path.join(context.packageRoot, directory);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(targetRoot, directory), { recursive: true });
    }
  }

  for (const file of files) {
    const source = path.join(context.packageRoot, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(targetRoot, file));
    }
  }

  const nodeModulesTarget = dependencyModulesDir(context);
  const nodeModulesLink = path.join(targetRoot, "node_modules");
  fs.symlinkSync(
    nodeModulesTarget,
    nodeModulesLink,
    process.platform === "win32" ? "junction" : "dir"
  );
}

function runNextBuild(context, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [context.nextBin(), "build"], {
      cwd,
      env: context.runtimeEnv(),
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with code ${code}`));
    });
  });
}

export async function ensureDashboardBuild(context) {
  const workdir = dashboardWorkdir(context);
  const marker = dashboardBuildMarker(context);
  const builtVersion = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : null;
  if (fs.existsSync(dashboardBuildId(context)) && builtVersion === context.packageJson.version) {
    return workdir;
  }

  console.log("Preparing TokenTrace dashboard for this install...");
  console.log("This runs locally and may take a moment the first time.");
  copyDashboardSource(context, workdir);
  await runNextBuild(context, workdir);
  fs.writeFileSync(marker, `${context.packageJson.version}\n`);
  return workdir;
}

export function runtimeScriptPath(context, scriptName) {
  const compiled = path.join(context.packageRoot, "dist", "runtime", `${scriptName}.mjs`);
  if (fs.existsSync(compiled)) return compiled;
  return path.join(context.packageRoot, "scripts", `${scriptName}.ts`);
}

export function scriptCommand(context, scriptName, args) {
  const scriptPath = runtimeScriptPath(context, scriptName);
  if (scriptPath.endsWith(".mjs")) {
    return [process.execPath, [scriptPath, ...args]];
  }
  const tsx = path.join(context.packageRoot, "node_modules", "tsx", "dist", "cli.mjs");
  return [process.execPath, [tsx, scriptPath, ...args]];
}

export function runNodeScript(context, scriptName, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const [command, commandArgs] = scriptCommand(context, scriptName, args);
    const child = spawn(command, commandArgs, {
      cwd: context.packageRoot,
      env: options.env ?? context.runtimeEnv(),
      stdio: options.stdio ?? "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

export async function initializeDatabase(context, { quiet = false, refreshPrices = true } = {}) {
  const env = context.runtimeEnv();
  if (!quiet) {
    console.log(`TokenTrace data: ${env.TOKENTRACE_APP_DATA_DIR}`);
  }
  await runNodeScript(context, "db-migrate", [], { stdio: quiet ? "ignore" : "inherit" });
  await runNodeScript(context, "db-seed", [], { stdio: quiet ? "ignore" : "inherit" });
  if (refreshPrices) {
    await runNodeScript(context, "pricing-refresh", ["--quiet"], { stdio: quiet ? "ignore" : "inherit" }).catch(
      () => {
        if (!quiet) {
          console.log("Pricing refresh skipped; using bundled default prices.");
        }
      }
    );
  }
}
