export type DoctorCliOptions = {
  help: boolean;
  json: boolean;
  timings: boolean;
};

export function doctorUsage() {
  return `Usage: tokentrace doctor [--json] [--timings]

Options:
  --json       Print report as JSON
  --timings    Force-enable analytics timing capture and print the
               analytics timing report (slow-query samples and threshold).
               Combine with --json for machine-readable output.
  -h, --help   Print doctor help`;
}

export function parseDoctorArgs(argv: string[]): DoctorCliOptions {
  const options: DoctorCliOptions = {
    help: false,
    json: false,
    timings: false
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
    if (arg === "--timings") {
      options.timings = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
