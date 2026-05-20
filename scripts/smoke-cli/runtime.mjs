import { spawn } from "node:child_process";
import process from "node:process";
import { stopChild } from "./processes.mjs";

export async function smokeWatch(context) {
  const child = spawn(process.execPath, [context.bin, "watch", "--session", "--compact", "--interval", "250"], {
    cwd: context.root,
    env: context.env,
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
  } catch (error) {
    throw new Error(`watch runtime smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await stopChild(child);
  }
}
