import { spawnSync } from "node:child_process";
import process from "node:process";

export function run(context, args, options = {}) {
  const result = spawnSync(process.execPath, [context.bin, ...args], {
    cwd: context.root,
    env: context.env,
    encoding: "utf8",
    input: options.input,
    timeout: options.timeout ?? 30_000
  });

  if (result.status !== 0) {
    throw new Error(
      `tokentrace ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result.stdout;
}

export function jsonCommand(context, args) {
  const output = run(context, args);
  return JSON.parse(output);
}

function mcpSmoke(context) {
  const input = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }
  ].map((message) => JSON.stringify(message)).join("\n") + "\n";
  const output = run(context, ["mcp"], { input, timeout: 30_000 });
  const responses = output.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const toolNames = responses[1]?.result?.tools?.map((tool) => tool.name) ?? [];
  if (!toolNames.includes("get_agent_guide") || !toolNames.includes("get_capabilities") || !toolNames.includes("run_scan")) {
    throw new Error("MCP tools/list is missing expected TokenTrace tools.");
  }

  const selftest = jsonCommand(context, ["mcp", "selftest", "--json"]);
  if (selftest.ok !== true || !selftest.tools?.includes("get_agent_guide")) {
    throw new Error("MCP selftest did not verify the agent guide tool.");
  }
}

export function expectFailure(context, args, expectedStderr) {
  const result = spawnSync(process.execPath, [context.bin, ...args], {
    cwd: context.root,
    env: context.env,
    encoding: "utf8",
    timeout: 30_000
  });

  if (result.status === 0) {
    throw new Error(`tokentrace ${args.join(" ")} unexpectedly succeeded`);
  }
  if (!result.stderr.includes(expectedStderr)) {
    throw new Error(
      `tokentrace ${args.join(" ")} failed with unexpected stderr\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
}

export async function smokeCliDiscovery(context) {
  try {
    const version = run(context, ["--version"]).trim();
    if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`Unexpected version output: ${version}`);

    const agent = jsonCommand(context, ["agent", "--json"]);
    if (agent.schemaVersion !== 1 || !agent.commands?.length) {
      throw new Error("Agent discovery JSON is missing schema or commands.");
    }

    const capabilities = jsonCommand(context, ["capabilities", "--json"]);
    if (!capabilities.discoveryCommands?.some((command) => command.join(" ") === "tokentrace agent --json")) {
      throw new Error("Capabilities alias is missing agent discovery command.");
    }

    const roadmap = jsonCommand(context, ["roadmap", "--json"]);
    if (roadmap.version !== "0.12.0" || roadmap.release?.releaseAllowed !== true || roadmap.handoff?.schemaVersion !== "tokentrace.roadmap.v2") {
      throw new Error("Roadmap JSON is missing 0.12.0 release-ready handoff status.");
    }

    mcpSmoke(context);
  } catch (error) {
    throw new Error(`CLI discovery smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function smokeCliData(context) {
  try {
    const scan = jsonCommand(context, ["scan", "fixtures/generic-jsonl", "--json"]);
    if (scan.recordsImported < 1) throw new Error("Expected fixture scan to import records.");

    const doctor = jsonCommand(context, ["doctor", "--json"]);
    if (!doctor.supportMatrix?.summary) throw new Error("Doctor JSON is missing support matrix.");

    const evidence = jsonCommand(context, ["evidence", "--json"]);
    if (!evidence.metric || !evidence.totals) throw new Error("Evidence JSON is missing trail data.");
    expectFailure(context, ["evidence", "--metric=not-real", "--json"], "Invalid evidence metric");
    expectFailure(context, ["evidence", "--json", "--bogus"], "Unknown option");

    const repair = jsonCommand(context, ["repair", "--json"]);
    if (!repair.summary || !Array.isArray(repair.groups)) throw new Error("Repair JSON is missing workbench data.");
    expectFailure(context, ["repair", "--json", "--bogus"], "Unknown option");

    const digest = jsonCommand(context, ["digest", "--json"]);
    if (!digest.topReviewItem?.title) throw new Error("Digest JSON is missing topReviewItem.");

    const digestSince = jsonCommand(context, ["digest", "--json", "--since", "yesterday"]);
    if (!digestSince.scopeLabel) throw new Error("Digest --since JSON is missing scopeLabel.");

    const markdownReport = run(context, ["report", "--markdown", "--since", "yesterday"]);
    if (!markdownReport.includes("# TokenTrace Local Report")) throw new Error("Markdown report is missing title.");

    const review = jsonCommand(context, ["review", "--json"]);
    if (!review.headline) throw new Error("Review JSON is missing headline.");

    const status = jsonCommand(context, ["status", "--json"]);
    if (typeof status.totalTokens !== "number") throw new Error("Status JSON is missing totalTokens.");

    const setup = run(context, ["statusline", "setup", "claude"]);
    if (!setup.includes("statusLine")) throw new Error("Claude setup output is missing statusLine config.");

    const statusLine = run(context, ["statusline", "claude", "--compact"], {
      input: JSON.stringify({
        transcript_path: `${context.home}/missing-transcript.jsonl`,
        model: { display_name: "Claude" },
        workspace: { current_dir: context.root }
      })
    });
    if (!/(TokenTrace|TT)/.test(statusLine)) throw new Error("Claude status line output is missing TokenTrace branding.");
  } catch (error) {
    throw new Error(`CLI JSON/data smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
