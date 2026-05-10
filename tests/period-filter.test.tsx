import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PeriodFilter } from "@/components/period-filter";
import { resolveDateRange } from "@/src/lib/date-range";

describe("PeriodFilter", () => {
  it("keeps preset and custom date controls in a single overflowable toolbar", () => {
    const range = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-04-01&to=2026-04-30"),
      new Date(2026, 4, 9, 12)
    );

    const html = renderToStaticMarkup(<PeriodFilter range={range} />);

    expect(html).toContain("Custom range");
    expect(html).toContain('value="2026-04-01"');
    expect(html).toContain('value="2026-04-30"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-[720px]");
    expect(html).toContain("flex-1 overflow-x-auto");
    expect(html).toContain("shrink-0");
    expect(html).toContain("period-date-input");
    expect(html).not.toContain("flex-wrap");
  });
});
