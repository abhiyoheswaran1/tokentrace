import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";

const args = process.argv.slice(2);
const workbench = buildUnknownCostRepairWorkbench();

if (args.includes("--json")) {
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
