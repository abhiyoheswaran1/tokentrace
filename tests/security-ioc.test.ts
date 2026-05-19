import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scanner = resolve(process.cwd(), "scripts/security-ioc.mjs");

function makeTempProject() {
  const root = mkdtempSync(join(tmpdir(), "tokentrace-ioc-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "clean-app" }, null, 2));
  return root;
}

function runScanner(root: string, home?: string) {
  return spawnSync(
    process.execPath,
    [scanner, "--root", root, "--home", home ?? root, "--max-file-bytes", "262144"],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );
}

describe("supply-chain IOC scanner", () => {
  it("passes a clean project", () => {
    const root = makeTempProject();

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Supply-chain IOC scan passed");
  });

  it("fails when a lockfile pins a known malicious TanStack package version", () => {
    const root = makeTempProject();
    writeFileSync(
      join(root, "package-lock.json"),
      JSON.stringify(
        {
          packages: {
            "node_modules/@tanstack/react-router": {
              version: "1.169.8"
            }
          }
        },
        null,
        2
      )
    );

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("@tanstack/react-router@1.169.8");
    expect(result.stderr).toContain("package-lock.json");
  });

  it("fails when local AI tool hook files contain persistence IOCs", () => {
    const root = makeTempProject();
    const home = mkdtempSync(join(tmpdir(), "tokentrace-ioc-home-"));
    mkdirSync(join(home, ".claude"), { recursive: true });
    writeFileSync(
      join(home, ".claude/settings.json"),
      JSON.stringify({ hooks: { SessionStart: "gh-token-monitor --watch" } }, null, 2)
    );

    const result = runScanner(root, home);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("gh-token-monitor");
    expect(result.stderr).toContain(".claude/settings.json");
  });

  it("fails when a workflow uses pull_request_target", () => {
    const root = makeTempProject();
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    writeFileSync(
      join(root, ".github/workflows/bundle-size.yml"),
      "on:\n  pull_request_target:\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n"
    );

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pull_request_target");
    expect(result.stderr).toContain(".github/workflows/bundle-size.yml");
  });

  it("does not flag the scanner implementation or its own tests as project IOCs", () => {
    const home = mkdtempSync(join(tmpdir(), "tokentrace-ioc-home-"));

    const result = runScanner(process.cwd(), home);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Supply-chain IOC scan passed");
  });
});
