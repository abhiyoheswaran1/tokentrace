import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Repair workflow polish", () => {
  it("keeps unknown-cost repair guidance decisive and state copy explicit", () => {
    const page = read("app/repair/page.tsx");
    const stateControl = read("components/repair-state-control.tsx");

    expect(page).toContain("function RepairGuidancePanel");
    expect(page).toContain("Top cause");
    expect(page).toContain("Next best repair");
    expect(page).toContain("What changes after repair");
    expect(page).toContain("After setting the model rate");
    expect(page).toContain("stateCopy");
    expect(stateControl).toContain("statusDescription");
    expect(stateControl).toContain("Resolved means the local fix has been verified.");
    expect(stateControl).toContain("Ignored stays in evidence but leaves active repair focus.");
    expect(stateControl).toContain("Parser review means source metadata needs inspection.");
  });
});
