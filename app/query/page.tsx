import { PageHeader } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  runStructuredQuery,
  type StructuredQueryArgs,
  type StructuredQueryGroupBy,
  type StructuredQueryMetric,
  type StructuredQueryRangePreset,
  type StructuredQuerySort
} from "@/src/lib/structured-query";
import { formatTokens } from "@/src/lib/format";

export const dynamic = "force-dynamic";

type QueryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" && value.trim() ? value : undefined;
}

const GROUP_BY: StructuredQueryGroupBy[] = ["model", "project", "tool", "session", "day"];
const METRIC: StructuredQueryMetric[] = ["cost", "totalTokens", "interactions"];
const PRESETS: StructuredQueryRangePreset[] = ["today", "7d", "30d", "60d", "90d", "all"];
const SORTS: StructuredQuerySort[] = ["desc", "asc"];

function formatValue(value: number, metric: StructuredQueryMetric) {
  if (metric === "cost") return `$${value.toFixed(2)}`;
  if (metric === "totalTokens") return formatTokens(value);
  return value.toLocaleString();
}

function selectClass() {
  return "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
}

function inputClass() {
  return "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
}

function buttonClass() {
  return "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90";
}

export default async function QueryPage({ searchParams }: QueryPageProps) {
  const params = (await searchParams) ?? {};
  const groupBy = (readString(params.groupBy) as StructuredQueryGroupBy | undefined) ?? "model";
  const metric = (readString(params.metric) as StructuredQueryMetric | undefined) ?? "cost";
  const preset = readString(params.range) as StructuredQueryRangePreset | undefined;
  const from = readString(params.from);
  const to = readString(params.to);
  const model = readString(params.model);
  const project = readString(params.project);
  const tool = readString(params.tool);
  const topRaw = readString(params.topN);
  const sort = (readString(params.sort) as StructuredQuerySort | undefined) ?? "desc";

  const submitted = Boolean(params.submit);

  let error: string | null = null;
  let result: ReturnType<typeof runStructuredQuery> | null = null;

  if (submitted) {
    const args: StructuredQueryArgs = {
      groupBy: GROUP_BY.includes(groupBy) ? groupBy : "model",
      metric: METRIC.includes(metric) ? metric : "cost",
      sort,
      filters: { model, project, tool },
      range: preset || from || to ? { preset, from, to } : undefined,
      topN: topRaw ? Number(topRaw) : undefined
    };
    try {
      result = runStructuredQuery(args);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Query failed.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query"
        description="Deterministic local SQL aggregation. The form below runs entirely on your machine — no AI tokens are spent."
      />

      <Card>
        <CardHeader>
          <CardTitle>Run a structured query</CardTitle>
          <CardDescription>
            Group local interactions by model, project, tool, session, or day and aggregate cost,
            total tokens, or interaction count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Group by</span>
              <select name="groupBy" defaultValue={groupBy} className={selectClass()}>
                {GROUP_BY.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Metric</span>
              <select name="metric" defaultValue={metric} className={selectClass()}>
                {METRIC.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Sort</span>
              <select name="sort" defaultValue={sort} className={selectClass()}>
                {SORTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Preset range</span>
              <select name="range" defaultValue={preset ?? ""} className={selectClass()}>
                <option value="">(none)</option>
                {PRESETS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">From (YYYY-MM-DD)</span>
              <input
                type="text"
                name="from"
                defaultValue={from ?? ""}
                placeholder="2026-05-01"
                className={inputClass()}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">To (YYYY-MM-DD, exclusive)</span>
              <input
                type="text"
                name="to"
                defaultValue={to ?? ""}
                placeholder="2026-05-15"
                className={inputClass()}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Model filter</span>
              <input type="text" name="model" defaultValue={model ?? ""} className={inputClass()} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Project filter</span>
              <input
                type="text"
                name="project"
                defaultValue={project ?? ""}
                className={inputClass()}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Tool filter</span>
              <input type="text" name="tool" defaultValue={tool ?? ""} className={inputClass()} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Top N (1..200)</span>
              <input
                type="number"
                name="topN"
                min={1}
                max={200}
                defaultValue={topRaw ?? "20"}
                className={inputClass()}
              />
            </label>
            <div className="md:col-span-3">
              <button type="submit" name="submit" value="1" className={buttonClass()}>
                Run query
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Query error</CardTitle>
            <CardDescription>The structured-query validator rejected the arguments.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>
                {result.rows.length === 0 ? "No rows" : `${result.rows.length} rows`}
              </CardTitle>
              <CardDescription>
                Group by <code>{result.groupBy}</code>, metric <code>{result.metric}</code>, sort{" "}
                <code>{result.sort}</code>. {result.range.preset ? `Range: ${result.range.preset}. ` : ""}
                {result.range.from || result.range.to
                  ? `Window: ${result.range.from ?? "—"} → ${result.range.to ?? "—"}. `
                  : ""}
                Showing {result.rows.length} of {result.totalGroups} groups
                {result.truncated ? " (truncated by topN)" : ""}.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {result.filters.model ? <Badge variant="secondary">model={result.filters.model}</Badge> : null}
              {result.filters.project ? <Badge variant="secondary">project={result.filters.project}</Badge> : null}
              {result.filters.tool ? <Badge variant="secondary">tool={result.filters.tool}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups matched. Try a different range or remove filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{result.groupBy}</TableHead>
                      <TableHead className="text-right">{result.metric}</TableHead>
                      <TableHead className="text-right">interactions</TableHead>
                      <TableHead className="text-right">totalTokens</TableHead>
                      <TableHead className="text-right">cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row) => (
                      <TableRow key={row.group}>
                        <TableCell className="font-medium">{row.group}</TableCell>
                        <TableCell className="text-right">
                          {formatValue(row.value, result.metric)}
                        </TableCell>
                        <TableCell className="text-right">{row.interactions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatTokens(row.totalTokens)}</TableCell>
                        <TableCell className="text-right">${row.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!submitted && !error ? (
        <Card>
          <CardHeader>
            <CardTitle>About this page</CardTitle>
            <CardDescription>
              The form submits a GET request with structured arguments. The same query is available
              from the CLI as <code>tokentrace query --group-by ... --metric ... --json</code> and
              through the MCP <code>query_usage</code> tool. All three paths execute the same
              deterministic SQL — zero AI tokens are spent.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
