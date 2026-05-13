export type PricingRefreshCliOptions = {
  bundled: boolean;
  force: boolean;
  help: boolean;
  json: boolean;
  quiet: boolean;
};

export function pricingRefreshUsage() {
  return `Usage: tokentrace pricing refresh [--bundled] [--force] [--json] [--quiet]

Options:
  --bundled     Use the bundled price manifest instead of checking the remote manifest
  --force       Import even when the manifest version was already checked
  --json        Print refresh summary as JSON
  --quiet       Suppress text output
  -h, --help    Print pricing refresh help`;
}

export function parsePricingRefreshArgs(argv: string[]): PricingRefreshCliOptions {
  const options: PricingRefreshCliOptions = {
    bundled: false,
    force: false,
    help: false,
    json: false,
    quiet: false
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--bundled") {
      options.bundled = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--quiet") {
      options.quiet = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
