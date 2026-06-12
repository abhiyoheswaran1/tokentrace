import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import packageJson from "@/package.json";
import { describe, expect, it } from "vitest";

const kitRoot = join(process.cwd(), "docs/chatgpt-app");

function readKitFile(relativePath: string) {
  return readFileSync(join(kitRoot, relativePath), "utf8");
}

function readPngDimensions(relativePath: string) {
  const image = readFileSync(join(kitRoot, relativePath));
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  expect(image.subarray(0, 8).equals(pngSignature)).toBe(true);

  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20)
  };
}

describe("ChatGPT app submission kit", () => {
  it("provides step-by-step manual release instructions for the personal account Dashboard flow", () => {
    const steps = readKitFile("manual-release-steps.md");

    expect(steps).toContain("personal OpenAI account");
    expect(steps).toContain("OpenAI Platform Dashboard");
    expect(steps).toContain("organization verification");
    expect(steps).toContain("api.apps.write");
    expect(steps).toContain("Submit for review");
    expect(steps).toContain("Publish");
  });

  it("ships ready-to-paste Dashboard submission fields", () => {
    const fields = JSON.parse(readKitFile("dashboard-fields.json"));

    expect(fields.appName).toBe("TokenTrace");
    expect(fields.appIcon).toMatchObject({
      path: "assets/icon.png",
      format: "PNG",
      minimumSize: "256x256",
      maxFileSizeBytes: 10_000
    });
    expect(fields.connectorUrlPlaceholder).toBe("https://YOUR_HOSTED_DOMAIN/mcp");
    expect(fields.tools).toContainEqual(
      expect.objectContaining({
        name: "get_redacted_evidence_pack",
        readOnly: true,
        rawContentIncluded: false
      })
    );
    expect(fields.privacyAndDataHandling).toContain("does not include raw prompts");
    expect(fields.testPrompts).toHaveLength(4);
  });

  it("includes reusable copy, review responses, and screenshot guidance", () => {
    expect(readKitFile("submission-copy.md")).toContain("Local-first AI usage analytics");
    expect(readKitFile("privacy-and-data.md")).toContain("Raw prompts, completions, and message bodies are excluded");
    expect(readKitFile("test-prompts-and-responses.md")).toContain("get_redacted_evidence_pack");
    expect(readKitFile("review-response-template.md")).toContain("Case ID");
    expect(readKitFile("screenshot-checklist.md")).toContain("ChatGPT connector tool list");
  });

  it("includes image assets for the ChatGPT app submission package", () => {
    const iconPath = join(kitRoot, "assets/icon.png");
    const dimensions = readPngDimensions("assets/icon.png");

    expect(existsSync(iconPath)).toBe(true);
    expect(existsSync(join(kitRoot, "assets/icon.svg"))).toBe(false);
    expect(statSync(iconPath).size).toBeLessThanOrEqual(10_000);
    expect(dimensions.width).toBeGreaterThanOrEqual(256);
    expect(dimensions.height).toBeGreaterThanOrEqual(256);

    for (const asset of ["assets/listing-card.svg", "assets/widget-preview.svg"]) {
      expect(existsSync(join(kitRoot, asset))).toBe(true);
      const svg = readKitFile(asset);
      expect(svg).toContain("<svg");
      expect(svg).toContain("TokenTrace");
    }
  });

  it("keeps the submission kit in the npm package inspection contract", () => {
    const inspectScript = readFileSync(join(process.cwd(), "scripts/package-inspect.mjs"), "utf8");

    expect(packageJson.files).toContain("docs/chatgpt-app");
    expect(inspectScript).toContain("docs/chatgpt-app/manual-release-steps.md");
    expect(inspectScript).toContain("docs/chatgpt-app/assets/icon.png");
    expect(inspectScript).not.toContain("docs/chatgpt-app/assets/icon.svg");
  });
});
