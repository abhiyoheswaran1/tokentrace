import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { doctorUsage, parseDoctorArgs } from "@/src/lib/doctor-cli";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-doctor-timings-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("doctor --timings flag", () => {
  it("parses --timings as a doctor-specific option", () => {
    expect(parseDoctorArgs([])).toEqual({ help: false, json: false, timings: false });
    expect(parseDoctorArgs(["--timings"])).toEqual({ help: false, json: false, timings: true });
    expect(parseDoctorArgs(["--timings", "--json"])).toEqual({
      help: false,
      json: true,
      timings: true
    });
  });

  it("rejects unknown options", () => {
    expect(() => parseDoctorArgs(["--timingz"])).toThrow("Unknown option: --timingz");
  });

  it("doctor --help mentions the --timings flag", () => {
    expect(doctorUsage()).toContain("--timings");
    expect(doctorUsage()).toContain("Usage: tokentrace doctor");
  });

  it("doctor --timings runs successfully and prints a timing section header", async () => {
    const home = await tempHome();
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "doctor", "--timings"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db")
      }
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Analytics timings");
  }, 60_000);

  it("doctor --timings --json emits the analytics timing report as JSON", async () => {
    const home = await tempHome();
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "doctor", "--timings", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db")
      }
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty("enabled");
    expect(parsed).toHaveProperty("thresholdMs");
    expect(parsed).toHaveProperty("slowQueries");
    expect(Array.isArray(parsed.slowQueries)).toBe(true);
  }, 30_000);
});
