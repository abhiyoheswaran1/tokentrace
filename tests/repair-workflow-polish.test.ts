import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Repair workflow polish", () => {
  it("keeps unknown-cost repair guidance decisive and state copy explicit", () => {
    const page = read("app/repair/page.tsx");
    const guidance = read("components/repair/repair-guidance.tsx");
    const itemsTable = read("components/repair/repair-items-table.tsx");
    const repairUi = `${page}\n${guidance}\n${itemsTable}`;
    const repairActions = read("src/lib/repair-actions.ts");
    const stateControl = read("components/repair-state-control.tsx");

    expect(guidance).toContain("function RepairGuidancePanel");
    expect(repairUi).toContain("Top cause");
    expect(repairUi).toContain("Next best repair");
    expect(repairUi).toContain("What changes after repair");
    expect(repairActions).toContain("After setting the model rate");
    expect(repairUi).toContain("primaryAction");
    expect(repairUi).toContain("expectedChange");
    expect(repairUi).toContain("secondaryActions");
    expect(repairUi).toContain("stateCopy");
    expect(stateControl).toContain("statusDescription");
    expect(stateControl).toContain("Resolved means the local fix has been verified.");
    expect(stateControl).toContain("Ignored stays in evidence but leaves active repair focus.");
    expect(stateControl).toContain("Parser review means source metadata needs inspection.");
  });
});
