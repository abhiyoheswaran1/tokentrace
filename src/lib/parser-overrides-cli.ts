import {
  clearParserOverride,
  getParserOverride,
  setParserOverride,
  type ParserOverride
} from "@/src/lib/parser-overrides";

export type ParserOverrideAction =
  | {
      kind: "set";
      path: string;
      parserId: string | null;
      excluded: boolean;
      note: string | null;
      json: boolean;
    }
  | {
      kind: "clear";
      path: string;
      json: boolean;
    };

const USAGE = [
  "Usage:",
  "  tokentrace repair set-parser <path> --parser <id> [--note \"...\"] [--json]",
  "  tokentrace repair set-parser <path> --exclude [--note \"...\"] [--json]",
  "  tokentrace repair clear-parser <path> [--json]"
].join("\n");

function fail(message: string): never {
  const error = new Error(`${message}\n${USAGE}`);
  error.name = "ParserOverrideArgsError";
  throw error;
}

export function parseParserOverrideArgs(argv: string[]): ParserOverrideAction {
  if (argv.length === 0) fail("Subcommand required.");
  const [subcommand, ...rest] = argv;

  if (subcommand === "set-parser") return parseSet(rest);
  if (subcommand === "clear-parser") return parseClear(rest);
  fail(`Unknown subcommand: ${subcommand}`);
}

function parseSet(argv: string[]): ParserOverrideAction {
  let path: string | null = null;
  let parserId: string | null = null;
  let excluded = false;
  let note: string | null = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === "--parser") {
      const value = argv[index + 1];
      if (!value) fail("--parser requires a value");
      parserId = value;
      index += 1;
    } else if (arg === "--exclude") {
      excluded = true;
    } else if (arg === "--note") {
      const value = argv[index + 1];
      if (!value) fail("--note requires a value");
      note = value;
      index += 1;
    } else if (arg === "--json") {
      json = true;
    } else if (arg.startsWith("--")) {
      fail(`Unknown option: ${arg}`);
    } else if (path === null) {
      path = arg;
    } else {
      fail(`Unexpected positional argument: ${arg}`);
    }
  }

  if (!path) fail("path is required");
  if (parserId && excluded) fail("cannot combine --parser and --exclude");
  if (!parserId && !excluded) fail("--parser or --exclude is required");

  return {
    kind: "set",
    path: path.trim(),
    parserId: excluded ? null : parserId,
    excluded,
    note,
    json
  };
}

function parseClear(argv: string[]): ParserOverrideAction {
  let path: string | null = null;
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
    } else if (arg.startsWith("--")) {
      fail(`Unknown option: ${arg}`);
    } else if (path === null) {
      path = arg;
    } else {
      fail(`Unexpected positional argument: ${arg}`);
    }
  }

  if (!path) fail("path is required");
  return { kind: "clear", path: path.trim(), json };
}

export function parserOverrideUsage() {
  return USAGE;
}

export function runParserOverrideAction(action: ParserOverrideAction): string {
  if (action.kind === "set") {
    const stored = setParserOverride({
      path: action.path,
      parserId: action.parserId ?? undefined,
      excluded: action.excluded,
      note: action.note ?? undefined
    });
    if (action.json) {
      return JSON.stringify({ action: "set", path: action.path, override: stored }, null, 2);
    }
    return action.excluded
      ? `Marked ${action.path} as excluded from scans.`
      : `Set ${action.path} to use parser ${action.parserId}.`;
  }

  const previous = getParserOverride(action.path);
  const removed = clearParserOverride(action.path);
  if (action.json) {
    return JSON.stringify(
      { action: "clear", path: action.path, removed, previous: previous as ParserOverride | null },
      null,
      2
    );
  }
  return removed
    ? `Cleared parser override for ${action.path}.`
    : `No parser override existed for ${action.path}.`;
}
