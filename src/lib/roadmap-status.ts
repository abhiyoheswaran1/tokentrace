export type RoadmapCardStatus = "implemented" | "in-progress" | "blocked";

export type RoadmapCard = {
  id: string;
  title: string;
  outcome: string;
  status: RoadmapCardStatus;
  details: string[];
  evidence: string[];
};

export type RoadmapActionRecipe = {
  id: string;
  title: string;
  command: string;
  uiHref: string;
  expectedEvidence: string[];
};

export type RoadmapStatus = {
  version: "0.12.0";
  codename: "Local Sources & Trust";
  packageVersion: string;
  thesis: string;
  cards: RoadmapCard[];
  handoff: {
    schemaVersion: "tokentrace.roadmap.v2";
    agentEntryPoints: string[];
    actionRecipes: RoadmapActionRecipe[];
  };
  verification: {
    requiredCommands: string[];
    notes: string[];
  };
  release: {
    releaseAllowed: boolean;
    versionBumped: boolean;
    blockers: string[];
  };
};

type RoadmapStatusOptions = {
  packageVersion?: string;
};

function isAtLeastVersion(version: string | undefined, target: string) {
  if (!version) return false;

  const currentParts = version.split(".").map((part) => Number.parseInt(part, 10));
  const targetParts = target.split(".").map((part) => Number.parseInt(part, 10));
  if (currentParts.some(Number.isNaN) || targetParts.some(Number.isNaN)) return false;

  for (let index = 0; index < targetParts.length; index += 1) {
    const current = currentParts[index] ?? 0;
    const required = targetParts[index] ?? 0;
    if (current > required) return true;
    if (current < required) return false;
  }

  return true;
}

const cards: RoadmapCard[] = [
  {
    id: "TT-120-01",
    title: "Native Adapter Expansion",
    outcome: "More local usage formats are imported by first-class adapters before generic fallbacks.",
    status: "implemented",
    details: [
      "structured local usage logs import session, model, token, and source cost fields.",
      "Cursor-style chat and composer exports import as native local source evidence.",
      "Generic adapters remain lower-priority fallbacks with profile-assisted metadata."
    ],
    evidence: [
      "src/ingestion/adapters/structured-usage-log.ts",
      "src/ingestion/adapters/cursor-chat.ts",
      "src/ingestion/adapters/index.ts",
      "tests/native-adapters-0-12.test.ts"
    ]
  },
  {
    id: "TT-120-02",
    title: "Source Catalog & Coverage Matrix",
    outcome: "Users can see what TokenTrace supports and what action to take for unsupported local files.",
    status: "implemented",
    details: [
      "Source catalog lists native, profile-assisted, and fallback import paths.",
      "Coverage summary separates native files, profile-assisted files, fallback files, and unsupported files.",
      "Each source entry includes matchers, confidence, and a next action."
    ],
    evidence: ["src/lib/source-catalog.ts", "tests/source-catalog.test.ts"]
  },
  {
    id: "TT-120-03",
    title: "Evidence Packs",
    outcome: "Users can export privacy-safe evidence bundles for metrics and drilldowns.",
    status: "implemented",
    details: [
      "Evidence packs include totals, confidence drivers, source files, parser notes, model-rate state, and repair links.",
      "Raw prompt and message bodies are excluded by default with an explicit redaction manifest.",
      "Markdown and JSON renderers keep deterministic ordering."
    ],
    evidence: [
      "src/lib/evidence-pack.ts",
      "app/api/evidence-pack/route.ts",
      "tests/evidence-pack.test.ts"
    ]
  },
  {
    id: "TT-120-04",
    title: "Scan Scheduling",
    outcome: "Local scheduled scans can run on open, hourly, daily, or manual-only.",
    status: "implemented",
    details: [
      "Settings store manual, on-open, hourly, and daily scan policy.",
      "Due-scan logic stays local and opportunistic.",
      "Scheduled scan summaries expose files checked, records imported, warnings, errors, and next action."
    ],
    evidence: ["src/lib/scan-schedule.ts", "src/db/settings.ts", "tests/scan-schedule.test.ts"]
  },
  {
    id: "TT-120-05",
    title: "Budget & Guardrail V2",
    outcome: "Guardrails can be scoped by project, model, and tool with warning thresholds and anomaly notes.",
    status: "implemented",
    details: [
      "Scoped guardrails support project, model, and tool cost/token limits.",
      "Warning thresholds are configurable per scoped guardrail.",
      "anomaly notes flag warning and exceeded scoped guardrails."
    ],
    evidence: ["src/lib/usage-guardrails.ts", "src/db/settings.ts", "tests/usage-guardrails.test.ts"]
  },
  {
    id: "TT-120-06",
    title: "Parser / Import Profile Builder",
    outcome: "Users can preview a local file before adding an import profile.",
    status: "implemented",
    details: [
      "Preview runs adapter detection and parse summaries for a local sample path.",
      "Preview returns fields, recommended matchers, warnings, and errors without raw message content.",
      "Profile builder can convert previewed matchers into local import profiles."
    ],
    evidence: [
      "src/lib/import-profile-preview.ts",
      "app/api/import-profile-preview/route.ts",
      "tests/import-profile-preview.test.ts"
    ]
  },
  {
    id: "TT-120-07",
    title: "Saved Reports",
    outcome: "Users can export recurring reports without hand-building filters.",
    status: "implemented",
    details: [
      "Weekly usage, high-cost sessions, unknown-cost repair, confidence trends, guardrail status, and source coverage reports are defined.",
      "Markdown, JSON, and CSV formats use the same report payload.",
      "Reports default to no raw content."
    ],
    evidence: ["src/lib/saved-reports.ts", "app/api/reports/route.ts", "tests/saved-reports-0-12.test.ts"]
  },
  {
    id: "TT-120-08",
    title: "Performance Pass",
    outcome: "Dense pages stay responsive as imported data grows.",
    status: "implemented",
    details: [
      "Session Explorer paginates large local result sets.",
      "Global loading state remains visible during route transitions.",
      "Scan result summaries stay compact after scan actions."
    ],
    evidence: ["components/session-explorer.tsx", "app/loading.tsx", "tests/session-explorer-pagination.test.tsx"]
  },
  {
    id: "TT-120-09",
    title: "Local Backup & Operating Metadata",
    outcome: "Users can export local operating metadata without exporting raw usage content.",
    status: "implemented",
    details: [
      "Operating metadata includes settings, source catalog, schedules, report definitions, and roadmap status.",
      "Usage records and raw prompt text are excluded by default.",
      "Metadata export shape is restore-safe for future import work."
    ],
    evidence: ["src/lib/operating-metadata.ts", "app/api/operating-metadata/route.ts"]
  },
  {
    id: "TT-120-10",
    title: "Agent-Readable Release Status",
    outcome: "Roadmap JSON reports shipped release status for agents.",
    status: "implemented",
    details: [
      "Roadmap status includes the current release, implemented cards, action recipes, evidence paths, verification gates, and release status.",
      "Action recipes cover scan, evidence export, repair review, reports, Scan Health, and model-rate review.",
      "Unreleased planning details stay out of machine-readable public status."
    ],
    evidence: ["src/lib/roadmap-status.ts", "scripts/roadmap.ts", "tests/roadmap-status.test.ts"]
  }
];

