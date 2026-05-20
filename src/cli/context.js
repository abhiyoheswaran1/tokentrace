import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export function createCliContext({ binMetaUrl, invocationCwd = process.cwd() }) {
  const binPath = fs.realpathSync(fileURLToPath(binMetaUrl));
  const packageRoot = path.resolve(path.dirname(binPath), "..");
  const require = createRequire(binMetaUrl);
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")
  );

  function appDataDir(env = process.env) {
    if (env.TOKENTRACE_HOME) return path.resolve(env.TOKENTRACE_HOME);
    const home = os.homedir();
    if (process.platform === "darwin") {
      return path.join(home, "Library", "Application Support", "TokenTrace");
    }
    if (process.platform === "win32") {
      return path.join(env.APPDATA ?? path.join(home, "AppData", "Roaming"), "TokenTrace");
    }
    return path.join(env.XDG_DATA_HOME ?? path.join(home, ".local", "share"), "tokentrace");
  }

  function runtimeEnv(env = process.env) {
    const dataDir = appDataDir(env);
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "tokentrace.db");
    return {
      ...env,
      TOKENTRACE_DB: env.TOKENTRACE_DB ?? dbPath,
      DATABASE_URL: env.DATABASE_URL ?? `file:${dbPath}`,
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

  return {
    binPath,
    packageRoot,
    packageJson,
    invocationCwd,
    appDataDir,
    runtimeEnv,
    nextBin
  };
}
