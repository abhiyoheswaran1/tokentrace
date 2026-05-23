import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("bundle optimization config", () => {
  const nextConfig = fs.readFileSync(path.join(repoRoot, "next.config.mjs"), "utf8");

  it("enables Next.js optimizePackageImports for heavy icon and chart deps", () => {
    expect(nextConfig).toContain("optimizePackageImports");
    expect(nextConfig).toContain("lucide-react");
    expect(nextConfig).toContain("recharts");
  });

  it("documents how to render a bundle analyzer report", () => {
    expect(nextConfig).toMatch(/ANALYZE|bundle.?analyzer/i);
  });
});
