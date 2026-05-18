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
  version: "0.10.0";
  codename: "Guided Operator";
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
    id: "TT-100-01",
    title: "In-App Guide",
    outcome: "Users can learn TokenTrace from inside the local dashboard.",
    status: "implemented",
    details: [
      "Guide route is available in desktop and mobile navigation.",
      "Guide covers first scan setup, Claude Code status-line setup, agent discovery, common workflows, privacy, and troubleshooting.",
      "Guide reads local scan health for latest scan, imported records, unknown costs, and priced-model coverage.",
      "First-run guided setup, agent quickstart, release readiness, and empty-state playbook are visible in the product."
    ],
    evidence: [
      "app/guide/page.tsx",
      "components/sidebar.tsx",
      "tests/guide-page.test.tsx"
    ]
  },
  {
    id: "TT-100-02",
    title: "Status-Line Truthfulness",
    outcome: "Claude Code status-line numbers are harder to misread.",
    status: "implemented",
    details: [
      "Status line leads with live context percentage and cost.",
      "Cumulative transcript usage is labeled processed instead of session size.",
      "Cache tokens stay visible to explain large processed totals."
    ],
    evidence: [
      "src/lib/claude-statusline.ts",
      "tests/claude-statusline.test.ts",
      "docs/assets/claude-statusline.svg"
    ]
  },
  {
    id: "TT-100-03",
    title: "Trend Continuity",
    outcome: "Token and cost charts do not visually hide idle days.",
    status: "implemented",
    details: [
      "Daily trend series fill missing calendar days with zero-value points.",
      "All-time trends span first imported usage day through last imported usage day.",
      "Weekly and monthly aggregation builds on the corrected daily series."
    ],
    evidence: [
      "src/lib/analytics.ts",
      "tests/trend-series.test.ts"
    ]
  },
  {
    id: "TT-100-04",
    title: "Release-Safe Agent Workflow",
    outcome: "Coding agents follow the same release discipline as maintainers.",
    status: "implemented",
    details: [
      "Repository-level instructions require Superpowers, ProjScan, changelog discipline, and explicit release approval.",
      "Claude Code instructions point to the same rules.",
      "Release checklist explains gates before any bump, tag, release, or npm publish."
    ],
    evidence: [
      "AGENTS.md",
      "CLAUDE.md",
      "docs/RELEASE_CHECKLIST.md",
      "CONTRIBUTING.md"
    ]
  },
  {
    id: "TT-100-05",
    title: "Agent Discovery Contract",
    outcome: "Coding agents can find and use TokenTrace without human command guesswork.",
    status: "implemented",
    details: [
      "CLI exposes read-only discovery through tokentrace agent --json and tokentrace capabilities --json.",
      "Dashboard exposes the same manifest through /api/agent and /api/capabilities.",
      "Package includes TOKENTRACE_AGENT.md, llms.txt, and docs/agent-discovery.schema.json.",
      "Follow-up commands are structured as argument arrays."
    ],
    evidence: [
      "src/lib/agent-discovery.ts",
      "scripts/agent.ts",
      "app/api/agent/route.ts",
      "app/api/capabilities/route.ts",
      "TOKENTRACE_AGENT.md",
      "llms.txt",
      "docs/agent-discovery.schema.json",
      "tests/agent-discovery.test.ts",
      "tests/agent-api.test.ts"
    ]
  },
  {
    id: "TT-100-06",
    title: "Product Polish And Verification",
    outcome: "The guidance remains compact, local-first, and verified.",
    status: "implemented",
    details: [
      "Focused tests cover Guide rendering, chart continuity, status-line clarity, agent discovery, API discovery, and roadmap status.",
      "Release-safe gates include verify, build, CLI smoke, packed-install smoke, package inspection, and ProjScan.",
      "Package inspection and packed smoke enforce the agent discovery docs, schema, CLI bin, and release status contract.",
      "Overview metric cards expose trust annotations so exact, estimated, unknown, cached, and imported values are explained near the number.",
      "Guide includes an empty-state playbook for no data, missing logs, unknown model rates, parser warnings, and sandbox smoke skips.",
      "Release status opens only after maintainer approval, a version bump, and the full release check."
    ],
    evidence: [
      "tests/guide-page.test.tsx",
      "tests/trend-series.test.ts",
      "tests/statusline-cli.test.ts",
      "tests/agent-discovery.test.ts",
      "tests/roadmap-status.test.ts",
      "tests/package-trust.test.ts",
      "scripts/smoke-cli.mjs",
      "scripts/smoke-packed-install.mjs",
      "scripts/package-inspect.mjs"
    ]
  }
];

export function buildRoadmapStatus(options: RoadmapStatusOptions = {}): RoadmapStatus {
  const versionBumped = isAtLeastVersion(options.packageVersion, "0.10.0");

  return {
    version: "0.10.0",
    codename: "Guided Operator",
    packageVersion: options.packageVersion ?? "unknown",
    thesis:
      "TokenTrace should explain itself where users and coding agents work: inside the local dashboard, CLI, and package metadata.",
    cards,
    verification: {
      requiredCommands: [
        "npm run verify",
        "npm run build",
        "npm run smoke:cli",
        "npm run smoke:packed",
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
            "CHANGELOG.md must have a complete versioned 0.10.0 section moved out of Unreleased.",
            "Final release requires docs/RELEASE_CHECKLIST.md and npm run release:check."
          ]
    }
  };
}
