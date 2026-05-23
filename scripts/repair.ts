const args = process.argv.slice(2);

export {};

const HELP = [
  "Usage:",
  "  tokentrace repair [--json]",
  "  tokentrace repair set-parser <path> --parser <id> [--note \"...\"] [--json]",
  "  tokentrace repair set-parser <path> --exclude [--note \"...\"] [--json]",
  "  tokentrace repair clear-parser <path> [--json]"
].join("\n");

function fail(message: string): never {
  console.error(message);
  console.error(HELP);
  process.exit(1);
}

if (args[0] === "--help" || args[0] === "-h") {
  console.log(HELP);
  process.exit(0);
}

if (args[0] === "set-parser" || args[0] === "clear-parser") {
  const { parseParserOverrideArgs, runParserOverrideAction } = await import(
    "@/src/lib/parser-overrides-cli"
  );
  try {
    const action = parseParserOverrideArgs(args);
    console.log(runParserOverrideAction(action));
    process.exit(0);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function parseArgs(argv: string[]) {
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    }
    fail(`Unknown argument: ${arg}`);
  }

  return { json };
}

const options = parseArgs(args);
const { buildUnknownCostRepairWorkbench } = await import("@/src/lib/unknown-cost-repair");
const workbench = buildUnknownCostRepairWorkbench();

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...workbench
      },
      null,
      2
    )
  );
} else {
  console.log("TokenTrace Unknown Cost Repair");
  console.log(`${workbench.summary.totalInteractions.toLocaleString()} unknown-cost interactions`);
  for (const group of workbench.groups.slice(0, 8)) {
    console.log(`- ${group.cause}: ${group.model} (${group.interactions.toLocaleString()} interactions)`);
    console.log(`  ${group.repairHref}`);
  }
}
