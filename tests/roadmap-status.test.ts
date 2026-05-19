import { describe, expect, it } from "vitest";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";

describe("roadmap status", () => {
  it("summarizes every 0.11.0 roadmap card with evidence and pre-release blockers", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.10.1" });

    expect(status.version).toBe("0.11.0");
    expect(status.packageVersion).toBe("0.10.1");
    expect(status.release.versionBumped).toBe(false);
    expect(status.release.releaseAllowed).toBe(false);
    expect(status.release.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("maintainer explicitly asks"),
        expect.stringContaining("CHANGELOG.md")
      ])
    );
    expect(status.cards).toHaveLength(7);
    expect(status.cards.map((card) => card.id)).toEqual([
      "TT-110-01",
      "TT-110-02",
      "TT-110-03",
      "TT-110-04",
      "TT-110-05",
      "TT-110-06",
      "TT-110-07"
    ]);
    expect(status.cards.every((card) => card.status === "implemented")).toBe(true);
    expect(status.cards.find((card) => card.id === "TT-110-01")).toMatchObject({
      title: "Tokenizer-Backed Estimates",
      details: expect.arrayContaining([
        expect.stringContaining("tokenizer estimate"),
        expect.stringContaining("simple estimate")
      ]),
      evidence: expect.arrayContaining(["src/lib/token-estimator.ts", "tests/token-estimator.test.ts"])
    });
    expect(status.cards.find((card) => card.id === "TT-110-06")).toMatchObject({
      details: expect.arrayContaining([
        expect.stringContaining("Data confidence combines"),
        expect.stringContaining("Overview displays")
      ])
    });
    expect(status.cards.find((card) => card.id === "TT-110-07")).toMatchObject({
      title: "Supply Chain Check In Scan Health",
      evidence: expect.arrayContaining([
        "scripts/security-ioc.mjs",
        "components/scan-health-summary.tsx",
        "tests/security-ioc.test.ts"
      ])
    });
    expect(status.verification.requiredCommands).toEqual(
      expect.arrayContaining([
        "npm run verify",
        "npm run build",
        "npm run smoke:cli",
        "npm run smoke:packed",
        "npm run security:ioc",
        "npm run package:inspect",
        "npm run projscan:doctor"
      ])
    );
    expect(status.cards.find((card) => card.id === "TT-110-04")).toMatchObject({
      evidence: expect.arrayContaining([
        "app/api/repair-items/route.ts",
        "components/repair-bulk-actions.tsx",
        "tests/unknown-cost-repair.test.ts"
      ])
    });
  });

  it("marks the roadmap release-ready after the maintainer-approved 0.11.0 bump", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.11.0" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });

  it("keeps the released roadmap ready for patch releases after 0.11.0", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.11.1" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });
});
