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

  it("allows scan requests without a body and trims explicit folder values", async () => {
    const runScan = vi.fn(() => ({ scanRunId: "scan-1" }));
    vi.doMock("@/src/ingestion/scan", () => ({ runScan }));
    const { POST } = await import("@/app/api/scan/route");

    const emptyResponse = await POST(new Request("http://localhost/api/scan", { method: "POST" }));
    expect(emptyResponse.status).toBe(200);
    expect(runScan).toHaveBeenLastCalledWith({ folders: undefined, force: false });

    const explicitResponse = await POST(new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        folders: [" /tmp/usage ", "", "   ", 42, "/tmp/other"],
        force: true
      })
    }));

    expect(explicitResponse.status).toBe(200);
    expect(runScan).toHaveBeenLastCalledWith({ folders: ["/tmp/usage", "/tmp/other"], force: true });

    const stringFalseResponse = await POST(new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force: "false" })
    }));
    expect(stringFalseResponse.status).toBe(200);
    expect(runScan).toHaveBeenLastCalledWith({ folders: undefined, force: false });
  });

  it("compacts manual scan responses for browser feedback", async () => {
    const runScan = vi.fn(() => ({
      scanRunId: "scan-1",
      filesScanned: 100,
      recordsImported: 2,
      costsRecalculated: 3,
      unknownCostInteractions: 4,
      staleNonUsageSessionsRemoved: 0,
      warnings: Array.from({ length: 30 }, (_, index) => `warning-${index}`),
      errors: Array.from({ length: 3 }, (_, index) => `error-${index}`)
    }));
    vi.doMock("@/src/ingestion/scan", () => ({ runScan }));
    const { POST } = await import("@/app/api/scan/route");

    const response = await POST(new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compact: true })
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warningCount).toBe(30);
    expect(body.errorCount).toBe(3);
    expect(body.warnings).toHaveLength(25);
    expect(body.errors).toHaveLength(3);
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

  it("rejects non-string and non-number pricing values without coercing them", async () => {
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
        inputTokenPrice: true,
        outputTokenPrice: [],
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

  it("allows pricing refresh requests without a body and rejects invalid sources", async () => {
    const refreshPricing = vi.fn(() => ({ source: "remote" }));
    vi.doMock("@/src/lib/pricing-refresh", () => ({ refreshPricing }));
    const { POST } = await import("@/app/api/prices/refresh/route");

    const emptyResponse = await POST(new Request("http://localhost/api/prices/refresh", { method: "POST" }));
    expect(emptyResponse.status).toBe(200);
    expect(refreshPricing).toHaveBeenLastCalledWith({ source: "remote", force: false });

    const stringFalseResponse = await POST(new Request("http://localhost/api/prices/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force: "false" })
    }));
    expect(stringFalseResponse.status).toBe(200);
    expect(refreshPricing).toHaveBeenLastCalledWith({ source: "remote", force: false });

    const invalidResponse = await POST(new Request("http://localhost/api/prices/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "bundle" })
    }));
    const body = await invalidResponse.json();

    expect(invalidResponse.status).toBe(400);
    expect(body).toEqual({ error: "source must be remote or bundled" });
    expect(refreshPricing).toHaveBeenCalledTimes(2);
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

  it("trims settings custom folders and drops blank entries before saving", async () => {
    const saveAppSettings = vi.fn((settings) => settings);
    vi.doMock("@/src/db/client", () => ({ getDatabasePath: vi.fn(() => "/tmp/tokentrace.db") }));
    vi.doMock("@/src/db/settings", () => ({
      getAppSettings: vi.fn(() => ({})),
      normalizeUsageGuardrails: vi.fn(() => ({ monthlyCostLimitUsd: null, monthlyTokenLimit: null, scoped: [] })),
      saveAppSettings
    }));
    const { PUT } = await import("@/app/api/settings/route");

    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customFolders: [" /tmp/usage ", "", "   ", 42, "/tmp/other"],
        storeRawMessageContent: "false"
      })
    }));

    expect(response.status).toBe(200);
    expect(saveAppSettings).toHaveBeenCalledWith({
      customFolders: ["/tmp/usage", "/tmp/other"],
      storeRawMessageContent: false,
      usageGuardrails: { monthlyCostLimitUsd: null, monthlyTokenLimit: null, scoped: [] },
      importProfiles: expect.arrayContaining([
        expect.objectContaining({ id: "structured-usage-log" }),
        expect.objectContaining({ id: "cursor-chat-export" }),
        expect.objectContaining({ id: "generic-jsonl" }),
        expect.objectContaining({ id: "generic-text-log" }),
        expect.objectContaining({ id: "sqlite-history" })
      ]),
      scanSchedule: {
        mode: "manual",
        retentionRuns: 30,
        lastScheduledScanAt: null,
        lastScheduledScanStatus: null,
        lastScheduledScanMessage: null
      }
    });
  });
});
