import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("pricing settings controller", () => {
  it("moves save, refresh, import, export, duplicate, and validation orchestration into a hook", () => {
    const hook = read("components/pricing/use-pricing-settings-controller.ts");
    const component = read("components/pricing-settings.tsx");

    expect(hook).toContain("export function usePricingSettingsController");
    expect(hook).toContain("saveRow");
    expect(hook).toContain("refreshDefaultPrices");
    expect(hook).toContain("exportVisibleCsv");
    expect(hook).toContain("importCsvRates");
    expect(hook).toContain("duplicateRows");
    expect(hook).toContain("validationByRowId");
    expect(hook).toContain("focusedSuggestion");

    expect(component).toContain("@/components/pricing/use-pricing-settings-controller");
    expect(component).not.toContain("function pricingPayload");
    expect(component).not.toContain("async function readResponseError");
    expect(component).not.toContain("fetch(\"/api/prices\"");
  });
});
