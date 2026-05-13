export type ScanCliOptions = {
  force: boolean;
  folders: string[];
  help: boolean;
  json: boolean;
};

export function scanUsage() {
  return `Usage: tokentrace scan [--force] [--json] [folder ...]

Options:
  --force       Reprocess files even when their hash already exists
  --json        Print scan summary as JSON
  -h, --help    Print scan help`;
}

export function parseScanArgs(argv: string[]): ScanCliOptions {
  const options: ScanCliOptions = {
    force: false,
    folders: [],
    help: false,
    json: false
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
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--") {
      options.folders.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.folders.push(arg);
  }

  return options;
}
