import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview token accounting card", () => {
  it("groups processed, fresh, and cached token metrics into one accounting card", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const source = fs.readFileSync(path.join(process.cwd(), "components/overview/summary-cards.tsx"), "utf8");

    expect(source).toContain("function TokenAccountingCard");
    expect(page).toContain("<TokenAccountingCard");
    expect(source).toContain("Token Accounting");
    expect(source).toContain("Fresh / non-cache");
    expect(source).toContain('aria-label={`View ${action.label.toLowerCase()} token evidence`}');
    expect(source).toContain("<span>View evidence</span>");
    expect(source).not.toContain('label="Non-cache tokens"');
    expect(source).not.toContain('label="Cached tokens"');
  });
});
