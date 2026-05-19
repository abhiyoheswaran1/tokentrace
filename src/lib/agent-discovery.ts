export type AgentDiscoveryCommand = {
  id: string;
  title: string;
  command: string[];
  description: string;
  output: "json" | "markdown" | "text" | "terminal";
  mutatesLocalState: boolean;
  startsLongRunningProcess: boolean;
  requiresNetwork: boolean;
  safeForAutomation: boolean;
  useWhen: string;
  followUps: string[][];
  notes?: string[];
};

export type AgentDiscoveryManifest = {
  schema: string;
  schemaVersion: 1;
  product: {
    name: "TokenTrace";
    packageName: "tokentrace";
    version: string;
    description: string;
    homepage: string;
    repository: string;
  };
  discoveryCommands: string[][];
  apiEndpoints: Array<{
    method: "GET";
    path: string;
    description: string;
  }>;
  install: {
    runWithoutInstalling: string[];
    installGlobal: string[];
    startDashboard: string[];
  };
  privacy: {
    localFirst: boolean;
    telemetry: boolean;
    cloudAccountRequired: boolean;
    usageLogsLeaveMachine: boolean;
    writesLocalDatabase: string[];
    networkUse: Array<{ command: string[]; reason: string }>;
  };
  commands: AgentDiscoveryCommand[];
  workflows: Array<{
    id: string;
    title: string;
    goal: string;
    steps: string[][];
  }>;
  integrations: {
    claudeCode: {
      statusLineSetupCommand: string[];
      statusLineCommand: string[];
      notes: string[];
    };
    codex: {
      recommendedFallbackCommand: string[];
      nativeStatusLineStatus: string;
      notes: string[];
    };
  };
  guardrails: Array<{
    id: string;
    rule: string;
  }>;
};

type AgentDiscoveryOptions = {
  version?: string;
};

const product = {
  name: "TokenTrace" as const,
  packageName: "tokentrace" as const,
  description: "Local-first dashboard and CLI for AI coding-agent token, cost, session, and parser analytics.",
  homepage: "https://www.abhiyoheswaran.com/apps/tokentrace",
  repository: "https://github.com/abhiyoheswaran1/tokentrace"
};

