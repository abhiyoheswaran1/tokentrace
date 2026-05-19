import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Database,
  ExternalLink,
  FileJson,
  Gauge,
  LockKeyhole,
  Search,
  Wrench
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanNowButton } from "@/components/scan-now-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { getScanTrustData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

const PRODUCT_WEBSITE_URL = "https://www.abhiyoheswaran.com/apps/tokentrace";

const guideNav = [
  ["#start", "Start here", "First scan to first evidence"],
  ["#daily-loop", "Daily loop", "Where to look during normal use"],
  ["#status-line", "Claude Code status line", "ctx, cost, processed, cache"],
  ["#agent-handoff", "Agent handoff", "Machine-readable entry points"],
  ["#troubleshooting", "Troubleshooting", "Blank states and repair paths"]
];

const firstRunSteps = [
  {
    number: "1",
    title: "Confirm scan roots",
    page: "Settings",
    detail: "Check Claude Code, Codex, OpenAI, project, and custom folders that are readable on this machine.",
    href: "/settings",
    action: "Open settings"
  },
  {
    number: "2",
    title: "Run your first scan",
    page: "Settings",
    detail: "Import normalized local usage records into the local SQLite database.",
    href: "/settings",
    action: "Scan now",
    actionKind: "scan"
  },
  {
    number: "3",
    title: "Review Scan Health",
    page: "Scan Health",
    detail: "Review files scanned, records imported, ignored support files, parser warnings, and model-rate coverage.",
    href: "/diagnostics",
    action: "Open Scan Health"
  },
  {
    number: "4",
    title: "Install Claude Code status line",
    page: "Guide",
    detail: "Use the setup command when you want live ctx, cost, processed, and cache labels while coding.",
    href: "#status-line",
    action: "View setup"
  },
  {
    number: "5",
    title: "Inspect evidence",
    page: "Sessions",
    detail: "Use Sessions, Evidence, Repair, and Projects after the first useful import.",
    href: "/sessions",
    action: "Open Sessions"
  }
];

const dailyLoop = [
  {
    title: "Read the pulse",
    page: "Overview",
    detail: "Check current period usage, cost, sessions, unknown cost, and the latest trend window before chasing details.",
    href: "/",
    icon: Gauge
  },
  {
    title: "Open the evidence",
    page: "Evidence",
    detail: "Trace a total back to sessions, source files, parser confidence, and model-rate state.",
    href: "/evidence",
    icon: Search
  },
  {
    title: "Repair what blocks trust",
    page: "Repair",
    detail: "Unknown cost usually needs a known model name, nonzero tokens, or an editable provider model rate.",
    href: "/repair",
    icon: Wrench
  },
  {
    title: "Review Scan Health",
    page: "Scan Health",
    detail: "Use scan health when data looks stale, parser warnings appear, or a folder imported fewer records than expected.",
    href: "/diagnostics",
    icon: ClipboardList
  }
];

const statusLineTerms = [
  {
    label: "ctx",
    meaning: "Current Claude context-window usage. Watch this when you are close to the context limit."
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
    meaning: "Claude provided a usable status-line cost. If this says pricing repair, inspect Model Rates and Repair."
  }
];

const agentSteps = [
  ["Discover", "tokentrace agent --json", "No", "Read capabilities, workflows, privacy rules, and guardrails."],
  ["Inspect aliases", "tokentrace capabilities --json", "No", "Return the same manifest for agents that look for capabilities first."],
  ["Import", "tokentrace scan --json", "Yes", "Refresh local usage data before making claims."],
  ["Verify", "tokentrace doctor --json", "No", "Check parser trust, model-rate coverage, scan freshness, and support status."],
  ["Explain", "tokentrace evidence --json", "No", "Trace aggregate numbers back to sessions, files, and model-rate rows."]
];

const roadmapSteps = [
  ["Roadmap status", "tokentrace roadmap --json", "Read implemented cards, evidence paths, required checks, and release status."],
  ["Dashboard API", "/api/roadmap", "Fetch the same roadmap status from a running local dashboard."]
];

const workflows = [
  {
    problem: "No records imported",
    path: "Settings -> Scan now, then Scan Health",
    action: "Confirm readable folders and check whether files were ignored as known support files."
  },
  {
    problem: "Unknown cost",
    path: "Repair, Model Rates, Evidence",
    action: "Find whether the missing piece is model name, token count, or editable provider rate."
  },
  {
    problem: "High token usage",
    path: "Overview, Sessions, Projects",
    action: "Compare processed, non-cache, and cache totals before treating a spike as fresh context growth."
  },
  {
    problem: "Parser warnings",
    path: "Parsers, Discovery, Scan Health",
    action: "Check parser confidence, unsupported files, and imported-with-errors rows before trusting an adapter."
  },
  {
    problem: "Package trust check",
    path: "Scan Health",
    action: "Review the supply-chain IOC check alongside parser and model-rate health before release or upgrade work."
  }
];

