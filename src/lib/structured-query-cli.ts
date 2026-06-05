import type {
  StructuredQueryArgs,
  StructuredQueryGroupBy,
  StructuredQueryMetric,
  StructuredQueryRangePreset,
  StructuredQuerySort
} from "@/src/lib/structured-query";

export type StructuredQueryCliOptions = {
  help: boolean;
  json: boolean;
  args: StructuredQueryArgs;
};

export function structuredQueryUsage() {
  return `Usage: tokentrace query --group-by <g> --metric <m> [options]

Run a deterministic local SQL aggregation over TokenTrace's existing
SQLite database. Zero AI tokens spent.

Required:
  --group-by <model|project|tool|session|day>
  --metric <cost|totalTokens|interactions>

Options:
  --range <today|7d|30d|60d|90d|all>   Preset window (mutually exclusive with --from/--to).
  --from <YYYY-MM-DD>                  Inclusive lower bound.
  --to <YYYY-MM-DD>                    Exclusive upper bound.
  --model <name>                       Exact-match model filter (case-insensitive).
  --project <name>                     Exact-match project filter (case-insensitive).
  --tool <name>                        Exact-match tool filter (case-insensitive).
  --top <n>                            Limit rows (default 20, max 200).
  --sort <asc|desc>                    Default 'desc'.
  --json                               Print the result as JSON.
  -h, --help                           Print this help.

Examples:
  tokentrace query --group-by model --metric cost --range 7d --json
  tokentrace query --group-by day --metric totalTokens --from 2026-05-01 --to 2026-05-15
  tokentrace query --group-by project --metric interactions --tool "Claude Code" --top 5`;
}

const GROUP_BY: readonly StructuredQueryGroupBy[] = ["model", "project", "tool", "session", "day"];
const METRIC: readonly StructuredQueryMetric[] = ["cost", "totalTokens", "interactions"];
const SORT: readonly StructuredQuerySort[] = ["asc", "desc"];
const PRESET: readonly StructuredQueryRangePreset[] = ["today", "7d", "30d", "60d", "90d", "all"];

function valueOf(arg: string, next: string | undefined): { value: string; consumedNext: boolean } {
  const eq = arg.indexOf("=");
  if (eq >= 0) {
    const value = arg.slice(eq + 1);
    if (!value) throw new Error(`Missing value for ${arg.slice(0, eq)}`);
    return { value, consumedNext: false };
  }
  if (next == null || next.startsWith("-")) {
    throw new Error(`Missing value for ${arg}`);
  }
  return { value: next, consumedNext: true };
}

function ensureEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${label}: ${value} (expected one of ${allowed.join(", ")})`);
  }
  return value as T;
}

export function parseStructuredQueryArgs(argv: string[]): StructuredQueryCliOptions {
  let help = false;
  let json = false;
  let groupBy: StructuredQueryGroupBy | undefined;
  let metric: StructuredQueryMetric | undefined;
  let sort: StructuredQuerySort | undefined;
  let topN: number | undefined;
  let preset: StructuredQueryRangePreset | undefined;
  let from: string | undefined;
  let to: string | undefined;
  let model: string | undefined;
  let project: string | undefined;
  let tool: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--group-by" || arg.startsWith("--group-by=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      groupBy = ensureEnum(value, GROUP_BY, "--group-by");
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--metric" || arg.startsWith("--metric=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      metric = ensureEnum(value, METRIC, "--metric");
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--sort" || arg.startsWith("--sort=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      sort = ensureEnum(value, SORT, "--sort");
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--top" || arg.startsWith("--top=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      const parsed = Number(value);
      if (!Number.isInteger(parsed)) throw new Error(`Invalid --top value: ${value}`);
      topN = parsed;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--range" || arg.startsWith("--range=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      preset = ensureEnum(value, PRESET, "--range");
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--from" || arg.startsWith("--from=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      from = value;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--to" || arg.startsWith("--to=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      to = value;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--model" || arg.startsWith("--model=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      model = value;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--project" || arg.startsWith("--project=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      project = value;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg === "--tool" || arg.startsWith("--tool=")) {
      const { value, consumedNext } = valueOf(arg, argv[i + 1]);
      tool = value;
      if (consumedNext) i += 1;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!help && !groupBy) throw new Error("--group-by is required.");
  if (!help && !metric) throw new Error("--metric is required.");

  const range = preset || from || to ? { preset, from, to } : undefined;
  const filters = model || project || tool ? { model, project, tool } : undefined;

  return {
    help,
    json,
    args: {
      groupBy: groupBy as StructuredQueryGroupBy,
      metric: metric as StructuredQueryMetric,
      range,
      filters,
      topN,
      sort
    }
  };
}
