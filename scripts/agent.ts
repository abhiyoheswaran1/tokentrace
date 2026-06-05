import fs from "node:fs";
import path from "node:path";
import { buildAgentDiscoveryManifest } from "@/src/lib/agent-discovery";

function usage() {
  return `Usage:
  tokentrace agent --json
  tokentrace agent --handoff [--json]
  tokentrace agent --actions [--limit N] [--json]
  tokentrace capabilities --json

Options:
  --json         Print the machine-readable agent discovery manifest (or
                 the handoff envelope when combined with --handoff).
  --handoff      Print the handoff envelope summarizing local state for the
                 next agent.
  --actions      Print the recent agent action log.
  --limit N      Limit the number of action rows returned (default 50).
  -h, --help     Print agent discovery help`;
}

function packageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

let json = false;
let help = false;
let handoff = false;
let actions = false;
let limit: number | null = null;

const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === undefined) continue;
  if (arg === "--json") {
    json = true;
  } else if (arg === "--help" || arg === "-h") {
    help = true;
  } else if (arg === "--handoff") {
    handoff = true;
  } else if (arg === "--actions") {
    actions = true;
  } else if (arg === "--limit") {
    const value = argv[index + 1];
    if (!value || value.startsWith("-")) fail("--limit requires a positive integer");
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) fail("--limit requires a positive integer");
    limit = parsed;
    index += 1;
  } else if (arg.startsWith("-")) {
    fail(`Unknown option: ${arg}`);
  } else {
    fail(`Unknown argument: ${arg}`);
  }
}

if (help) {
  console.log(usage());
  process.exit(0);
}

if (handoff) {
  const { buildHandoffEnvelope } = await import("@/src/lib/handoff");
  const envelope = buildHandoffEnvelope();
  if (json) {
    console.log(JSON.stringify(envelope, null, 2));
  } else {
    console.log("TokenTrace Handoff Envelope (use --json for full payload)");
    console.log(`Schema:               ${envelope.$schema}`);
    console.log(`Last scan completed:  ${envelope.scan.lastCompletedAt ?? "never"}`);
    console.log(`Files scanned:        ${envelope.scan.filesScanned}`);
    console.log(`Records imported:     ${envelope.scan.recordsImported}`);
    console.log(`Unresolved repairs:   ${envelope.repairQueue.unresolvedCount}`);
    console.log(`Overall confidence:   ${envelope.confidence.overall}`);
    console.log("Suggested next actions:");
    for (const action of envelope.suggestedNextActions) {
      console.log(`  - ${action.label}: ${action.command}`);
    }
  }
  process.exit(0);
}

if (actions) {
  const { listAgentActions } = await import("@/src/lib/agent-actions");
  const rows = listAgentActions({ limit: limit ?? 50 });
  if (json) {
    console.log(JSON.stringify({ actions: rows }, null, 2));
  } else {
    if (!rows.length) {
      console.log("No agent actions recorded yet.");
    } else {
      for (const row of rows) {
        console.log(`${row.ts}  [${row.surface}] ${row.command} -> ${row.outcome}  ${row.summary}`);
      }
    }
  }
  process.exit(0);
}

if (!json) {
  console.log(usage());
  process.exit(0);
}

console.log(JSON.stringify(buildAgentDiscoveryManifest({ version: packageVersion() }), null, 2));
