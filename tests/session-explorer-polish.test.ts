import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Session Explorer polish", () => {
  it("keeps dense session review controls ergonomic", () => {
    const filtering = read("components/session-explorer/filtering.ts");
    const filtersHook = read("components/session-explorer/use-session-filters.ts");
    const filtersSection = read("components/session-explorer/filters-section.tsx");
    const sessionsTable = read("components/session-explorer/sessions-table.tsx");

    expect(filtering).toContain('type RowDensity = "comfortable" | "compact"');
    expect(filtersHook).toContain("const activeFilters = useMemo");
    expect(filtersSection).toContain('aria-live="polite"');
    expect(filtersSection).toContain('aria-label="Clear filters"');
    expect(sessionsTable).toContain('aria-label="Row density"');
    expect(sessionsTable).toContain("setRowDensity");
    expect(sessionsTable).toContain("sticky top-0 z-10");
    expect(sessionsTable).toContain("No matching sessions");
    expect(sessionsTable).toContain("Clear filters and show all sessions");
  });
});
