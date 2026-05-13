import { afterEach, describe, expect, it, vi } from "vitest";

function malformedRequest(url: string, method: string) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: "{not-json"
  });
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("write API validation", () => {
  it("rejects malformed scan JSON without starting a scan", async () => {
    const runScan = vi.fn();
    vi.doMock("@/src/ingestion/scan", () => ({ runScan }));
    const { POST } = await import("@/app/api/scan/route");

    const response = await POST(malformedRequest("http://localhost/api/scan", "POST"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "request body must be valid JSON" });
    expect(runScan).not.toHaveBeenCalled();
  });

  it("rejects malformed pricing JSON without saving a price row", async () => {
    const upsertPricing = vi.fn();
    vi.doMock("@/src/lib/pricing", () => ({
      getPricingRows: vi.fn(() => []),
      upsertPricing
    }));
    const { POST } = await import("@/app/api/prices/route");

    const response = await POST(malformedRequest("http://localhost/api/prices", "POST"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "request body must be valid JSON" });
    expect(upsertPricing).not.toHaveBeenCalled();
  });

  it("rejects invalid pricing values without saving a price row", async () => {
    const upsertPricing = vi.fn();
    vi.doMock("@/src/lib/pricing", () => ({
      getPricingRows: vi.fn(() => []),
      upsertPricing
    }));
    const { POST } = await import("@/app/api/prices/route");

    const response = await POST(new Request("http://localhost/api/prices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: "openai",
        model: "gpt-test",
        inputTokenPrice: "not-a-number",
        outputTokenPrice: 10,
        currency: "USD"
      })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "inputTokenPrice must be a non-negative number or empty" });
    expect(upsertPricing).not.toHaveBeenCalled();
  });

  it("rejects blank pricing provider and model names without saving a price row", async () => {
    const upsertPricing = vi.fn();
    vi.doMock("@/src/lib/pricing", () => ({
      getPricingRows: vi.fn(() => []),
      upsertPricing
    }));
    const { POST } = await import("@/app/api/prices/route");

    const response = await POST(new Request("http://localhost/api/prices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: " ",
        model: " ",
        inputTokenPrice: 1,
        outputTokenPrice: 10
      })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "providerId and model are required" });
    expect(upsertPricing).not.toHaveBeenCalled();
  });

  it("rejects malformed pricing refresh JSON without refreshing prices", async () => {
    const refreshPricing = vi.fn();
    vi.doMock("@/src/lib/pricing-refresh", () => ({ refreshPricing }));
    const { POST } = await import("@/app/api/prices/refresh/route");

    const response = await POST(malformedRequest("http://localhost/api/prices/refresh", "POST"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "request body must be valid JSON" });
    expect(refreshPricing).not.toHaveBeenCalled();
  });

  it("rejects malformed settings JSON without saving settings", async () => {
    const saveAppSettings = vi.fn();
    vi.doMock("@/src/db/client", () => ({ getDatabasePath: vi.fn(() => "/tmp/tokentrace.db") }));
    vi.doMock("@/src/db/settings", () => ({
      getAppSettings: vi.fn(() => ({})),
      normalizeUsageGuardrails: vi.fn(() => ({})),
      saveAppSettings
    }));
    const { PUT } = await import("@/app/api/settings/route");

    const response = await PUT(malformedRequest("http://localhost/api/settings", "PUT"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "request body must be valid JSON" });
    expect(saveAppSettings).not.toHaveBeenCalled();
  });
});
