import { ScanNowButton } from "@/components/scan-now-button";
import { PageHeader } from "@/components/ui/typography";
import { getScanTrustData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";
import packageJson from "@/package.json";
import { AgentHandoffSection } from "@/app/guide/sections/agent-handoff-section";
import { DailyLoopSection } from "@/app/guide/sections/daily-loop-section";
import { GuideNavSidebar } from "@/app/guide/sections/guide-nav";
import { SetupStatusSection, type SetupStatusItem } from "@/app/guide/sections/setup-status-section";
import { StartSection, type FirstRunStep } from "@/app/guide/sections/start-section";
import { StatusLineSection } from "@/app/guide/sections/status-line-section";
import { TroubleshootingSection, type GuideWorkflow } from "@/app/guide/sections/troubleshooting-section";

export const dynamic = "force-dynamic";

// firstRunSteps and workflows stay in this route file (instead of guide-content.ts)
// because repo-wide copy tests pin their literals to app/guide/page.tsx:
// scan-controls-anchor, user-facing-health-copy, and model-rates-copy.
const firstRunSteps: FirstRunStep[] = [
  {
    number: "1",
    title: "Confirm scan roots",
    page: "Settings",
    detail: "Check Claude Code, Codex, OpenAI, project, and custom folders that are readable on this machine.",
    href: "/settings#custom-folders",
    action: "Open settings"
  },
  {
    number: "2",
    title: "Run your first scan",
    page: "Settings",
    detail: "Import normalized local usage records into the local SQLite database.",
    href: "/settings#scan-controls",
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
    detail: "Use Sessions, Evidence, Fix Data, and Projects after the first useful import.",
    href: "/sessions",
    action: "Open Sessions"
  }
];

const workflows: GuideWorkflow[] = [
  {
    problem: "No records imported",
    path: "Settings -> Scan now, then Scan Health",
    action: "Confirm readable folders and check whether files were ignored as known support files."
  },
  {
    problem: "Unknown cost",
    path: "Fix Data, Model Rates, Evidence",
    action: "Find whether the missing piece is model name, token count, or editable provider rate."
  },
  {
    problem: "High token usage",
    path: "Today, Sessions, Projects",
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

export default function GuidePage() {
  const scanTrust = getScanTrustData();
  const roadmapStatus = buildRoadmapStatus({ packageVersion: packageJson.version });
  const latestRun = scanTrust.health.latestRun;
  const unknownCosts = scanTrust.health.costCoverage.unknown;
  const warningCount = scanTrust.health.latestWarnings.length + scanTrust.health.latestErrors.length;
  const setupStatus: SetupStatusItem[] = [
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
      detail: unknownCosts > 0 ? "Open Fix Data or Model Rates." : "Cost coverage is clear.",
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

      <SetupStatusSection items={setupStatus} warningCount={warningCount} />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <GuideNavSidebar />

        <div className="min-w-0 space-y-6">
          <StartSection steps={firstRunSteps} />
          <DailyLoopSection />
          <StatusLineSection />
          <AgentHandoffSection roadmapStatus={roadmapStatus} />
          <TroubleshootingSection workflows={workflows} />
        </div>
      </div>
    </div>
  );
}
