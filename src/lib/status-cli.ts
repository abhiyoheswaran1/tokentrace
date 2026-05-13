export type StatusMode = "compact" | "default" | "wide";

export type StatusCliOptions =
  | {
      command: "status";
      help: boolean;
      json: boolean;
      mode: StatusMode;
      sourceFile: string | null;
    }
  | {
      command: "watch";
      help: boolean;
      interval: number;
      mode: StatusMode;
      sourceFile: string | null;
    }
  | {
      command: "statusline";
      help: boolean;
      mode: StatusMode;
    }
  | {
      command: "setup";
      help: boolean;
    };

export function statusUsage() {
  return `Usage:
  tokentrace status [--json] [--compact|--wide] [--source-file <path>]
  tokentrace watch [--compact|--wide] [--interval <ms>] [--source-file <path>]
  tokentrace statusline claude [--compact|--wide]
  tokentrace statusline setup claude

Options:
  --json                    Print status snapshot as JSON
  --compact, --wide          Select status text width
  --source-file <path>       Focus status on one source file
  --transcript-path <path>   Alias for --source-file
  --interval <ms>            Watch refresh interval, minimum 250ms
  -h, --help                 Print status help`;
}

function parseMode(arg: string, current: StatusMode) {
  if (arg === "--compact") return "compact";
  if (arg === "--wide") return "wide";
  return current;
}

function parseInterval(value: string | null) {
  if (!value) throw new Error("--interval requires a millisecond value.");
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid interval: ${value}`);
  }
  return Math.max(250, Math.round(parsed));
}

function parseStatusLikeArgs(argv: string[], options: {
  allowJson: boolean;
  allowInterval: boolean;
  allowSession?: boolean;
}) {
  let help = false;
  let interval = 1000;
  let json = false;
  let mode: StatusMode = "default";
  let sourceFile: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--json") {
      if (!options.allowJson) throw new Error("Unknown option: --json");
      json = true;
      continue;
    }
    if (arg === "--compact" || arg === "--wide") {
      mode = parseMode(arg, mode);
      continue;
    }
    if (arg === "--session" && options.allowSession) {
      continue;
    }
    if (arg === "--source-file" || arg === "--transcript-path") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a path value.`);
      sourceFile = value;
      index += 1;
      continue;
    }
    if (arg === "--interval") {
      if (!options.allowInterval) throw new Error("Unknown option: --interval");
      interval = parseInterval(argv[index + 1] ?? null);
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { help, interval, json, mode, sourceFile };
}

export function parseStatusArgs(argv: string[]): StatusCliOptions {
  if (argv[0] === "statusline" && argv[1] === "claude") {
    const parsed = parseStatusLikeArgs(argv.slice(2), { allowInterval: false, allowJson: false });
    return { command: "statusline", help: parsed.help, mode: parsed.mode };
  }

  if (argv[0] === "setup" && argv[1] === "claude") {
    const extra = argv.slice(2);
    if (extra.length > 0 && extra.every((arg) => arg === "--help" || arg === "-h")) {
      return { command: "setup", help: true };
    }
    if (extra.length > 0) {
      throw new Error(extra[0].startsWith("-") ? `Unknown option: ${extra[0]}` : `Unknown argument: ${extra[0]}`);
    }
    return { command: "setup", help: false };
  }

  if (argv[0] === "watch") {
    const parsed = parseStatusLikeArgs(argv.slice(1), {
      allowInterval: true,
      allowJson: false,
      allowSession: true
    });
    return {
      command: "watch",
      help: parsed.help,
      interval: parsed.interval,
      mode: parsed.mode,
      sourceFile: parsed.sourceFile
    };
  }

  const parsed = parseStatusLikeArgs(argv, { allowInterval: false, allowJson: true });
  return {
    command: "status",
    help: parsed.help,
    json: parsed.json,
    mode: parsed.mode,
    sourceFile: parsed.sourceFile
  };
}
