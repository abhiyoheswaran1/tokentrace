import { readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "@/package.json";
import { describe, expect, it } from "vitest";

describe("package trust policy", () => {
  it("keeps npm install free of lifecycle scripts", () => {
    expect(packageJson.scripts).not.toHaveProperty("preinstall");
    expect(packageJson.scripts).not.toHaveProperty("install");
    expect(packageJson.scripts).not.toHaveProperty("postinstall");
  });

  it("keeps generated Next server bundles readable for package scanners", () => {
    const nextConfig = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

    expect(nextConfig).toContain("serverMinification: false");
  });

  it("does not publish generated Next.js output in the npm package", () => {
    expect(packageJson.files).not.toContain(".next/BUILD_ID");
    expect(packageJson.files).not.toContain(".next/*.json");
    expect(packageJson.files).not.toContain(".next/server");
    expect(packageJson.files).not.toContain(".next/static");
  });

  it("declares common local dev origins and the dev indicator preference", () => {
    const nextConfig = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

    expect(nextConfig).toContain("allowedDevOrigins");
    expect(nextConfig).toContain("devIndicators: false");
    expect(nextConfig).toContain('"127.0.0.1"');
    expect(nextConfig).toContain('"localhost"');
  });

  it("declares a patched Next.js dependency floor", () => {
    expect(packageJson.dependencies.next).toBe("^15.5.18");
  });

  it("declares patched dependency floors for production audit findings", () => {
    expect(packageJson.dependencies["drizzle-orm"]).toBe("^0.45.2");
    expect(packageJson.overrides?.postcss).toBe("^8.5.14");
    expect(packageJson.dependencies).not.toHaveProperty("date-fns");
  });

  it("runs CLI and packed-install smoke checks before package release checks complete", () => {
    expect(packageJson.scripts["smoke:cli"]).toContain("scripts/smoke-cli.mjs");
    expect(packageJson.scripts["smoke:packed"]).toContain("scripts/smoke-packed-install.mjs");
    expect(packageJson.scripts["release:check"]).toContain("npm run smoke:cli");
    expect(packageJson.scripts["release:check"]).toContain("npm run smoke:packed");
    expect(packageJson.scripts["release:check"]).toContain("npm run security:package");
  });

  it("publishes agent discovery docs, schema, and CLI bin entry", () => {
    expect(packageJson.bin).toEqual({ tokentrace: "bin/tokentrace.js" });
    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        "bin",
        "TOKENTRACE_AGENT.md",
        "llms.txt",
        "docs/agent-discovery.schema.json"
      ])
    );
  });

  it("package inspection enforces the release-hardening payload contract", () => {
    const inspectScript = readFileSync(join(process.cwd(), "scripts/package-inspect.mjs"), "utf8");

    expect(inspectScript).toContain("requiredPackageFiles");
    expect(inspectScript).toContain("TOKENTRACE_AGENT.md");
    expect(inspectScript).toContain("docs/agent-discovery.schema.json");
    expect(inspectScript).toContain("bin/tokentrace.js");
    expect(inspectScript).toContain("executable");
  });

  it("packed install smoke covers agent discovery and roadmap commands", () => {
    const smokeScript = readFileSync(join(process.cwd(), "scripts/smoke-packed-install.mjs"), "utf8");

    expect(smokeScript).toContain("agent");
    expect(smokeScript).toContain("capabilities");
    expect(smokeScript).toContain("roadmap");
    expect(smokeScript).toContain("schemaVersion");
    expect(smokeScript).toContain("releaseAllowed");
  });
});
