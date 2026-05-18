import { describe, expect, it } from "vitest";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";

describe("roadmap status", () => {
  it("summarizes every 0.10.0 roadmap card with evidence and pre-release blockers", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.9.0" });

    expect(status.version).toBe("0.10.0");
    expect(status.packageVersion).toBe("0.9.0");
    expect(status.release.versionBumped).toBe(false);
    expect(status.release.releaseAllowed).toBe(false);
    expect(status.release.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("maintainer explicitly asks"),
        expect.stringContaining("CHANGELOG.md")
      ])
    );
    expect(status.cards).toHaveLength(6);
    expect(status.cards.map((card) => card.id)).toEqual([
      "TT-100-01",
      "TT-100-02",
      "TT-100-03",
      "TT-100-04",
      "TT-100-05",
      "TT-100-06"
    ]);
    expect(status.cards.every((card) => card.status === "implemented")).toBe(true);
    expect(status.cards.find((card) => card.id === "TT-100-01")).toMatchObject({
      title: "In-App Guide",
      details: expect.arrayContaining([
        expect.stringContaining("First-run guided setup"),
        expect.stringContaining("release readiness")
      ]),
      evidence: expect.arrayContaining(["app/guide/page.tsx", "tests/guide-page.test.tsx"])
    });
    expect(status.cards.find((card) => card.id === "TT-100-06")).toMatchObject({
      details: expect.arrayContaining([
        expect.stringContaining("Overview metric cards expose trust annotations"),
        expect.stringContaining("empty-state playbook")
      ])
    });
    expect(status.cards.find((card) => card.id === "TT-100-05")).toMatchObject({
      title: "Agent Discovery Contract",
      evidence: expect.arrayContaining([
        "src/lib/agent-discovery.ts",
        "app/api/agent/route.ts",
        "TOKENTRACE_AGENT.md"
      ])
    });
    expect(status.verification.requiredCommands).toEqual(
      expect.arrayContaining([
        "npm run verify",
        "npm run build",
        "npm run smoke:cli",
        "npm run smoke:packed",
        "npm run package:inspect",
        "npm run projscan:doctor"
      ])
    );
    expect(status.cards.find((card) => card.id === "TT-100-06")).toMatchObject({
      evidence: expect.arrayContaining([
        "scripts/package-inspect.mjs",
        "scripts/smoke-packed-install.mjs",
        "tests/package-trust.test.ts"
      ])
    });
  });

  it("marks the roadmap release-ready after the maintainer-approved 0.10.0 bump", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.10.0" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });

  it("keeps the released roadmap ready for patch releases after 0.10.0", () => {
    const status = buildRoadmapStatus({ packageVersion: "0.10.1" });

    expect(status.release.versionBumped).toBe(true);
    expect(status.release.releaseAllowed).toBe(true);
    expect(status.release.blockers).toEqual([]);
  });
});
