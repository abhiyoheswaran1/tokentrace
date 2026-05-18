import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Bot, CheckCircle2, CircleAlert, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { getScanTrustData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

const quickStart = [
  {
    title: "Run your first scan",
    detail: "Open Settings, confirm the default Claude Code and Codex folders, then run Scan now.",
    href: "/settings",
    action: "Open Settings"
  },
  {
    title: "Check data health",
    detail: "Use Doctor to verify imported records, ignored support files, parser warnings, and pricing coverage.",
    href: "/diagnostics",
    action: "Open Doctor"
  },
  {
    title: "Review costs",
    detail: "Pricing controls model rates. Unknown cost means TokenTrace needs a model name, token count, or price.",
    href: "/pricing",
    action: "Open Pricing"
  },
  {
    title: "Inspect evidence",
    detail: "Sessions, Evidence, Parsers, and Discovery show where every important number came from.",
    href: "/sessions",
    action: "Open Sessions"
  }
];

const firstRunSteps = [
  ["1", "Confirm scan roots", "Settings", "TokenTrace checks Claude Code, Codex, OpenAI, project, and custom folders that are readable on this machine."],
  ["2", "Run Scan now", "Settings", "The scan imports normalized local usage records into the local SQLite database."],
  ["3", "Open Doctor", "Doctor", "Review files scanned, records imported, ignored support files, parser warnings, and pricing coverage."],
  ["4", "Install Claude Code status line", "Guide", "Use the setup command when you want live ctx, cost, processed, and cache labels while coding."],
  ["5", "Start daily review", "Overview", "Use Overview, Sessions, Evidence, Repair, and Projects after the first useful import."]
];

const statusLineTerms = [
  {
    label: "ctx",
    meaning: "Current Claude context-window usage. This is the number to watch when you are close to the context limit."
  },
  {
    label: "cost",
    meaning: "Claude Code's session cost value. TokenTrace displays it locally and does not recalculate that status-line cost."
  },
  {
    label: "processed",
    meaning: "Cumulative transcript usage for the current Claude session, including repeated cache reads."
  },
  {
    label: "cache",
    meaning: "Cache read and cache write tokens. A large processed total is often mostly cache activity."
  },
  {
    label: "priced",
    meaning: "Claude provided a usable status-line cost. If this says pricing repair, inspect Pricing and Repair."
  }
];

const workflows = [
  {
    problem: "No records imported",
    path: "Settings -> Scan now, then Doctor",
    action: "Confirm readable folders and check whether files were ignored as known support files."
  },
  {
    problem: "Unknown cost",
    path: "Repair, Pricing, Evidence",
    action: "Find whether the missing piece is model name, token count, or editable model price."
  },
  {
    problem: "High token usage",
    path: "Overview, Sessions, Projects",
    action: "Compare processed, non-cache, and cache totals before treating a spike as fresh context growth."
  },
  {
    problem: "Parser warnings",
    path: "Parsers, Discovery, Doctor",
    action: "Check parser confidence, unsupported files, and imported-with-errors rows before trusting an adapter."
  }
];

const agentSteps = [
  ["Discover", "tokentrace agent --json", "No", "Read capabilities, workflows, privacy rules, and guardrails."],
  ["Inspect aliases", "tokentrace capabilities --json", "No", "Return the same manifest for agents that look for capabilities first."],
  ["Import", "tokentrace scan --json", "Yes", "Refresh local usage data before making claims."],
  ["Verify", "tokentrace doctor --json", "No", "Check parser trust, pricing coverage, scan freshness, and support status."],
  ["Explain", "tokentrace evidence --json", "No", "Trace aggregate numbers back to sessions, files, and pricing rows."]
];

const roadmapSteps = [
  ["Roadmap status", "tokentrace roadmap --json", "Read implemented cards, evidence paths, required checks, and release status."],
  ["Dashboard API", "/api/roadmap", "Fetch the same roadmap status from a running local dashboard."]
];

const pageMap = [
  ["Overview", "Top-level totals, trends, repair queue, guardrails, and recommended next actions."],
  ["Sessions", "Per-session evidence with models, costs, cache activity, parser provenance, and tool calls."],
  ["Pricing", "Editable model prices used for dashboard cost estimates and unknown-cost repair."],
  ["Doctor", "First-run checklist, scan health, support matrix, and diagnostics for missing data."],
  ["Discovery", "Recently scanned files grouped by parser, source family, status, and import yield."],
  ["Parsers", "Adapter choices, warnings, confidence, and parser repair clues for local files."]
];

const emptyStatePlaybook = [
  ["No data", "Run Scan now from Settings, then use Doctor if records stay at zero."],
  ["No logs found", "Add a custom folder or use Claude Code, Codex, or another supported CLI before scanning again."],
  ["Unknown pricing", "Open Repair or Pricing to decide whether the missing piece is model name, token count, or price."],
  ["Parser warnings", "Open Discovery and Parser Debug to separate unsupported files from imported-with-errors rows."],
  ["Sandbox smoke skipped", "Local sandbox runs can skip server binding checks. Run the packed smoke or release check outside that constraint before release."]
];

function statusTone(ok: boolean) {
  return ok ? "text-primary" : "text-amber-700";
}

export default function GuidePage() {
  const scanTrust = getScanTrustData();
  const roadmapStatus = buildRoadmapStatus({ packageVersion: packageJson.version });
  const latestRun = scanTrust.health.latestRun;
  const unknownCosts = scanTrust.health.costCoverage.unknown;
  const warningCount = scanTrust.health.latestWarnings.length + scanTrust.health.latestErrors.length;
  const setupStatus = [
    {
      label: "Latest scan",
      value: latestRun ? formatDate(latestRun.completedAt ?? latestRun.startedAt) : "No scan yet",
      detail: latestRun ? `${latestRun.filesScanned.toLocaleString()} files checked` : "Start from Settings.",
      ok: Boolean(latestRun)
    },
    {
      label: "Imported records",
      value: latestRun ? `${latestRun.recordsImported.toLocaleString()} records` : "0 records",
      detail: latestRun && latestRun.recordsImported > 0 ? "Dashboard data is available." : "Run a scan after CLI sessions.",
      ok: Boolean(latestRun && latestRun.recordsImported > 0)
    },
    {
      label: "Unknown cost",
      value: `${unknownCosts.toLocaleString()} unknown costs`,
      detail: unknownCosts > 0 ? "Open Repair or Pricing." : "Cost coverage is clear.",
      ok: unknownCosts === 0
    },
    {
      label: "Pricing",
      value: `${scanTrust.pricedModelCount.toLocaleString()} priced models`,
      detail: scanTrust.pricedModelCount > 0 ? "Editable prices are loaded." : "Seed or add model prices.",
      ok: scanTrust.pricedModelCount > 0
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="TokenTrace Guide"
        description="Set up local scans, read Claude Code status lines, and trace token or cost numbers back to evidence."
        actions={
          <Button asChild>
            <Link href="/settings">
              <Terminal className="mr-2 h-4 w-4" />
              Scan now
            </Link>
          </Button>
        }
      />

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Your setup status</CardTitle>
            <CardDescription>
              This guide reads local scan health so the next step is grounded in your current TokenTrace data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid border-y md:grid-cols-2 xl:grid-cols-4">
              {setupStatus.map((item) => (
                <div key={item.label} className="min-w-0 p-3">
                  <FieldLabel>{item.label}</FieldLabel>
                  <div className={`mt-2 text-sm font-semibold leading-tight tabular-nums ${statusTone(item.ok)}`}>
                    {item.value}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            {warningCount > 0 ? (
              <p className="mt-3 text-sm leading-6 text-amber-800">
                Doctor has {warningCount.toLocaleString()} warning or error notes to review before trusting the latest scan.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickStart.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link href={item.href}>
                  {item.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>First-run guided setup</CardTitle>
            <CardDescription>
              Get to the first useful evidence without a separate tutorial mode or cloud account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid overflow-hidden rounded-md border md:grid-cols-5">
              {firstRunSteps.map(([number, title, page, detail], index) => (
                <li
                  key={title}
                  className={`min-w-0 p-3 ${index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-muted-foreground">
                      {number}
                    </span>
                    <Badge variant="secondary">{page}</Badge>
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-tight">{title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <CardTitle>Agent discovery</CardTitle>
            </div>
            <CardDescription>
              Coding agents can inspect TokenTrace before scanning, opening the dashboard, or changing local data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="rounded-md border bg-muted/40 p-3">
              <FieldLabel>Read-only manifest</FieldLabel>
              <div className="mt-2 overflow-x-auto rounded-md bg-card p-3">
                <MonoText>tokentrace agent --json</MonoText>
              </div>
              <p className="mt-2">
                The alias <MonoText>tokentrace capabilities --json</MonoText> returns the same versioned contract.
              </p>
            </div>
            <p>
              The manifest lists safe JSON commands, local-first privacy rules, Claude Code setup, Codex sidecar fallback, and guardrails
              for evidence-backed reporting.
            </p>
            <p>
              Package readers can also inspect <MonoText>TOKENTRACE_AGENT.md</MonoText>, <MonoText>llms.txt</MonoText>, and{" "}
              <MonoText>docs/agent-discovery.schema.json</MonoText>.
            </p>
            <p>
              When the dashboard is already running, fetch the same manifest from <MonoText>/api/agent</MonoText> or{" "}
              <MonoText>/api/capabilities</MonoText>.
            </p>
            <p>
              Use <MonoText>tokentrace roadmap --json</MonoText> or <MonoText>/api/roadmap</MonoText> to inspect the detailed 0.10.0
              implementation and release status.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent quickstart</CardTitle>
            <CardDescription>Use discovery first, then verify local data before summarizing usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="table-scroll">
              <Table className="min-w-[46rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Mutates local state</TableHead>
                    <TableHead>Purpose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentSteps.map(([step, command, mutates, purpose]) => (
                    <TableRow key={step}>
                      <TableCell className="font-medium">{step}</TableCell>
                      <TableCell>
                        <MonoText>{command}</MonoText>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mutates === "Yes" ? "warning" : "secondary"}>{mutates}</Badge>
                      </TableCell>
                      <TableCell className="text-sm leading-6 text-muted-foreground">{purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Release readiness</CardTitle>
            <CardDescription>0.10.0 release status is backed by package, smoke, and ProjScan gates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid overflow-hidden rounded-md border md:grid-cols-3">
              <div className="p-3">
                <FieldLabel>Implemented cards</FieldLabel>
                <div className="mt-1 text-sm font-semibold">{roadmapStatus.cards.length.toLocaleString()} cards</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {roadmapStatus.cards.every((card) => card.status === "implemented") ? "All roadmap cards report implemented." : "Some cards still need work."}
                </p>
              </div>
              <div className="border-t p-3 md:border-l md:border-t-0">
                <FieldLabel>Required gates</FieldLabel>
                <div className="mt-1 text-sm font-semibold">{roadmapStatus.verification.requiredCommands.length.toLocaleString()} checks</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Includes verify, build, CLI smoke, packed smoke, package inspection, and ProjScan.
                </p>
              </div>
              <div className="border-t p-3 md:border-l md:border-t-0">
                <FieldLabel>Release status</FieldLabel>
                <div className="mt-1 text-sm font-semibold">releaseAllowed: {String(roadmapStatus.release.releaseAllowed)}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Current package version is {roadmapStatus.packageVersion}; release status depends on explicit maintainer approval and{" "}
                  <MonoText>npm run release:check</MonoText>.
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>Command or path</TableHead>
                    <TableHead>What it returns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roadmapSteps.map(([surface, command, purpose]) => (
                    <TableRow key={surface}>
                      <TableCell className="font-medium">{surface}</TableCell>
                      <TableCell>
                        <MonoText>{command}</MonoText>
                      </TableCell>
                      <TableCell className="text-sm leading-6 text-muted-foreground">{purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle>Claude Code status line</CardTitle>
            </div>
            <CardDescription>
              Add TokenTrace to Claude Code when you want context, cost, processed usage, and cache activity visible while you work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <FieldLabel>Setup command</FieldLabel>
              <div className="mt-2 overflow-x-auto rounded-md bg-card p-3">
                <MonoText>tokentrace statusline setup claude</MonoText>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Paste the printed statusLine block into <MonoText>~/.claude/settings.json</MonoText>. The command Claude runs is{" "}
                <MonoText>tokentrace statusline claude</MonoText>.
              </p>
            </div>

            <div className="rounded-md border bg-card p-3">
              <FieldLabel>Example output</FieldLabel>
              <div className="mt-2 overflow-x-auto whitespace-nowrap rounded-md bg-muted/40 p-3">
                <MonoText>TokenTrace | Opus | ctx 12% | cost $8.77 | processed 11.69M tokens | cache 11.64M | priced</MonoText>
              </div>
            </div>

            <div className="table-scroll">
              <Table className="min-w-[42rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Meaning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusLineTerms.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell>
                        <Badge variant="secondary">{item.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm leading-6 text-muted-foreground">{item.meaning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to read high numbers</CardTitle>
            <CardDescription>
              A high processed total does not mean the current prompt contains that many tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <p>
                Use <span className="font-medium text-foreground">ctx</span> for current context-window pressure.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <p>
                Use <span className="font-medium text-foreground">processed</span> and <span className="font-medium text-foreground">cache</span>{" "}
                to explain cost and transcript activity.
              </p>
            </div>
            <div className="flex gap-3">
              <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                If cost looks surprising, compare status-line cost with imported dashboard sessions after your next scan.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Common workflows</CardTitle>
            <CardDescription>Start with the symptom, then open the page that exposes the evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="table-scroll">
              <Table className="min-w-[46rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Symptom</TableHead>
                    <TableHead>Where to go</TableHead>
                    <TableHead>What to check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((item) => (
                    <TableRow key={item.problem}>
                      <TableCell className="font-medium">{item.problem}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.path}</TableCell>
                      <TableCell className="text-sm leading-6 text-muted-foreground">{item.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Page map</CardTitle>
            <CardDescription>Use these pages as a local evidence trail rather than a generic dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y border-y">
              {pageMap.map(([name, detail]) => (
                <div key={name} className="grid gap-2 py-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div className="text-sm leading-6 text-muted-foreground">{detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Privacy and storage</CardTitle>
            <CardDescription>No telemetry is required to use TokenTrace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              TokenTrace scans local CLI artifacts and stores normalized analytics in the local database shown in Settings.
            </p>
            <p>
              Raw prompts and message bodies stay out of normal views. If raw-content storage is enabled, treat that local database as sensitive.
            </p>
            <p>
              Price refreshes only fetch public model pricing data. Usage logs, prompts, file paths, and analytics are not sent with that request.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting checklist</CardTitle>
            <CardDescription>Use this sequence when the dashboard does not match what you expected.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1. Scan again.</span> Recent Claude Code or Codex sessions appear after a scan.
              </li>
              <li>
                <span className="font-medium text-foreground">2. Open Doctor.</span> Confirm files scanned, records imported, pricing coverage, and parser warnings.
              </li>
              <li>
                <span className="font-medium text-foreground">3. Check Discovery.</span> Confirm whether files were imported, ignored, unsupported, or failed.
              </li>
              <li>
                <span className="font-medium text-foreground">4. Repair pricing.</span> Unknown cost usually needs a known model, nonzero tokens, or a model price.
              </li>
              <li>
                <span className="font-medium text-foreground">5. Inspect Sessions.</span> Verify cache-heavy usage before treating processed totals as fresh prompt growth.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Empty and error states</CardTitle>
            <CardDescription>When a surface is blank or blocked, start with the next repairable action.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emptyStatePlaybook.map(([state, action]) => (
                  <TableRow key={state}>
                    <TableCell className="font-medium">{state}</TableCell>
                    <TableCell className="text-sm leading-6 text-muted-foreground">{action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
