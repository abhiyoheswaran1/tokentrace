import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("agent discovery API", () => {
  it("serves the agent discovery manifest from the local dashboard API", async () => {
    const { GET } = await import("@/app/api/agent/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.schemaVersion).toBe(1);
    expect(body.product).toMatchObject({
      name: "TokenTrace",
      packageName: "tokentrace",
      version: packageJson.version
    });
    expect(body.discoveryCommands).toContainEqual(["tokentrace", "agent", "--json"]);
    expect(body.apiEndpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/api/agent",
          method: "GET",
          description: expect.stringContaining("agent discovery")
        }),
        expect.objectContaining({
          path: "/api/capabilities",
          method: "GET"
        })
      ])
    );
  });

  it("serves the same manifest from the capabilities API alias", async () => {
    const [{ GET: agentGet }, { GET: capabilitiesGet }] = await Promise.all([
      import("@/app/api/agent/route"),
      import("@/app/api/capabilities/route")
    ]);

    const agentBody = await (await agentGet()).json();
    const capabilitiesBody = await (await capabilitiesGet()).json();

    expect(capabilitiesBody).toEqual(agentBody);
  });
});
