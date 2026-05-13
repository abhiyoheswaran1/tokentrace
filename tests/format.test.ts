import { describe, expect, it } from "vitest";
import { formatExactTokens, formatSignedTokens, formatTokens } from "@/src/lib/format";

describe("token formatting", () => {
  it("uses billions instead of thousands of millions for large dashboard values", () => {
    expect(formatTokens(22_309_350_000)).toBe("22.31B");
    expect(formatTokens(7_501_150_000)).toBe("7.50B");
  });

  it("promotes compact units when rounding would display 1000 of the smaller unit", () => {
    expect(formatTokens(999_995_000)).toBe("1.00B");
    expect(formatTokens(999_950)).toBe("1.00M");
  });

  it("keeps million and thousand units for smaller compact values", () => {
    expect(formatTokens(109_980_000)).toBe("109.98M");
    expect(formatTokens(52_730)).toBe("52.7K");
    expect(formatTokens(408)).toBe("408");
  });

  it("formats signed token deltas with the same compact units", () => {
    expect(formatSignedTokens(206_743_041)).toBe("+206.74M");
    expect(formatSignedTokens(-1_274_000_000)).toBe("-1.27B");
    expect(formatSignedTokens(0)).toBe("0");
  });

  it("keeps exact token counts available for evidence surfaces", () => {
    expect(formatExactTokens(22_309_350_000)).toBe("22,309,350,000");
    expect(formatExactTokens(null)).toBe("0");
  });
});
