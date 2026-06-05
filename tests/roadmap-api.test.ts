import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

function atLeast(version: string, target: string) {
  const current = version.split(".").map(Number);
  const required = target.split(".").map(Number);
  for (let index = 0; index < required.length; index += 1) {
    if ((current[index] ?? 0) > (required[index] ?? 0)) return true;
    if ((current[index] ?? 0) < (required[index] ?? 0)) return false;
  }
  return true;
}

describe("roadmap API", () => {
  it("serves roadmap implementation status from the local dashboard API", async () => {
    const { GET } = await import("@/app/api/roadmap/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.version).toBe("0.12.0");
    expect(body.packageVersion).toBe(packageJson.version);
    expect(body.cards).toHaveLength(10);
    expect(body).not.toHaveProperty("rolledUpReleases");
    expect(body).not.toHaveProperty("next");
    expect(body.handoff.schemaVersion).toBe("tokentrace.roadmap.v2");
    expect(body.cards.every((card: { status: string }) => card.status === "implemented")).toBe(true);
    expect(body.release.releaseAllowed).toBe(atLeast(packageJson.version, "0.12.0"));
  });
});
