import path from "node:path";
import { spawnSync } from "node:child_process";
import type { SupplyChainHealth } from "@/src/lib/scan-health";

export function getSupplyChainHealth(): SupplyChainHealth {
  const scriptPath = path.join(process.cwd(), "scripts", "security-ioc.mjs");
  const result = spawnSync(process.execPath, [scriptPath, "--no-home"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 12_000
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const match = output.match(/(\d+)\s+finding/);
  const findings = match ? Number(match[1]) : result.status === 0 ? 0 : 1;

  if (result.status === 0) {
    return {
      status: "passed",
      checkedAt: Date.now(),
      findings: 0,
      summary: "No known Shai-Hulud-style package, lockfile, hook, or local config indicators were found in this package."
    };
  }

  return {
    status: "failed",
    checkedAt: Date.now(),
    findings,
    summary: output.split("\n").find((line) => line.trim())?.trim() || "Supply-chain IOC check needs review."
  };
}
