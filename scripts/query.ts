import { parseStructuredQueryArgs, structuredQueryUsage } from "@/src/lib/structured-query-cli";

const argv = process.argv.slice(2);
let parsed: ReturnType<typeof parseStructuredQueryArgs>;

try {
  parsed = parseStructuredQueryArgs(argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid query arguments.");
  console.error(structuredQueryUsage());
  process.exit(1);
}

if (parsed.help) {
  console.log(structuredQueryUsage());
  process.exit(0);
}

const { runStructuredQuery } = await import("@/src/lib/structured-query");
const result = runStructuredQuery(parsed.args);

if (parsed.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const headerParts = [
    `group=${result.groupBy}`,
    `metric=${result.metric}`,
    `sort=${result.sort}`,
    `topN=${result.topN}`
  ];
  if (result.range.preset) headerParts.push(`range=${result.range.preset}`);
  if (result.range.from || result.range.to) {
    headerParts.push(`range=${result.range.from ?? "-"}..${result.range.to ?? "-"}`);
  }
  const lines = [
    "TokenTrace structured query",
    headerParts.join(" · "),
    `Rows: ${result.rows.length} of ${result.totalGroups}${result.truncated ? " (truncated)" : ""}`,
    ""
  ];
  for (const row of result.rows) {
    lines.push(
      `${row.group.padEnd(40).slice(0, 40)} value=${row.value} interactions=${row.interactions} totalTokens=${row.totalTokens} cost=${row.cost}`
    );
  }
  console.log(lines.join("\n"));
}
