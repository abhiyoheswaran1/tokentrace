import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export async function createSmokeContext() {
  const root = process.cwd();
  const bin = path.join(root, "bin", "tokentrace.js");
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-cli-smoke-"));
  const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const env = {
    ...process.env,
    TOKENTRACE_HOME: home,
    TOKENTRACE_DB: path.join(home, "tokentrace.db"),
    DATABASE_URL: `file:${path.join(home, "tokentrace.db")}`,
    TOKENTRACE_NO_OPEN: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    CI: "true"
  };

  return { root, bin, home, packageJson, env };
}

export async function cleanupSmokeContext(context) {
  await fs.rm(context.home, { recursive: true, force: true });
}
