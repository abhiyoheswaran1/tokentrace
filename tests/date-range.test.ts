import { describe, expect, it } from "vitest";
import { resolveDateRange } from "@/src/lib/date-range";

describe("date range resolution", () => {
  const now = new Date(2026, 4, 9, 12);

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
});
