import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Session Explorer polish", () => {
  it("keeps dense session review controls ergonomic", () => {
    const source = read("components/session-explorer.tsx");

    expect(source).toContain('type RowDensity = "comfortable" | "compact"');
    expect(source).toContain("const activeFilters = useMemo");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-label="Clear filters"');
    expect(source).toContain('aria-label="Row density"');
    expect(source).toContain("setRowDensity");
    expect(source).toContain("sticky top-0 z-10");
    expect(source).toContain("No matching sessions");
    expect(source).toContain("Clear filters and show all sessions");
  });
});
