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

  it("declares a patched Next.js dependency floor", () => {
    expect(packageJson.dependencies.next).toBe("^15.5.18");
  });

  it("declares patched dependency floors for production audit findings", () => {
    expect(packageJson.dependencies["drizzle-orm"]).toBe("^0.45.2");
    expect(packageJson.overrides?.postcss).toBe("^8.5.14");
    expect(packageJson.dependencies).not.toHaveProperty("date-fns");
  });
});
