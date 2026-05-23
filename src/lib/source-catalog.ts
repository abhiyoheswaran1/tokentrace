export type SourceCatalogTier = "native" | "profile-assisted" | "fallback";
export type SourceCatalogNextAction = "scan" | "configure-profile" | "preview-profile" | "report-fixture";

export type SourceCatalogEntry = {
  id: string;
  label: string;
  tier: SourceCatalogTier;
  matchers: string[];
  confidence: "high" | "medium" | "low";
  nextAction: SourceCatalogNextAction;
  description: string;
};

export type SourceCoverageInput = {
  parser: string | null;
  status: string;
  recordsImported: number;
  rawMetadata: Record<string, unknown>;
};

export type SourceCoverageSummary = {
  nativeFiles: number;
  profileAssistedFiles: number;
  fallbackFiles: number;
  unsupportedFiles: number;
  importedRecords: number;
};

const entries: SourceCatalogEntry[] = [
  {
    id: "claude-code",
    label: "Claude Code transcripts",
    tier: "native",
    matchers: [".jsonl"],
    confidence: "high",
    nextAction: "scan",
    description: "Claude Code local transcript records with provider usage metadata."
  },
  {
    id: "codex-cli",
    label: "Codex CLI sessions",
    tier: "native",
    matchers: [".jsonl"],
    confidence: "high",
    nextAction: "scan",
    description: "Codex CLI local session logs and usage records."
  },
  {
    id: "structured-usage-log",
    label: "Structured local usage logs",
    tier: "native",
    matchers: [".jsonl", ".ndjson", ".usage"],
    confidence: "high",
    nextAction: "scan",
    description: "Wrapper or team logs with session, model, token, and optional cost fields."
  },
  {
    id: "cursor-chat-export",
    label: "Cursor chat exports",
    tier: "native",
    matchers: ["cursor", "composer", ".json"],
    confidence: "high",
    nextAction: "scan",
    description: "Cursor-style chat and composer exports with conversations and messages."
  },
  {
    id: "sqlite-history",
    label: "SQLite usage history",
    tier: "native",
    matchers: [".db", ".sqlite", ".sqlite3"],
    confidence: "medium",
    nextAction: "scan",
    description: "Local SQLite databases with usage-shaped tables."
  },
  {
    id: "generic-jsonl",
    label: "Profile-assisted JSONL",
    tier: "profile-assisted",
    matchers: [".jsonl", ".ndjson"],
    confidence: "medium",
    nextAction: "configure-profile",
    description: "Line-delimited records interpreted through generic usage field extraction."
  },
  {
    id: "generic-json",
    label: "Profile-assisted JSON",
    tier: "profile-assisted",
    matchers: [".json"],
    confidence: "medium",
    nextAction: "preview-profile",
    description: "JSON arrays or objects that contain usage-like message records."
  },
  {
    id: "generic-log",
    label: "Fallback text logs",
    tier: "fallback",
    matchers: [".log", ".txt", ".md"],
    confidence: "low",
    nextAction: "preview-profile",
    description: "Text logs with model, token, cost, or session-like lines."
  }
];

export function buildSourceCatalog() {
  return {
    generatedAt: new Date().toISOString(),
    entries
  };
}

const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

function metadataTier(row: SourceCoverageInput): SourceCatalogTier | null {
  const catalog = row.rawMetadata.sourceCatalog;
  if (catalog && typeof catalog === "object") {
    const tier = (catalog as Record<string, unknown>).tier;
    if (tier === "native" || tier === "profile-assisted" || tier === "fallback") return tier;
  }
  const profile = row.rawMetadata.importProfile;
  if (profile && typeof profile === "object" && (profile as Record<string, unknown>).builtIn === false) {
    return "profile-assisted";
  }
  return row.parser ? entriesById.get(row.parser)?.tier ?? null : null;
}

export function summarizeSourceCoverage(rows: SourceCoverageInput[]): SourceCoverageSummary {
  return rows.reduce<SourceCoverageSummary>(
    (summary, row) => {
      const tier = metadataTier(row);
      if (tier === "native") summary.nativeFiles += 1;
      else if (tier === "profile-assisted") summary.profileAssistedFiles += 1;
      else if (tier === "fallback") summary.fallbackFiles += 1;
      else summary.unsupportedFiles += 1;
      summary.importedRecords += row.recordsImported;
      return summary;
    },
    {
      nativeFiles: 0,
      profileAssistedFiles: 0,
      fallbackFiles: 0,
      unsupportedFiles: 0,
      importedRecords: 0
    }
  );
}

export function sourceCatalogEntryForParser(parser: string | null): SourceCatalogEntry | null {
  if (!parser) return null;
  return entriesById.get(parser) ?? null;
}
