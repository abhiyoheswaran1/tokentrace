export type JsonReportCliOptions = {
  help: boolean;
  json: boolean;
};

export type DigestCliOptions = JsonReportCliOptions & {
  since: string | null;
};

export type MarkdownReportCliOptions = DigestCliOptions & {
  markdown: boolean;
  csv: boolean;
  type: string | null;
};

export function jsonReportUsage(command: string) {
  return `Usage: tokentrace ${command} [--json]

Options:
  --json       Print report as JSON
  -h, --help   Print ${command} help`;
}

export function digestUsage() {
  return `Usage: tokentrace digest [--json] [--since <last-scan|yesterday|YYYY-MM-DD>]

Options:
  --json       Print digest as JSON
  --since      Limit digest to local usage since a scan or date
  -h, --help   Print digest help`;
}

export function markdownReportUsage() {
  return `Usage: tokentrace report [--markdown|--json|--csv] [--type <weekly-usage|high-cost-sessions|unknown-cost-repair|confidence-trends|guardrail-status|source-coverage>] [--since <last-scan|yesterday|YYYY-MM-DD>]

Options:
  --markdown   Print a deterministic Markdown report
  --json       Print report data as JSON
  --csv        Print saved report rows as CSV
  --type       Render a saved report definition
  --since      Limit report to local usage since a scan or date
  -h, --help   Print report help`;
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

function parseSinceValue(argv: string[], index: number) {
  const value = argv[index + 1];
  if (!value) throw new Error("--since requires last-scan, yesterday, or YYYY-MM-DD.");
  return value;
}

export function parseDigestArgs(argv: string[]): DigestCliOptions {
  const options: DigestCliOptions = {
    help: false,
    json: false,
    since: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--since") {
      options.since = parseSinceValue(argv, index);
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function parseMarkdownReportArgs(argv: string[]): MarkdownReportCliOptions {
  const options: MarkdownReportCliOptions = {
    help: false,
    json: false,
    markdown: false,
    csv: false,
    type: null,
    since: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--markdown") {
      options.markdown = true;
      continue;
    }
    if (arg === "--csv") {
      options.csv = true;
      continue;
    }
    if (arg === "--type") {
      const value = argv[index + 1];
      if (!value) throw new Error("--type requires a report definition id.");
      options.type = value;
      index += 1;
      continue;
    }
    if (arg === "--since") {
      options.since = parseSinceValue(argv, index);
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
