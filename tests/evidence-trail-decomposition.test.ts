import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("evidence trail decomposition", () => {
  it("keeps the public evidence trail module as a thin facade", () => {
    const source = read("src/lib/evidence-trail.ts");

    expect(source.trim().split("\n").length).toBeLessThanOrEqual(80);
    expect(source).toContain('from "@/src/lib/evidence/metrics"');
    expect(source).toContain('from "@/src/lib/evidence/query"');
    expect(source).toContain('from "@/src/lib/evidence/mapping"');
  });

  it("splits metric definitions, SQL helpers, and session mapping", () => {
    const metrics = read("src/lib/evidence/metrics.ts");
    const query = read("src/lib/evidence/query.ts");
    const mapping = read("src/lib/evidence/mapping.ts");

    expect(metrics).toContain("export function parseEvidenceMetric");
    expect(metrics).toContain("metricTitles");
    expect(query).toContain("export function evidenceWhere");
    expect(query).toContain("export function metricTokenExpression");
    expect(query).toContain("export function fetchEvidenceTrailRows");
    expect(mapping).toContain("export function mapEvidenceTrail");
    expect(mapping).toContain("sessionHref");
  });
});
