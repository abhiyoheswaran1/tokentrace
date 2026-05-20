import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview Usage Pulse compact layout", () => {
  it("uses a compact status strip instead of a separate headline band", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const source = fs.readFileSync(path.join(process.cwd(), "components/overview/usage-pulse-panel.tsx"), "utf8");

    expect(source).toContain("function UsagePulsePanel");
    expect(source).toContain("function PulseMetric");
    expect(page).toContain("<UsagePulsePanel comparison={data.comparison} />");
    expect(source).toContain("comparison.headline");
    expect(source).toContain("comparison.detail");
    expect(source).toContain("function usagePulsePeriodLabels");
    expect(source).toContain("Latest 7 days vs previous 7 days");
    expect(source).toContain("Selected period vs previous matching period");
    expect(source).toContain("formatPulsePercent");
    expect(source).toContain("Current");
    expect(source).toContain("Previous");
    expect(source).toContain("Change");
    expect(source).not.toContain("{delta} vs {previous}");
    expect(source).not.toContain('className="border-t px-4 py-3"');
  });
});
