import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("mobile table alternatives", () => {
  it("keeps Repair repair items usable without a wide table on narrow screens", () => {
    const source = read("components/repair/repair-items-table.tsx");

    expect(source).toContain("function RepairItemsMobileList");
    expect(source).toContain('className="grid gap-3 md:hidden"');
    expect(source).toContain('className="hidden overflow-x-auto md:block"');
    expect(source).toContain("Next best");
    expect(source).toContain("Expected change");
  });

  it("keeps Model Rates editable with compact mobile cards while preserving the desktop table", () => {
    const source = read("components/pricing/model-rates-table.tsx");

    expect(source).toContain("function ModelRateMobileCards");
    expect(source).toContain('className="grid gap-3 md:hidden"');
    expect(source).toContain('className="hidden overflow-x-auto md:block"');
    expect(source).toContain("Provider/model");
    expect(source).toContain("Token rates");
  });
});
