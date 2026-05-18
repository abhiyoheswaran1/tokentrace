import { describe, expect, it } from "vitest";

describe("roadmap API", () => {
  it("serves roadmap implementation status from the local dashboard API", async () => {
    const { GET } = await import("@/app/api/roadmap/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.version).toBe("0.10.0");
    expect(body.packageVersion).toBe("0.10.0");
    expect(body.cards).toHaveLength(6);
    expect(body.cards.every((card: { status: string }) => card.status === "implemented")).toBe(true);
    expect(body.release.releaseAllowed).toBe(true);
  });
});