const pageMap = [
  ["Overview", "Top-level totals, trends, repair queue, guardrails, and recommended next actions."],
  ["Sessions", "Per-session evidence with models, costs, cache activity, parser provenance, and tool calls."],
  ["Model Rates", "Editable provider model rates used for dashboard cost estimates and unknown-cost repair."],
  ["Scan Health", "First-run checklist, scan health, supply-chain IOC check, supported file types, and diagnostics for missing data."],
  ["Discovery", "Recently scanned files grouped by parser, source family, status, and import yield."],
  ["Parsers", "Adapter choices, warnings, confidence, and parser repair clues for local files."]
];

const emptyStatePlaybook = [
  ["No data", "Run Scan now from Settings, then use Scan Health if records stay at zero."],
  ["No logs found", "Add a custom folder or use Claude Code, Codex, or another supported CLI before scanning again."],
  ["Unknown cost", "Open repair or Model Rates to decide whether the missing piece is model name, token count, or provider rate."],
  ["Parser warnings", "Open Discovery and Parsers to separate unsupported files from imported-with-errors rows."],
  ["Sandbox smoke skipped", "Local sandbox runs can skip server binding checks. Run the packed smoke or release check outside that constraint before release."]
];

function statusTone(ok: boolean) {
  return ok ? "text-primary" : "text-amber-700";
}

