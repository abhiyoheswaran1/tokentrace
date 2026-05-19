import { describe, expect, it } from "vitest";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";

describe("roadmap status", () => {
  it("summarizes every 0.12.0 roadmap card with evidence, rolled-up releases, and pre-release blockers", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.11.0" });

    expect(status.version).toBe("0.12.0");
    expect(status.next.version).toBe("0.19.0");
    expect(status.packageVersion).toBe("0.11.0");
    expect(status.release.versionBumped).toBe(false);
    expect(status.release.releaseAllowed).toBe(false);
    expect(status.rolledUpReleases.map((release) => release.version)).toEqual([
      "0.12.0",
      "0.13.0",
      "0.14.0",
      "0.15.0",
      "0.16.0",
      "0.17.0",
      "0.18.0"
    ]);
    expect(status.release.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("maintainer explicitly asks"),
        expect.stringContaining("CHANGELOG.md")
      ])
    );
    expect(status.cards).toHaveLength(10);
    expect(status.cards.map((card) => card.id)).toEqual([
      "TT-120-01",
      "TT-120-02",
      "TT-120-03",
      "TT-120-04",
      "TT-120-05",
      "TT-120-06",
      "TT-120-07",
      "TT-120-08",
      "TT-120-09",
      "TT-120-10"
    ]);
    expect(status.cards.every((card) => card.status === "implemented")).toBe(true);
    expect(status.cards.find((card) => card.id === "TT-120-01")).toMatchObject({
      title: "Native Adapter Expansion",
      details: expect.arrayContaining([
        expect.stringContaining("structured local usage logs"),
        expect.stringContaining("Cursor-style")
      ]),
      evidence: expect.arrayContaining([
        "src/ingestion/adapters/structured-usage-log.ts",
        "tests/native-adapters-0-12.test.ts"
      ])
    });
    expect(status.cards.find((card) => card.id === "TT-120-05")).toMatchObject({
      details: expect.arrayContaining([
        expect.stringContaining("Scoped guardrails"),
        expect.stringContaining("anomaly")
      ])
    });
    expect(status.cards.find((card) => card.id === "TT-120-10")).toMatchObject({
      title: "Agent-Readable Roadmap V2",
      evidence: expect.arrayContaining([
        "src/lib/roadmap-status.ts",
        "tests/roadmap-status.test.ts"
      ])
    });
    expect(status.handoff.actionRecipes.map((recipe) => recipe.id)).toEqual(
      expect.arrayContaining(["scan-now", "export-evidence-pack", "export-report"])
    );
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
    expect(status.cards.find((card) => card.id === "TT-120-03")).toMatchObject({
      evidence: expect.arrayContaining([
        "src/lib/evidence-pack.ts",
        "app/api/evidence-pack/route.ts",
        "tests/evidence-pack.test.ts"
      ])
    });
  });

  it("marks the roadmap release-ready after the maintainer-approved 0.12.0 bump", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.12.0" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });

  it("keeps the released roadmap ready for patch releases after 0.12.0", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.12.1" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });
});
