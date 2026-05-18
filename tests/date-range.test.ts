import { describe, expect, it } from "vitest";
import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";

describe("date range resolution", () => {
  const now = new Date(2026, 4, 9, 12);

  it("defaults the dashboard period to all time", () => {
    const range = resolveDateRange(undefined, now);

    expect(range.key).toBe("all");
    expect(range.label).toBe("All time");
    expect(range.fromInput).toBe("");
    expect(range.toInput).toBe("");
    expect(range.filters).toEqual({});
  });

  it("builds an inclusive last-7-days range with an exclusive end", () => {
    const range = resolveDateRange(new URLSearchParams("range=7d"), now);

    expect(range.label).toBe("Last 7 days");
    expect(range.fromInput).toBe("2026-05-03");
    expect(range.toInput).toBe("2026-05-09");
    expect(range.filters.from).toBe(new Date(2026, 4, 3).getTime());
    expect(range.filters.to).toBe(new Date(2026, 4, 10).getTime());
  });

  it("uses custom date inputs when provided", () => {
    const range = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-04-01&to=2026-04-30"),
      now
    );

    expect(range.label).toBe("2026-04-01 to 2026-04-30");
    expect(range.filters.from).toBe(new Date(2026, 3, 1).getTime());
    expect(range.filters.to).toBe(new Date(2026, 4, 1).getTime());
  });

  it("rejects custom dates that roll over into a different calendar day", () => {
    const range = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-02-31&to=2026-03-01"),
      now
    );

    expect(range.label).toBe("Through 2026-03-01");
    expect(range.filters.from).toBeNull();
    expect(range.filters.to).toBe(new Date(2026, 2, 2).getTime());
    expect(range.fromInput).toBe("");
    expect(range.toInput).toBe("2026-03-01");
  });

  it("serializes selected ranges for evidence and repair links", () => {
    const custom = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-04-01&to=2026-04-30"),
      now
    );

    expect(dateRangeQueryParams(custom)).toEqual({
      range: "custom",
      from: "2026-04-01",
      to: "2026-04-30"
    });
    expect(dateRangeQueryParams(resolveDateRange(new URLSearchParams("range=all"), now))).toEqual({
      range: undefined
    });
    expect(mergeHrefParams("/evidence?metric=unknown-cost", dateRangeQueryParams(custom))).toBe(
      "/evidence?metric=unknown-cost&range=custom&from=2026-04-01&to=2026-04-30"
    );
    expect(mergeHrefParams("/repair?key=repair%3Av1%3Aabc", dateRangeQueryParams(resolveDateRange(new URLSearchParams("range=7d"), now)))).toBe(
      "/repair?key=repair%3Av1%3Aabc&range=7d"
    );
  });
});
