import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("responsive polish", () => {
  it("keeps dense dashboard surfaces scrollable and page actions wrap on mobile", () => {
    const globals = read("app/globals.css");
    const typography = read("components/ui/typography.tsx");
    const overview = read("app/page.tsx");
    const summaryCards = read("components/overview/summary-cards.tsx");

    expect(globals).toContain("max-width: 100%");
    expect(globals).toContain("-webkit-overflow-scrolling: touch");
    expect(typography).toContain("flex w-full min-w-0 flex-wrap gap-2");
    expect(typography).toContain("sm:w-auto");
    expect(overview).toContain('className="table-scroll overflow-x-auto"');
    expect(summaryCards).not.toContain("whitespace-nowrap text-2xl");
  });
});
