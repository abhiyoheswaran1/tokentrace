import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview metric card divider alignment", () => {
  it("groups cost and sessions into one split card instead of aligning separate cards with fixed slots", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const source = fs.readFileSync(path.join(process.cwd(), "components/overview/summary-cards.tsx"), "utf8");

    expect(source).toContain("function CostSessionsCard");
    expect(page).toContain("<CostSessionsCard");
    expect(source).toContain("cost-sessions-card");
    expect(source).toContain("cost-sessions-section");
    expect(source).toContain("cost-sessions-metric-pane");
    expect(source).toContain("Cost & Sessions");
    expect(source).toContain("Local evidence");
    expect(source).toContain("Exact");
    expect(source).toContain("Estimated");
    expect(source).toContain("Unknown");
    expect(source).toContain('id="cost-sessions-help"');
    expect(source).toContain('label="Cost & Sessions"');
    expect(source).toContain('label="Cost"');
    expect(source).toContain("Sessions");
    expect(source).toContain("Cost trust");
    expect(source).toContain("Session trust");
    expect(source).toContain("md:grid-cols-2");
    expect(source).toContain("md:border-l");
    expect(source).not.toContain('label="Estimated cost"');
    expect(source).not.toContain("cost-sessions-estimated-cost-help");
    expect(source).not.toContain("metric-card-header-slot");
    expect(source).not.toContain("metric-card-detail-slot");
  });
});
