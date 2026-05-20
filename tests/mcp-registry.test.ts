import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

describe("MCP registry manifest", () => {
  it("publishes TokenTrace as an npm stdio server without placeholder secrets", () => {
    const manifest = readJson("server.json");
    const packageJson = readJson("package.json");

    expect(manifest.name).toBe("io.github.abhiyoheswaran1/tokentrace");
    expect(manifest.title).toBe("TokenTrace");
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.packages).toHaveLength(1);
    expect(manifest.packages[0]).toMatchObject({
      registryType: "npm",
      identifier: "tokentrace",
      version: packageJson.version,
      runtimeHint: "npx",
      transport: { type: "stdio" }
    });
    expect(manifest.packages[0].packageArguments).toEqual([
      { type: "positional", value: "mcp" }
    ]);
    expect(JSON.stringify(manifest)).not.toContain("YOUR_API_KEY");
  });
});
