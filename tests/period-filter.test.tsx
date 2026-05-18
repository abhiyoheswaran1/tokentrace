import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PeriodFilter } from "@/components/period-filter";
import { resolveDateRange } from "@/src/lib/date-range";

describe("PeriodFilter", () => {
  it("defaults the page period to all time while keeping 60 days available as a preset", () => {
    const range = resolveDateRange(undefined, new Date(2026, 4, 9, 12));

    const html = renderToStaticMarkup(<PeriodFilter range={range} />);

    expect(html).toContain("60 days");
    expect(html).toContain("All time");
    expect(html).not.toContain("Last 60 days");
    expect(html).toContain('href="/"');
  });

  it("keeps the desktop period filter as one compact toolbar while mobile can wrap", () => {
    const range = resolveDateRange(
      new URLSearchParams("range=custom&from=2026-04-01&to=2026-04-30"),
      new Date(2026, 4, 9, 12)
    );

    const html = renderToStaticMarkup(<PeriodFilter range={range} />);

    expect(html).toContain("Custom range");
    expect(html).toContain('value="2026-04-01"');
    expect(html).toContain('value="2026-04-30"');
    expect(html).toContain("period-preset-scroll");
    expect(html).toContain("period-custom-row");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-0 max-w-full");
    expect(html).toContain("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3");
    expect(html).toContain("md:overflow-visible");
    expect(html).toContain("md:w-auto md:flex-wrap");
    expect(html).toContain("ml-auto flex min-w-0 flex-wrap items-center gap-2");
    expect(html).not.toContain("lg:flex-row");
    expect(html).not.toContain("xl:flex-row");
    expect(html).toContain("shrink-0");
    expect(html).toContain("period-date-field");
    expect(html).toContain("period-date-input");
    expect(html).toContain("appearance-none");
    expect(html).toContain("period-date-icon");
    expect(html).toContain("pointer-events-none absolute right-3");
    expect(html).not.toContain("min-w-[720px]");
  });
});
