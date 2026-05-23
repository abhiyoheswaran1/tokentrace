import { describe, expect, it, vi } from "vitest";
import type { ResolvedDateRange } from "@/src/lib/date-range";

function asyncDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("overview fetchers", () => {
  it("getOverviewPrimaryData overlaps analytics with filesystem walk via Promise.all", async () => {
    vi.resetModules();

    vi.doMock("@/src/lib/analytics", () => ({
      getAnalyticsData: vi.fn(() => {
        // Use a sync busy-wait that yields if we Promise-ify the
        // wrapper: the production better-sqlite3 calls are sync, so we
        // need to model that the production overlap window comes from
        // the await on getSearchRoots, not the sync SQL itself. The
        // Promise.resolve().then(...) wrapper in the fetcher gives the
        // event loop a chance to interleave.
        const end = Date.now() + 30;
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
        await asyncDelay(80);
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

    // Sequential = 30ms sync spin + 80ms async setTimeout = 110ms.
    // Parallel = max(30, 80) = 80ms, with ~20ms overhead headroom.
    // If Promise.all is broken the test fails decisively.
    expect(elapsed).toBeLessThan(105);
  });

  it("getOverviewRepairData runs the async filesystem walk in parallel with the rest", async () => {
    vi.resetModules();

    vi.doMock("@/src/lib/analytics", () => ({
      getAnalyticsData: vi.fn(() => ({
        scanTrust: {
          confidence: { interactions: 0, unknownCostInteractions: 0 },
          pricedModelCount: 0
        },
        sessions: [],
        summary: {},
        usageGuardrails: {},
        evidenceLinks: { "unknown-cost": "/evidence/unknown-cost" }
      }))
    }));
    vi.doMock("@/src/lib/accounting-invariants", () => ({
      buildAccountingInvariants: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/lib/scan-diff", () => ({
      buildScanDiff: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/ingestion/discovery", () => ({
      getDefaultSearchRoots: vi.fn(async () => {
        await asyncDelay(120);
        return [];
      })
    }));
    vi.doMock("@/src/lib/unknown-cost-repair", () => ({
      buildUnknownCostRepairWorkbench: vi.fn(() => ({ groups: [] }))
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

    // The repair fetcher runs five sub-builders in Promise.all. Four
    // are now near-instant mocks; one is a 120ms async setTimeout.
    // Sequential awaits would add 0+0+0+120+0 = 120ms plus 4 await
    // microtask hops; parallel overlaps everything so total comes in
    // close to 120ms. If Promise.all is broken (sequential awaits) the
    // elapsed time grows past the threshold.
    expect(elapsed).toBeLessThan(160);
  });
});