const commands: AgentDiscoveryCommand[] = [
  {
    id: "scan",
    title: "Scan local AI CLI usage logs",
    command: ["tokentrace", "scan", "--json"],
    description: "Discover supported Claude Code, Codex, OpenAI, and configured local artifacts, then import normalized usage records.",
    output: "json",
    mutatesLocalState: true,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs current local usage data before reporting, optimizing, or opening the dashboard.",
    followUps: [
      ["tokentrace", "doctor", "--json"],
      ["tokentrace", "digest", "--json"],
      ["tokentrace", "status", "--json"]
    ]
  },
  {
    id: "doctor",
    title: "Inspect scan health and repair recommendations",
    command: ["tokentrace", "doctor", "--json"],
    description: "Return scan freshness, parser trust, support matrix, scan diffs, and recommended repairs.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs to decide whether local TokenTrace data is complete enough to trust.",
    followUps: [
      ["tokentrace", "repair", "--json"],
      ["tokentrace", "evidence", "--json"]
    ]
  },
  {
    id: "evidence",
    title: "Print metric evidence trails",
    command: ["tokentrace", "evidence", "--json"],
    description: "Explain where aggregate token, cost, session, guardrail, and review numbers came from.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs source-backed details before making a claim about usage or cost.",
    followUps: [
      ["tokentrace", "evidence", "--json", "--metric=processed-tokens"],
      ["tokentrace", "evidence", "--json", "--metric=unknown-cost"]
    ]
  },
  {
    id: "repair",
    title: "Print unknown-cost repair queue",
    command: ["tokentrace", "repair", "--json"],
    description: "Group unknown cost issues by model, parser, and repair path.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent sees unknown cost or model-rate gaps and needs the next repair action.",
    followUps: [
      ["tokentrace", "evidence", "--json", "--metric=unknown-cost"],
      ["tokentrace", "pricing", "refresh", "--json"]
    ]
  },
  {
    id: "digest",
    title: "Print current usage digest",
    command: ["tokentrace", "digest", "--json"],
    description: "Return a compact daily or scoped usage summary with guardrails, review queue, top project, and scan status.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs a concise local usage summary for a response, report, or check-in.",
    followUps: [
      ["tokentrace", "digest", "--json", "--since", "yesterday"],
      ["tokentrace", "report", "--markdown", "--since", "yesterday"]
    ]
  },
  {
    id: "report",
    title: "Print deterministic Markdown report",
    command: ["tokentrace", "report", "--markdown"],
    description: "Render a local Markdown report suitable for review notes and handoffs.",
    output: "markdown",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs human-readable usage notes without opening the dashboard.",
    followUps: [
      ["tokentrace", "report", "--markdown", "--since", "yesterday"],
      ["tokentrace", "report", "--json"]
    ]
  },
  {
    id: "roadmap",
    title: "Print Local Sources & Trust release handoff",
    command: ["tokentrace", "roadmap", "--json"],
    description: "Return current release, rolled-up roadmap themes, action recipes, evidence paths, verification gates, and release status.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs to explain Local Sources & Trust implementation, action recipes, and verification status.",
    followUps: [
      ["tokentrace", "agent", "--json"]
    ]
  },
  {
    id: "status",
    title: "Print local live usage status",
    command: ["tokentrace", "status", "--json"],
    description: "Return the current local status snapshot used by terminal watch and status-line surfaces.",
    output: "json",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The agent needs a quick current usage snapshot.",
    followUps: [
      ["tokentrace", "watch", "--session", "--compact"]
    ]
  },
  {
    id: "claude-statusline",
    title: "Configure Claude Code status line",
    command: ["tokentrace", "statusline", "setup", "claude"],
    description: "Print the Claude Code statusLine JSON block that runs TokenTrace locally.",
    output: "text",
    mutatesLocalState: false,
    startsLongRunningProcess: false,
    requiresNetwork: false,
    safeForAutomation: true,
    useWhen: "The human asks to add TokenTrace to Claude Code.",
    followUps: [
      ["tokentrace", "statusline", "claude"]
    ],
    notes: [
      "Do not set Claude Code statusLine.command to plain tokentrace because that starts the dashboard."
    ]
  },
  {
    id: "watch",
    title: "Watch local status in a terminal split",
    command: ["tokentrace", "watch", "--session", "--compact"],
    description: "Render a compact terminal status line repeatedly until interrupted.",
    output: "terminal",
    mutatesLocalState: false,
    startsLongRunningProcess: true,
    requiresNetwork: false,
    safeForAutomation: false,
    useWhen: "The human wants a live sidecar while using Codex or another CLI without native status-line support.",
    followUps: [
      ["tokentrace", "status", "--json"]
    ]
  },
  {
    id: "dashboard",
    title: "Start local dashboard",
    command: ["tokentrace", "serve", "--no-open"],
    description: "Start the local Next.js dashboard on an available localhost port.",
    output: "terminal",
    mutatesLocalState: true,
    startsLongRunningProcess: true,
    requiresNetwork: false,
    safeForAutomation: false,
    useWhen: "The human wants to inspect TokenTrace interactively in a browser.",
    followUps: [
      ["tokentrace", "serve", "--port", "3210", "--no-open"]
    ],
    notes: [
      "The dashboard initializes local app data and keeps a server process running until interrupted."
    ]
  },
  {
    id: "pricing-refresh",
    title: "Refresh public model prices",
    command: ["tokentrace", "pricing", "refresh", "--json"],
    description: "Fetch public provider model rates and update editable local model-rate rows.",
    output: "json",
    mutatesLocalState: true,
    startsLongRunningProcess: false,
    requiresNetwork: true,
    safeForAutomation: false,
    useWhen: "The human asks to refresh provider rates or unknown costs appear caused by stale bundled model rates.",
    followUps: [
      ["tokentrace", "repair", "--json"],
      ["tokentrace", "doctor", "--json"]
    ],
    notes: [
      "Usage logs, prompts, file paths, and analytics are not sent with the price refresh request."
    ]
  }
];

