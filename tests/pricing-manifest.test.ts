import { describe, expect, it } from "vitest";
import { normalizePricingManifest } from "@/src/lib/pricing-manifest";

describe("pricing manifest normalization", () => {
  it("does not coerce invalid price field types into numeric prices", () => {
    const manifest = normalizePricingManifest({
      schemaVersion: 1,
      models: [
        {
          id: "bad-price-shapes",
          providerId: "openai",
          name: "Bad price shapes",
          inputTokenPrice: true,
          outputTokenPrice: [],
          cachedInputTokenPrice: "",
          cacheWriteTokenPrice: "0.5"
        }
      ]
    });

    expect(manifest.models[0]).toMatchObject({
      inputTokenPrice: null,
      outputTokenPrice: null,
      cachedInputTokenPrice: null,
      cacheWriteTokenPrice: 0.5
    });
  });

  it("treats negative pricing values as unknown instead of valid prices", () => {
    const manifest = normalizePricingManifest({
      schemaVersion: 1,
      models: [
        {
          id: "negative-prices",
          providerId: "openai",
          name: "Negative prices",
          inputTokenPrice: -1,
          outputTokenPrice: "-2"
        }
      ]
    });

    expect(manifest.models[0]).toMatchObject({
      inputTokenPrice: null,
      outputTokenPrice: null
    });
  });
});
