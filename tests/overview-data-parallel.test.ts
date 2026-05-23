import { describe, expect, it, vi } from "vitest";
import type { ResolvedDateRange } from "@/src/lib/date-range";

describe("overview fetchers", () => {
  it("getOverviewPrimaryData overlaps analytics with filesystem walk via Promise.all", async () => {
    vi.resetModules();

    vi.doMock("@/src/lib/analytics", () => ({
      getAnalyticsData: vi.fn(() => {
        const end = Date.now() + 50;
        while (Date.now() < end) {
          /* spin */
        }
        return {
          scanTrust: {
            confidence: { interactions: 0, unknownCostInteractions: 0 },
            pricedModelCount: 0
          },
          sessions: [],
          summary: {},
          usageGuardrails: {},
          evidenceLinks: { "unknown-cost": "/evidence/unknown-cost" }
        };
      })
    }));
    vi.doMock("@/src/ingestion/discovery", () => ({
      getDefaultSearchRoots: vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return [];
      })
    }));
    vi.doMock("@/src/lib/first-run-status", () => ({
      buildFirstRunStatus: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/lib/date-range", () => ({
      dateRangeQueryParams: vi.fn(() => ({})),
      mergeHrefParams: vi.fn((href: string) => href)
    }));

    const { getOverviewPrimaryData } = await import("@/src/lib/overview-data");
    const range = { key: "all", filters: {} } as unknown as ResolvedDateRange;

    const start = Date.now();
    await getOverviewPrimaryData(range);
    const elapsed = Date.now() - start;

    // Sync 50ms analytics spin + async 50ms roots wait. Sequential
    // would be ~100ms; Promise.all overlaps them so wall-clock should
    // come in around 50-70ms.
    expect(elapsed).toBeLessThan(90);
  });

  it("getOverviewRepairData overlaps repair-side sub-queries via Promise.all", async () => {
    vi.resetModules();

    vi.doMock("@/src/lib/analytics", () => ({
      getAnalyticsData: vi.fn(() => {
        const end = Date.now() + 50;
        while (Date.now() < end) {
          /* spin */
        }
        return {
          scanTrust: {
            confidence: { interactions: 0, unknownCostInteractions: 0 },
            pricedModelCount: 0
          },
          sessions: [],
          summary: {},
          usageGuardrails: {},
          evidenceLinks: { "unknown-cost": "/evidence/unknown-cost" }
        };
      })
    }));
    vi.doMock("@/src/lib/accounting-invariants", () => ({
      buildAccountingInvariants: vi.fn(() => {
        const end = Date.now() + 50;
        while (Date.now() < end) {
          /* spin */
        }
        return {};
      })
    }));
    vi.doMock("@/src/lib/scan-diff", () => ({
      buildScanDiff: vi.fn(() => {
        const end = Date.now() + 50;
        while (Date.now() < end) {
          /* spin */
        }
        return {};
      })
    }));
    vi.doMock("@/src/ingestion/discovery", () => ({
      getDefaultSearchRoots: vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return [];
      })
    }));
    vi.doMock("@/src/lib/unknown-cost-repair", () => ({
      buildUnknownCostRepairWorkbench: vi.fn(() => {
        const end = Date.now() + 50;
        while (Date.now() < end) {
          /* spin */
        }
        return { groups: [] };
      })
    }));
    vi.doMock("@/src/lib/doctor", () => ({
      buildDoctorReport: vi.fn(() => ({
        latestScan: { id: null, filesScanned: 0, recordsImported: 0, zeroImportExplanation: null }
      }))
    }));
    vi.doMock("@/src/lib/post-session-review", () => ({
      buildPostSessionReview: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/lib/date-range", () => ({
      dateRangeQueryParams: vi.fn(() => ({})),
      mergeHrefParams: vi.fn((href: string) => href)
    }));

    const { getOverviewRepairData } = await import("@/src/lib/overview-data");
    const range = { key: "all", filters: {} } as unknown as ResolvedDateRange;

    const start = Date.now();
    await getOverviewRepairData(range);
    const elapsed = Date.now() - start;

    // Four 50ms sync spins + one 50ms async setTimeout. Sequential
    // would be ~250ms; with Promise.all the async setTimeout overlaps
    // the spins, landing around 200ms — well below the sequential
    // floor.
    expect(elapsed).toBeLessThan(225);
  });
});
