import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PricingRow } from "@/src/lib/pricing";
import {
  findDuplicatePricingRows,
  parsePricingRowsCsv,
  pricingSaveResultCopy,
  serializePricingRowsCsv,
  validatePricingRow
} from "@/components/pricing/pricing-workflow";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function row(patch: Partial<PricingRow> = {}): PricingRow {
  return {
    id: patch.id ?? "row-1",
    providerId: patch.providerId ?? "openai",
    provider: patch.provider ?? "OpenAI",
    model: patch.model ?? "gpt-4.1",
    inputTokenPrice: patch.inputTokenPrice ?? 2,
    outputTokenPrice: patch.outputTokenPrice ?? 8,
    cachedInputTokenPrice: patch.cachedInputTokenPrice ?? null,
    cacheWriteTokenPrice: patch.cacheWriteTokenPrice ?? null,
    currency: patch.currency ?? "USD",
    effectiveFrom: patch.effectiveFrom ?? null
  };
}

describe("pricing settings polish", () => {
  it("validates model-rate edits with actionable copy", () => {
    expect(validatePricingRow(row({ providerId: "", model: "", inputTokenPrice: -1, currency: "US" })).errors).toEqual(
      expect.arrayContaining([
        "Provider ID is required.",
        "Model name is required.",
        "Input price must be zero or greater.",
        "Currency should be a 3-letter code such as USD."
      ])
    );
  });

  it("detects duplicate provider/model rows before saving", () => {
    expect(
      findDuplicatePricingRows([
        row({ id: "a", providerId: "OpenAI", model: "GPT-4.1" }),
        row({ id: "b", providerId: "openai", model: "gpt-4.1" }),
        row({ id: "c", providerId: "anthropic", model: "claude-sonnet-4" })
      ])
    ).toEqual([
      {
        key: "openai::gpt-4.1",
        label: "OpenAI / GPT-4.1",
        rowIds: ["a", "b"]
      }
    ]);
  });

  it("round-trips CSV imports and exports for bulk rate edits", () => {
    const csv = serializePricingRowsCsv([row({ providerId: "anthropic", provider: "Anthropic", model: "claude-sonnet-4" })]);

    expect(csv).toContain("providerId,providerName,model,inputTokenPrice,outputTokenPrice");
    expect(parsePricingRowsCsv(csv).rows[0]).toMatchObject({
      providerId: "anthropic",
      providerName: "Anthropic",
      model: "claude-sonnet-4",
      inputTokenPrice: 2,
      outputTokenPrice: 8,
      currency: "USD"
    });
  });

  it("summarizes save results around repricing and repair resolution", () => {
    expect(
      pricingSaveResultCopy({
        costsRecalculated: 14,
        interactionsChecked: 20,
        unknownCostInteractions: 3,
        modelAliasesUpdated: 1,
        resolvedRepairItems: 2
      })
    ).toBe("Price saved. 14 interactions repriced, 2 repair items resolved, 3 unknown-cost interactions still need rate or parser review.");
  });

  it("keeps the component wired to the helper workflow and bulk ergonomics", () => {
    const component = read("components/pricing-settings.tsx");
    const controller = read("components/pricing/use-pricing-settings-controller.ts");
    const pricingUi = [
      component,
      controller,
      read("components/pricing/model-rates-table.tsx"),
      read("components/pricing/pricing-bulk-panel.tsx"),
      read("components/pricing/pricing-context-card.tsx"),
      read("components/pricing/model-alias-suggestions-table.tsx")
    ].join("\n");
    const workflow = read("components/pricing/pricing-workflow.ts");

    expect(component).toContain("@/components/pricing/use-pricing-settings-controller");
    expect(controller).toContain("@/components/pricing/pricing-workflow");
    expect(pricingUi).toContain("duplicateRows");
    expect(pricingUi).toContain("CSV import/export");
    expect(pricingUi).toContain("Export visible CSV");
    expect(pricingUi).toContain("Import CSV rates");
    expect(pricingUi).toContain("validationByRowId");
    expect(workflow).toContain("export function validatePricingRow");
    expect(workflow).toContain("export function findDuplicatePricingRows");
    expect(workflow).toContain("export function parsePricingRowsCsv");
  });
});
