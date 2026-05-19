export type RoadmapCardStatus = "implemented" | "in-progress" | "blocked";

export type RoadmapCard = {
  id: string;
  title: string;
  outcome: string;
  status: RoadmapCardStatus;
  details: string[];
  evidence: string[];
};

export type RoadmapStatus = {
  version: "0.11.0";
  codename: "Accuracy & Evidence";
  packageVersion: string;
  thesis: string;
  cards: RoadmapCard[];
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
    id: "TT-110-01",
    title: "Tokenizer-Backed Estimates",
    outcome: "Estimated token rows disclose provider-aware tokenizer estimates before falling back to simple character estimates.",
    status: "implemented",
    details: [
      "Token estimator now returns exact labels for tokenizer estimate and simple estimate paths.",
      "Persistence stores token estimate metadata with tokenizer family and confidence.",
      "Session and scan confidence surfaces distinguish exact, tokenizer, simple, and unknown token evidence."
    ],
    evidence: [
      "src/lib/token-estimator.ts",
      "src/ingestion/persist.ts",
      "tests/token-estimator.test.ts"
    ]
  },
  {
    id: "TT-110-02",
    title: "Native SQLite History Adapter",
    outcome: "Local SQLite usage histories can be ingested with source evidence and source-provided costs preserved.",
    status: "implemented",
    details: [
      "SQLite history adapter detects usage-shaped tables in local .db, .sqlite, and .sqlite3 files.",
      "Imported source costs survive post-scan cost recalculation.",
      "Scan-file metadata records the SQLite import profile and parser provenance."
    ],
    evidence: [
      "src/ingestion/adapters/sqlite-history.ts",
      "src/lib/cost-recalculation.ts",
      "tests/sqlite-history-adapter.test.ts"
    ]
  },
  {
    id: "TT-110-03",
    title: "Session Drilldown V2",
    outcome: "One session explains spikes, model changes, cache activity, cost coverage, confidence, and repair next steps.",
    status: "implemented",
    details: [
      "Session timelines now expose data confidence, spike summaries, cost coverage, and unknown-cost repair links.",
      "Session UI shows exact/tokenizer/simple token counts, priced versus unknown cost, and spike clues.",
      "Repair links route directly to the relevant source-file workbench item."
    ],
    evidence: [
      "src/lib/session-timeline.ts",
      "app/sessions/[id]/page.tsx",
      "tests/session-timeline.test.ts"
    ]
  },
  {
    id: "TT-110-04",
    title: "Repair Workbench V2",
    outcome: "Unknown-cost repair supports operational bulk review and clearer workbench steps.",
    status: "implemented",
    details: [
      "Repair API accepts bulk key updates with the same validation as single-item reviews.",
      "Repair UI includes a bulk workbench for mark verified, parser review, ignore, and reopen.",
      "Repair flow remains Problem, Evidence, Fix, Recalculate, Verified."
    ],
    evidence: [
      "src/lib/unknown-cost-repair.ts",
      "app/api/repair-items/route.ts",
      "components/repair-bulk-actions.tsx",
      "app/repair/page.tsx",
      "tests/unknown-cost-repair.test.ts"
    ]
  },
  {
    id: "TT-110-05",
    title: "Import Profiles",
    outcome: "Power users can describe safe local log conventions without writing parser code.",
    status: "implemented",
    details: [
      "Settings includes built-in and custom import profiles with matchers.",
      "Discovery uses enabled profile extensions in addition to built-in supported extensions.",
      "Scan evidence records the matched import profile for imported files."
    ],
    evidence: [
      "src/lib/import-profiles.ts",
      "src/db/settings.ts",
      "components/settings-panel.tsx",
      "src/ingestion/discovery.ts",
      "src/ingestion/scan.ts",
      "tests/settings.test.ts"
    ]
  },
  {
    id: "TT-110-06",
    title: "Data Confidence Score",
    outcome: "Users can see whether page, project, and session numbers are trustworthy before acting.",
    status: "implemented",
    details: [
      "Data confidence combines token source, cost coverage, parser confidence, and scan freshness.",
      "Overview displays a compact confidence strip with repair and Scan Health pivots.",
      "Projects and Sessions expose confidence badges for drilldown decisions."
    ],
    evidence: [
      "src/lib/data-confidence.ts",
      "src/lib/analytics.ts",
      "app/page.tsx",
      "app/projects/page.tsx",
      "components/session-explorer.tsx",
      "tests/data-confidence.test.ts"
    ]
  },
  {
    id: "TT-110-07",
    title: "Supply Chain Check In Scan Health",
    outcome: "The package IOC guardrail is visible in the product, not only release scripts.",
    status: "implemented",
    details: [
      "Local and CI release checks run npm run security:ioc.",
      "Scan Health runs the IOC check and displays pass/fail status.",
      "Guide troubleshooting points users to Scan Health for package trust review."
    ],
    evidence: [
      "scripts/security-ioc.mjs",
      "src/lib/supply-chain-health.ts",
      "components/scan-health-summary.tsx",
      "app/diagnostics/page.tsx",
      "app/guide/page.tsx",
      "tests/security-ioc.test.ts",
      "tests/scan-health.test.ts"
    ]
  }
];

export function buildRoadmapStatus(options: RoadmapStatusOptions = {}): RoadmapStatus {
  const versionBumped = isAtLeastVersion(options.packageVersion, "0.11.0");

  return {
    version: "0.11.0",
    codename: "Accuracy & Evidence",
    packageVersion: options.packageVersion ?? "unknown",
    thesis:
      "TokenTrace should make local AI CLI numbers trustworthy by showing token source, cost coverage, parser evidence, repair paths, and package trust checks.",
    cards,
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
        "Serve smoke may be skipped when sandbox network binding is disabled.",
        "ProjScan is required after substantial changes and before release readiness claims."
      ]
    },
    release: {
      releaseAllowed: versionBumped,
      versionBumped,
      blockers: versionBumped
        ? []
        : [
            "No bump or release until maintainer explicitly asks for it.",
            "CHANGELOG.md must have a complete versioned 0.11.0 section moved out of Unreleased.",
            "Final release requires docs/RELEASE_CHECKLIST.md and npm run release:check."
          ]
    }
  };
}
