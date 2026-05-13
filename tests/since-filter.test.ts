import { describe, expect, it } from "vitest";
import { resolveSinceFilter } from "@/src/lib/since-filter";

describe("since filter", () => {
  it("resolves yesterday and ISO dates into deterministic analytics filters", () => {
    const now = new Date("2026-05-13T15:30:00");

    expect(resolveSinceFilter("yesterday", { now })).toMatchObject({
      label: "Since yesterday",
      filters: {
        from: new Date("2026-05-12T00:00:00").getTime(),
        to: undefined
      }
    });
    expect(resolveSinceFilter("2026-05-01", { now })).toMatchObject({
      label: "Since 2026-05-01",
      filters: {
        from: new Date("2026-05-01T00:00:00").getTime(),
        to: undefined
      }
    });
  });

  it("uses the latest scan timestamp for --since last-scan and falls back to all time", () => {
    expect(
      resolveSinceFilter("last-scan", {
        now: new Date("2026-05-13T15:30:00"),
        latestScanStartedAt: 1_800_000_000_000
      })
    ).toEqual({
      label: "Since latest scan",
      filters: { from: 1_800_000_000_000, to: undefined }
    });

    expect(resolveSinceFilter("last-scan", { now: new Date("2026-05-13T15:30:00") })).toEqual({
      label: "All time",
      filters: {}
    });
  });

  it("rejects unsupported relative periods", () => {
    expect(() => resolveSinceFilter("soon", { now: new Date("2026-05-13T15:30:00") })).toThrow(
      "Unsupported --since value"
    );
  });
});
