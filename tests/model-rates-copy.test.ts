import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Model rates user-facing copy", () => {
  it("does not present provider model rates as TokenTrace product pricing", () => {
    const sidebar = read("components/sidebar.tsx");
    const modelRatesPage = read("app/pricing/page.tsx");
    const evidencePage = read("app/evidence/page.tsx");
    const repairPage = [
      read("app/repair/page.tsx"),
      read("components/repair/repair-guidance.tsx"),
      read("components/repair/repair-items-table.tsx")
    ].join("\n");
    const guidePage = read("app/guide/page.tsx");
    const sessionsExplorer = read("components/session-explorer.tsx");
    const pricingSettings = [
      read("components/pricing-settings.tsx"),
      read("components/pricing/model-alias-suggestions-table.tsx")
    ].join("\n");

    expect(sidebar).toContain('label: "Model Rates"');
    expect(sidebar).not.toContain('label: "Pricing"');
    expect(modelRatesPage).toContain('title="Model Rates"');
    expect(modelRatesPage).toContain("TokenTrace does not bill or meter usage.");
    expect(modelRatesPage).not.toContain("Pricing Configuration");
    expect(evidencePage).toContain("Set model rate");
    expect(evidencePage).not.toContain("Pricing / repair");
    expect(repairPage).toContain("Set model rate");
    expect(repairPage).toContain("Model Rates");
    expect(repairPage).not.toContain("Configure price");
    expect(sessionsExplorer).toContain("Model rates");
    expect(pricingSettings).toContain("Set model rate");
    expect(pricingSettings).toContain("Review parser");
    expect(guidePage).toContain("Fix Data, Model Rates, Evidence");
  });
});
