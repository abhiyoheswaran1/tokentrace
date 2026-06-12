import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "@/package.json";
import { describe, expect, it } from "vitest";

const kitRoot = join(process.cwd(), "docs/chatgpt-app");

function readKitFile(relativePath: string) {
  return readFileSync(join(kitRoot, relativePath), "utf8");
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
    const realLogo = readFileSync(join(process.cwd(), "docs/assets/tokentrace-logo.svg"), "utf8").trim();
    expect(readKitFile("assets/icon.svg").trim()).toBe(realLogo);

    for (const asset of ["assets/icon.svg", "assets/listing-card.svg", "assets/widget-preview.svg"]) {
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
  });
});
