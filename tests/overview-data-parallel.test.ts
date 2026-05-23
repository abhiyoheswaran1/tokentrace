import { describe, expect, it, vi } from "vitest";
import type { ResolvedDateRange } from "@/src/lib/date-range";

describe("getOverviewData parallelism", () => {
  it("overlaps independent sub-queries via Promise.all", async () => {
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
    vi.doMock("@/src/lib/first-run-status", () => ({
      buildFirstRunStatus: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/lib/post-session-review", () => ({
      buildPostSessionReview: vi.fn(() => ({}))
    }));
    vi.doMock("@/src/lib/date-range", () => ({
      dateRangeQueryParams: vi.fn(() => ({})),
      mergeHrefParams: vi.fn((href: string) => href)
    }));

    const { getOverviewData } = await import("@/src/lib/overview-data");
    const range = { key: "all", filters: {} } as unknown as ResolvedDateRange;

    const start = Date.now();
    await getOverviewData(range);
    const elapsed = Date.now() - start;

    // Five 50ms sub-queries sum to ~250ms when sequential. With Promise.all,
    // the async filesystem wait overlaps with the serialized sync spins, so
    // total wall-clock should come in around 200ms — well below the 250ms
    // sequential floor.
    expect(elapsed).toBeLessThan(225);
  });
});
