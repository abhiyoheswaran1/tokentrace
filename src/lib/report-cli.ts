export type JsonReportCliOptions = {
  help: boolean;
  json: boolean;
};

export function jsonReportUsage(command: string) {
  return `Usage: tokentrace ${command} [--json]

Options:
  --json       Print report as JSON
  -h, --help   Print ${command} help`;
}

export function parseJsonReportArgs(argv: string[]): JsonReportCliOptions {
  const options: JsonReportCliOptions = {
    help: false,
    json: false
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