function SectionTitle({
  id,
  kicker,
  title,
  children
}: {
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 border-b p-4">
      <FieldLabel>{kicker}</FieldLabel>
      <h2 className="mt-2 text-lg font-semibold leading-tight">{title}</h2>
      <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

function CommandBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-muted/40 p-3">
      <MonoText>{children}</MonoText>
    </div>
  );
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
      detail: unknownCosts > 0 ? "Open repair or Model Rates." : "Cost coverage is clear.",
      ok: unknownCosts === 0
    },
    {
      label: "Model rates",
      value: `${scanTrust.pricedModelCount.toLocaleString()} rated models`,
      detail: scanTrust.pricedModelCount > 0 ? "Editable provider rates are loaded." : "Seed or add model rates.",
      ok: scanTrust.pricedModelCount > 0
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="TokenTrace Guide"
        description="A practical manual for scanning local AI CLI usage, reading status-line numbers, and drilling from summaries to evidence."
        actions={<ScanNowButton />}
      />

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold leading-tight">Setup status</h2>
            <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">
              Live local health for the next action: latest scan, imported records, unknown cost, and model-rate coverage.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            No telemetry
          </Badge>
        </div>
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {setupStatus.map((item) => (
            <div key={item.label} className="min-w-0 p-4">
              <FieldLabel>{item.label}</FieldLabel>
              <div className={`mt-2 text-sm font-semibold leading-tight tabular-nums ${statusTone(item.ok)}`}>
                {item.value}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
        {warningCount > 0 ? (
          <div className="border-t px-4 py-3 text-sm leading-6 text-amber-800">
            Scan Health has {warningCount.toLocaleString()} warning or error notes to review before trusting the latest scan.
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Guide sections
          </div>
          <nav aria-label="Guide sections" className="mt-2 space-y-1">
            {guideNav.map(([href, label, detail]) => (
              <a
                key={href}
                href={href}
                className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="block font-medium text-foreground">{label}</span>
                <span className="mt-1 block text-xs leading-5">{detail}</span>
              </a>
            ))}
          </nav>
          <div className="mt-3 border-t px-2 pt-3 text-xs leading-5 text-muted-foreground">
            <p>
              TokenTrace is local-first. Rate refreshes fetch public model-rate data; usage logs and prompts are not sent with that request.
            </p>
            <a
              href={PRODUCT_WEBSITE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              Product website
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card">
            <SectionTitle id="start" kicker="Start here" title="Get from install to evidence">
              Run a scan, confirm imported records, then open the page that explains the number you care about.
            </SectionTitle>
            <ol className="divide-y">
              {firstRunSteps.map((step) => (
                <li key={step.title} className="grid gap-3 p-4 md:grid-cols-[2.5rem_minmax(0,1fr)_auto] md:items-start">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40 text-sm font-semibold tabular-nums text-muted-foreground">
                    {step.number}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold leading-tight">{step.title}</h3>
                      <Badge variant="secondary">{step.page}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                  </div>
                  {step.actionKind === "scan" ? (
                    <ScanNowButton variant="outline" size="sm" className="w-fit" />
                  ) : (
                    <Button asChild variant="outline" size="sm" className="w-fit">
                      <Link href={step.href}>
                        {step.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border bg-card">
            <SectionTitle id="daily-loop" kicker="Daily loop" title="Use one route per question">
              Start broad, then move to evidence only when a number needs explanation or repair.
            </SectionTitle>
            <div className="divide-y">
              {dailyLoop.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="grid gap-3 p-4 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-start">
                    <Icon className="mt-0.5 h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                        <Badge variant="secondary">{item.page}</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                    </div>
                    <Link href={item.href} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <SectionTitle id="status-line" kicker="Claude Code status line" title="Read live numbers without mixing up context and processed usage">
              The status line is for live coding. The dashboard is for scanned historical evidence.
            </SectionTitle>
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4 p-4">
                <div>
                  <FieldLabel>Setup command</FieldLabel>
                  <div className="mt-2">
                    <CommandBlock>tokentrace statusline setup claude</CommandBlock>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Paste the printed statusLine block into <MonoText>~/.claude/settings.json</MonoText>. Claude then runs{" "}
                    <MonoText>tokentrace statusline claude</MonoText>.
                  </p>
                </div>
                <div>
                  <FieldLabel>Example output</FieldLabel>
                  <div className="mt-2 overflow-x-auto whitespace-nowrap rounded-md border bg-muted/40 p-3">
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
              </div>
              <div className="border-t p-4 lg:border-l lg:border-t-0">
                <h3 className="text-sm font-semibold leading-tight">How to read high numbers</h3>
                <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <p>
                      Use <span className="font-medium text-foreground">ctx</span> for current context-window pressure.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <p>
                      Use <span className="font-medium text-foreground">processed</span> and{" "}
                      <span className="font-medium text-foreground">cache</span> to explain cost and transcript activity.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                    <p>If cost looks surprising, compare status-line cost with imported dashboard sessions after your next scan.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <SectionTitle id="agent-handoff" kicker="Agent handoff" title="Give coding agents a stable entry point">
              Agents should discover capabilities first, scan only when needed, then cite evidence before summarizing usage.
            </SectionTitle>
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.82fr)_minmax(18rem,0.55fr)]">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold leading-tight">Agent discovery</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <MonoText>tokentrace agent --json</MonoText> returns workflows, privacy rules, guardrails, and safe JSON commands.
                  The alias <MonoText>tokentrace capabilities --json</MonoText> returns the same versioned contract.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <CommandBlock>tokentrace agent --json</CommandBlock>
                  <CommandBlock>tokentrace capabilities --json</CommandBlock>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Package readers can inspect <MonoText>TOKENTRACE_AGENT.md</MonoText>, <MonoText>llms.txt</MonoText>, and{" "}
                  <MonoText>docs/agent-discovery.schema.json</MonoText>. A running dashboard exposes <MonoText>/api/agent</MonoText>{" "}
                  and <MonoText>/api/capabilities</MonoText>.
                </p>
              </div>
              <div className="border-t p-4 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold leading-tight">Release readiness</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Current package version is {roadmapStatus.packageVersion}. The current roadmap focuses on accuracy, evidence,
                  repair workflow, import profiles, and package-trust checks.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <FieldLabel>Implemented cards</FieldLabel>
                    <div className="mt-1 font-semibold">{roadmapStatus.cards.length.toLocaleString()} cards</div>
                  </div>
                  <div>
                    <FieldLabel>Release status</FieldLabel>
                    <div className="mt-1 font-semibold">releaseAllowed: {String(roadmapStatus.release.releaseAllowed)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Run <MonoText>npm run release:check</MonoText> only when the maintainer asks for release preparation.
                </p>
              </div>
            </div>
            <div className="border-t p-4">
              <h3 className="text-sm font-semibold leading-tight">Agent quickstart</h3>
              <div className="table-scroll mt-3">
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
            </div>
            <div className="border-t p-4">
              <h3 className="text-sm font-semibold leading-tight">Roadmap surfaces</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use <MonoText>tokentrace roadmap --json</MonoText> or <MonoText>/api/roadmap</MonoText> for implementation status and release gates.
              </p>
              <div className="table-scroll mt-3">
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
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <SectionTitle id="troubleshooting" kicker="Troubleshooting" title="Repair the smallest thing that blocks trust">
              Use the symptom to choose a page, then follow the evidence path instead of guessing from a summary total.
            </SectionTitle>
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="p-4">
                <h3 className="text-sm font-semibold leading-tight">Common workflows</h3>
                <div className="mt-3 divide-y border-y">
                  {workflows.map((item) => (
                    <div key={item.problem} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <div className="text-sm font-medium text-foreground">{item.problem}</div>
                      <div className="text-sm leading-6 text-muted-foreground">
                        <span className="font-medium text-foreground">{item.path}:</span> {item.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t p-4 lg:border-l lg:border-t-0">
                <h3 className="text-sm font-semibold leading-tight">Empty and error states</h3>
                <div className="mt-3 divide-y border-y">
                  {emptyStatePlaybook.map(([state, action]) => (
                    <div key={state} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <div className="text-sm font-medium text-foreground">{state}</div>
                      <div className="text-sm leading-6 text-muted-foreground">{action}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid border-t lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold leading-tight">Privacy and storage</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  TokenTrace scans local CLI artifacts and stores normalized analytics in the local database shown in Settings.
                  Raw prompts and message bodies stay out of normal views.
                </p>
              </div>
              <div className="border-t p-4 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold leading-tight">Page map</h3>
                </div>
                <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  {pageMap.map(([name, detail]) => (
                    <div key={name} className="text-sm leading-6">
                      <span className="font-medium text-foreground">{name}:</span>{" "}
                      <span className="text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