const actionRecipes: RoadmapActionRecipe[] = [
  {
    id: "scan-now",
    title: "Run local scan",
    command: "tokentrace scan",
    uiHref: "/settings#scan-controls",
    expectedEvidence: ["scan_runs", "scan_files", "Scan Health"]
  },
  {
    id: "export-evidence-pack",
    title: "Export evidence pack",
    command: "tokentrace evidence --json",
    uiHref: "/evidence",
    expectedEvidence: ["evidence pack redaction manifest", "source files", "confidence drivers"]
  },
  {
    id: "repair-review",
    title: "Review unknown-cost repairs",
    command: "tokentrace repair --json",
    uiHref: "/repair",
    expectedEvidence: ["unknown cost groups", "model-rate state", "parser links"]
  },
  {
    id: "export-report",
    title: "Export saved report",
    command: "tokentrace report --markdown",
    uiHref: "/api/reports",
    expectedEvidence: ["weekly usage", "high-cost sessions", "confidence trends"]
  },
  {
    id: "scan-health",
    title: "Check scan health",
    command: "tokentrace doctor --json",
    uiHref: "/diagnostics",
    expectedEvidence: ["parser coverage", "supply-chain IOC status", "cost coverage"]
  },
  {
    id: "model-rate-review",
    title: "Review model rates",
    command: "tokentrace pricing refresh",
    uiHref: "/pricing",
    expectedEvidence: ["provider model rates", "unknown-cost repair links"]
  }
];

export function buildRoadmapStatus(options: RoadmapStatusOptions = {}): RoadmapStatus {
  const versionBumped = isAtLeastVersion(options.packageVersion, "0.12.0");

  return {
    version: "0.12.0",
    codename: "Local Sources & Trust",
    packageVersion: options.packageVersion ?? "unknown",
    thesis:
      "TokenTrace should import more local sources, explain evidence, run local scans, enforce scoped guardrails, support parser setup, export reports, and give agents a stable release-status contract.",
    cards,
    handoff: {
      schemaVersion: "tokentrace.roadmap.v2",
      agentEntryPoints: [
        "tokentrace agent --json",
        "tokentrace roadmap --json",
        "GET /api/agent",
        "GET /api/roadmap"
      ],
      actionRecipes
    },
    verification: {
      requiredCommands: [
        "npm run verify",
        "npm run build",
        "npm run smoke:cli",
        "npm run smoke:packed",
        "npm run security:ioc",
        "npm run package:inspect",
        "npm run projscan:doctor"
      ],
      notes: [
        "Serve smoke may be skipped when sandbox network binding is disabled; run unsandboxed before release.",
        "ProjScan is required after substantial changes and before release readiness claims.",
        "Evidence packs must keep raw content excluded by default."
      ]
    },
    release: {
      releaseAllowed: versionBumped,
      versionBumped,
      blockers: versionBumped
        ? []
        : [
            "No bump or release until maintainer explicitly asks for it.",
            "CHANGELOG.md must have a complete versioned 0.12.0 section moved out of Unreleased.",
            "Final release requires docs/RELEASE_CHECKLIST.md and npm run release:check."
          ]
    }
  };
}
