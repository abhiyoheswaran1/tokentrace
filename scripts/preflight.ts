import { jsonReportUsage, parseJsonReportArgs, type JsonReportCliOptions } from "@/src/lib/report-cli";
import { buildPreflightReportSnapshot, renderPreflightText } from "@/src/lib/preflight";

const args = process.argv.slice(2);
let options: JsonReportCliOptions;

try {
  options = parseJsonReportArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid preflight arguments.");
  console.error(jsonReportUsage("preflight"));
  process.exit(1);
}

if (options.help) {
  console.log(jsonReportUsage("preflight"));
  process.exit(0);
}

const report = await buildPreflightReportSnapshot();

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(renderPreflightText(report));
}
