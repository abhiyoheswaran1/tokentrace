import { describe, expect, it } from "vitest";
import { formatLocalDateKey } from "@/src/db/sqlite-functions";

function localDay(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

describe("SQLite helper functions", () => {
  it("formats timestamps as local calendar date keys", () => {
    expect(formatLocalDateKey(localDay(2026, 5, 3))).toBe("2026-05-03");
    expect(formatLocalDateKey(localDay(2026, 12, 9))).toBe("2026-12-09");
  });

  it("returns a stable fallback date for invalid timestamps", () => {
    expect(formatLocalDateKey(null)).toBe("1970-01-01");
    expect(formatLocalDateKey(Number.NaN)).toBe("1970-01-01");
    expect(formatLocalDateKey("not-a-number")).toBe("1970-01-01");
  });
});
