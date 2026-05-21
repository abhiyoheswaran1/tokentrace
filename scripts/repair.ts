const args = process.argv.slice(2);

export {};

function usage() {
  return "Usage: tokentrace repair --json";
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let json = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
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
