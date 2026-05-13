import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PeriodFilter } from "@/components/period-filter";
import { resolveDateRange } from "@/src/lib/date-range";

describe("PeriodFilter", () => {
  it("keeps preset chips scrollable while date controls wrap on narrow screens", () => {
    const range = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-04-01&to=2026-04-30"),
      new Date(2026, 4, 9, 12)
    );

    const html = renderToStaticMarkup(<PeriodFilter range={range} />);

    expect(html).toContain("Custom range");
    expect(html).toContain('value="2026-04-01"');
    expect(html).toContain('value="2026-04-30"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-0 max-w-full");
    expect(html).toContain("flex min-w-0 flex-col gap-3 xl:flex-row");
    expect(html).toContain("flex-1 overflow-x-auto");
    expect(html).toContain("flex min-w-0 flex-wrap items-center gap-2");
    expect(html).toContain("border-t border-border pt-3");
    expect(html).toContain("shrink-0");
    expect(html).toContain("period-date-field");
    expect(html).toContain("period-date-input");
    expect(html).toContain("appearance-none");
    expect(html).toContain("period-date-icon");
    expect(html).toContain("pointer-events-none absolute right-3");
    expect(html).not.toContain("min-w-[720px]");
  });
});
