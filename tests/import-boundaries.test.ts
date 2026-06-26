import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function moduleSpecifierPattern(modulePath: string) {
  return new RegExp(`["']${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
}

describe("import boundaries", () => {
  it("keeps shared type and helper modules below their orchestration barrels", () => {
    const forbiddenImports = [
      {
        file: "src/lib/scan-health-rules.ts",
        forbidden: "@/src/lib/scan-health"
      },
      {
        file: "src/lib/unknown-cost-repair/types.ts",
        forbidden: "@/src/lib/unknown-cost-repair/auto-classify"
      },
      {
        file: "src/lib/unknown-cost-repair/auto-classify.ts",
        forbidden: "@/src/lib/unknown-cost-repair/types"
      },
      {
        file: "src/lib/evidence-trail.ts",
        forbidden: "@/src/lib/analytics"
      },
      {
        file: "src/lib/evidence/query.ts",
        forbidden: "@/src/lib/analytics"
      },
      {
        file: "src/lib/project-signals.ts",
        forbidden: "@/src/lib/analytics"
      },
      {
        file: "src/lib/review-queue.ts",
        forbidden: "@/src/lib/analytics"
      },
      {
        file: "src/lib/session-comparison.ts",
        forbidden: "@/src/lib/analytics"
      },
      {
        file: "src/lib/analytics-types.ts",
        forbidden: "@/src/lib/evidence-trail"
      },
      {
        file: "src/lib/analytics-types.ts",
        forbidden: "@/src/lib/project-signals"
      },
      {
        file: "src/lib/analytics-types.ts",
        forbidden: "@/src/lib/review-queue"
      },
      {
        file: "src/lib/analytics-types.ts",
        forbidden: "@/src/lib/session-comparison"
      },
      {
        file: "src/lib/analytics-types.ts",
        forbidden: "@/src/lib/scan-health"
      }
    ];

    for (const { file, forbidden } of forbiddenImports) {
      expect(read(file), `${file} should not import ${forbidden}`).not.toMatch(moduleSpecifierPattern(forbidden));
    }
  });
});