export function buildAgentDiscoveryManifest(options: AgentDiscoveryOptions = {}): AgentDiscoveryManifest {
  return {
    schema: "https://github.com/abhiyoheswaran1/tokentrace/blob/main/docs/agent-discovery.schema.json",
    schemaVersion: 1,
    product: {
      ...product,
      version: options.version ?? "unknown"
    },
    discoveryCommands: [
      ["tokentrace", "agent", "--json"],
      ["tokentrace", "capabilities", "--json"]
    ],
    apiEndpoints: [
      {
        method: "GET",
        path: "/api/agent",
        description: "Return the same agent discovery manifest from the local dashboard."
      },
      {
        method: "GET",
        path: "/api/capabilities",
        description: "Alias for /api/agent."
      }
    ],
    install: {
      runWithoutInstalling: ["npx", "tokentrace", "agent", "--json"],
      installGlobal: ["npm", "install", "-g", "tokentrace"],
      startDashboard: ["tokentrace", "serve"]
    },
    privacy: {
      localFirst: true,
      telemetry: false,
      cloudAccountRequired: false,
      usageLogsLeaveMachine: false,
      writesLocalDatabase: [
        "tokentrace scan --json",
        "tokentrace serve",
        "tokentrace pricing refresh --json",
        "tokentrace reset"
      ],
      networkUse: [
        {
          command: ["tokentrace", "pricing", "refresh", "--json"],
          reason: "Fetch public model prices only."
        }
      ]
    },
    commands,
    workflows: [
      {
        id: "first-use",
        title: "First local usage import",
        goal: "Discover TokenTrace capabilities, scan local files, then inspect health before reporting numbers.",
        steps: [
          ["tokentrace", "agent", "--json"],
          ["tokentrace", "scan", "--json"],
          ["tokentrace", "doctor", "--json"],
          ["tokentrace", "digest", "--json"]
        ]
      },
      {
        id: "daily-review",
        title: "Daily usage review",
        goal: "Summarize recent usage without opening the dashboard.",
        steps: [
          ["tokentrace", "scan", "--json"],
          ["tokentrace", "digest", "--json", "--since", "yesterday"],
          ["tokentrace", "report", "--markdown", "--since", "yesterday"]
        ]
      },
      {
        id: "cost-repair",
        title: "Unknown cost repair",
        goal: "Find missing model-rate, model, or token data before making cost claims.",
        steps: [
          ["tokentrace", "doctor", "--json"],
          ["tokentrace", "repair", "--json"],
          ["tokentrace", "evidence", "--json", "--metric=unknown-cost"]
        ]
      },
      {
        id: "claude-code-statusline",
        title: "Claude Code status line setup",
        goal: "Help a human install TokenTrace as a Claude Code status-line command.",
        steps: [
          ["tokentrace", "statusline", "setup", "claude"]
        ]
      },
      {
        id: "codex-sidecar",
        title: "Codex sidecar status",
        goal: "Use a terminal split while Codex native status-line hooks remain unstable.",
        steps: [
          ["tokentrace", "watch", "--session", "--compact"]
        ]
      }
    ],
    integrations: {
      claudeCode: {
        statusLineSetupCommand: ["tokentrace", "statusline", "setup", "claude"],
        statusLineCommand: ["tokentrace", "statusline", "claude"],
        notes: [
          "Claude Code sends status-line session JSON to stdin.",
          "TokenTrace prints exactly one status-line response for this integration."
        ]
      },
      codex: {
        recommendedFallbackCommand: ["tokentrace", "watch", "--session", "--compact"],
        nativeStatusLineStatus: "deferred until Codex exposes a stable custom status-line or hook contract",
        notes: [
          "Do not parse Codex terminal output.",
          "Do not modify Codex config automatically."
        ]
      }
    },
    guardrails: [
      {
        id: "no-reset-without-human",
        rule: "Never run tokentrace reset unless a human explicitly asks to clear imported local data."
      },
      {
        id: "processed-is-not-context",
        rule: "Do not describe processed tokens as current context size. Use ctx for live context-window pressure."
      },
      {
        id: "evidence-before-claims",
        rule: "Run doctor or evidence before making strong claims about missing data, parser confidence, cost, or totals."
      },
      {
        id: "respect-local-data",
        rule: "Treat TokenTrace database paths, source file paths, prompts, and raw transcript settings as local sensitive data."
      }
    ]
  };
}
