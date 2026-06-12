import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildAgentDiscoveryManifest } from "@/src/lib/agent-discovery";

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"));
}

describe("agent discovery manifest", () => {
  it("publishes a stable local-first command contract for coding agents", () => {
    const manifest = buildAgentDiscoveryManifest({ version: "0.9.0" });
    const commandIds = manifest.commands.map((command) => command.id);

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.product).toMatchObject({
      name: "TokenTrace",
      packageName: "tokentrace",
      version: "0.9.0",
      homepage: "https://www.baseframelabs.com/apps/tokentrace",
      repository: "https://github.com/abhiyoheswaran1/tokentrace"
    });
    expect(manifest.discoveryCommands).toEqual([
      ["tokentrace", "agent", "--json"],
      ["tokentrace", "capabilities", "--json"],
      ["tokentrace", "mcp"]
    ]);
    expect(manifest.apiEndpoints).toEqual([
      {
        method: "GET",
        path: "/api/agent",
        description: "Return the same agent discovery manifest from the local dashboard."
      },
      {
        method: "GET",
        path: "/api/capabilities",
        description: "Alias for /api/agent."
      }
    ]);
    expect(manifest.privacy).toMatchObject({
      localFirst: true,
      telemetry: false,
      cloudAccountRequired: false
    });
    expect(commandIds).toEqual(
      expect.arrayContaining([
        "scan",
        "doctor",
        "evidence",
        "repair",
        "digest",
        "roadmap",
        "mcp",
        "chatgpt-app",
        "status",
        "claude-statusline",
        "watch",
        "anomalies",
        "query",
        "auto-classify"
      ])
    );

    // 0.18.0 local-intelligence surface: each new command must satisfy the
    // existing per-command schema (all required fields present, no extras),
    // and the read-only / zero-network defaults must hold.
    const requiredCommandFields = [
      "id",
      "title",
      "command",
      "description",
      "output",
      "mutatesLocalState",
      "startsLongRunningProcess",
      "requiresNetwork",
      "safeForAutomation",
      "useWhen",
      "followUps"
    ] as const;
    for (const id of ["anomalies", "query", "auto-classify"]) {
      const command = manifest.commands.find((entry) => entry.id === id);
      expect(command, `${id} missing from manifest.commands`).toBeDefined();
      for (const field of requiredCommandFields) {
        expect(command, `${id} missing ${field}`).toHaveProperty(field);
      }
      expect(command?.mutatesLocalState).toBe(false);
      expect(command?.requiresNetwork).toBe(false);
      expect(command?.safeForAutomation).toBe(true);
      expect(command?.output).toBe("json");
      expect(command?.command[0]).toBe("tokentrace");
    }
    expect(manifest.commands.find((command) => command.id === "scan")).toMatchObject({
      command: ["tokentrace", "scan", "--json"],
      mutatesLocalState: true,
      output: "json"
    });
    expect(manifest.commands.find((command) => command.id === "doctor")).toMatchObject({
      command: ["tokentrace", "doctor", "--json"],
      mutatesLocalState: false,
      output: "json"
    });
    expect(manifest.commands.find((command) => command.id === "roadmap")).toMatchObject({
      command: ["tokentrace", "roadmap", "--json"],
      mutatesLocalState: false,
      output: "json"
    });
    expect(manifest.commands.find((command) => command.id === "mcp")).toMatchObject({
      command: ["tokentrace", "mcp"],
      mutatesLocalState: false,
      startsLongRunningProcess: true,
      output: "terminal"
    });
    expect(manifest.commands.find((command) => command.id === "chatgpt-app")).toMatchObject({
      command: ["tokentrace", "chatgpt-app"],
      mutatesLocalState: false,
      startsLongRunningProcess: true,
      output: "terminal"
    });
    expect(manifest.integrations.claudeCode.statusLineSetupCommand).toEqual([
      "tokentrace",
      "statusline",
      "setup",
      "claude"
    ]);
    expect(manifest.integrations.codex.recommendedFallbackCommand).toEqual([
      "tokentrace",
      "watch",
      "--session",
      "--compact"
    ]);
    expect(manifest.workflows.map((workflow) => workflow.id)).toContain("first-use");
    expect(manifest.commands.flatMap((command) => command.followUps)).toEqual(
      expect.arrayContaining([
        ["tokentrace", "doctor", "--json"],
        ["tokentrace", "evidence", "--json", "--metric=unknown-cost"]
      ])
    );
    expect(manifest.guardrails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "no-reset-without-human" }),
        expect.objectContaining({ id: "processed-is-not-context" })
      ])
    );
    expect(() => JSON.stringify(manifest)).not.toThrow();
  });

  it("keeps the published schema and package-level agent docs aligned", () => {
    const manifest = buildAgentDiscoveryManifest({ version: "0.9.0" });
    const schema = readJson("docs/agent-discovery.schema.json");
    const packageJson = readJson("package.json");
    const agentGuide = fs.readFileSync(path.join(process.cwd(), "TOKENTRACE_AGENT.md"), "utf8");
    const llmsText = fs.readFileSync(path.join(process.cwd(), "llms.txt"), "utf8");
    const adoptionGuide = fs.readFileSync(path.join(process.cwd(), "docs/agent-adoption.md"), "utf8");

    expect(manifest.schema).toBe(schema.$id);
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "schemaVersion",
        "product",
        "discoveryCommands",
        "apiEndpoints",
        "privacy",
        "commands",
        "workflows",
        "integrations",
        "guardrails"
      ])
    );
    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        "TOKENTRACE_AGENT.md",
        "llms.txt",
        "docs/CHATGPT_APP_PROTOTYPE.md",
        "docs/agent-adoption.md",
        "docs/agent-discovery.schema.json"
      ])
    );
    expect(agentGuide).toContain("tokentrace agent --json");
    expect(agentGuide).toContain("tokentrace capabilities --json");
    expect(agentGuide).toContain("tokentrace mcp");
    expect(agentGuide).toContain("tokentrace chatgpt-app");
    expect(agentGuide).toContain("get_agent_guide");
    expect(agentGuide).toContain("tokentrace reset");
    expect(llmsText).toContain("tokentrace agent --json");
    expect(llmsText).toContain("tokentrace mcp");
    expect(llmsText).toContain("tokentrace chatgpt-app");
    expect(llmsText).toContain("get_agent_guide");
    expect(llmsText).toContain("Local-first");
    expect(adoptionGuide).toContain("io.github.abhiyoheswaran1/tokentrace");
    expect(adoptionGuide).toContain("Before reporting AI token, cost, model, or session usage");
    expect(adoptionGuide).toContain("get_evidence");
  });
});
