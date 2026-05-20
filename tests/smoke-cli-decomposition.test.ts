import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("CLI smoke tooling decomposition", () => {
  it("keeps the smoke entrypoint thin and failure families named", () => {
    const entrypoint = read("scripts/smoke-cli.mjs");
    const commands = read("scripts/smoke-cli/commands.mjs");
    const runtime = read("scripts/smoke-cli/runtime.mjs");
    const serve = read("scripts/smoke-cli/serve.mjs");
    const context = read("scripts/smoke-cli/context.mjs");

    expect(entrypoint.trimEnd().split("\n").length).toBeLessThan(60);
    expect(entrypoint).toContain("createSmokeContext");
    expect(entrypoint).toContain("smokeCliDiscovery");
    expect(entrypoint).toContain("smokeCliData");
    expect(entrypoint).toContain("smokeWatch");
    expect(entrypoint).toContain("smokeServe");
    expect(context).toContain("export async function createSmokeContext");
    expect(commands).toContain("export function run");
    expect(commands).toContain("export async function smokeCliDiscovery");
    expect(commands).toContain("export async function smokeCliData");
    expect(commands).toContain("CLI discovery smoke failed");
    expect(commands).toContain("CLI JSON/data smoke failed");
    expect(runtime).toContain("export async function smokeWatch");
    expect(runtime).toContain("watch runtime smoke failed");
    expect(serve).toContain("export async function smokeServe");
    expect(serve).toContain("dashboard serve smoke failed");
  });
});
