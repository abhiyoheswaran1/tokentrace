import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Repair action labels", () => {
  it("uses the same action vocabulary as Overview", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/repair/page.tsx"), "utf8");

    expect(source).toContain("Open repair");
    expect(source).toContain("Set model rate");
    expect(source).toContain("Review parser");
    expect(source).toContain("View evidence");
    expect(source).not.toContain(">Evidence<");
    expect(source).not.toContain(">Parser<");
    expect(source).not.toContain(">Repair<");
    expect(source).not.toContain(">Focus<");
    expect(source).not.toContain("View all repair items");
  });
});
