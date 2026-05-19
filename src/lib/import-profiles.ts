export type ImportProfile = {
  id: string;
  label: string;
  kind: "jsonl" | "text-log" | "sqlite-history" | "cursor-chat";
  description: string;
  matchers: string[];
  enabled: boolean;
  builtIn?: boolean;
};

export const builtInImportProfiles: ImportProfile[] = [
  {
    id: "structured-usage-log",
    label: "Structured usage logs",
    kind: "jsonl",
    description: "Local wrapper or team JSONL records with session, model, usage, and optional cost fields.",
    matchers: [".jsonl", ".ndjson"],
    enabled: true,
    builtIn: true
  },
  {
    id: "cursor-chat-export",
    label: "Cursor chat exports",
    kind: "cursor-chat",
    description: "Cursor-style JSON chat or composer exports with conversations and messages.",
    matchers: ["cursor", "composer", ".json"],
    enabled: true,
    builtIn: true
  },
  {
    id: "generic-jsonl",
    label: "Generic JSONL usage",
    kind: "jsonl",
    description: "Line-delimited JSON records with usage, model, role, or token fields.",
    matchers: [".jsonl"],
    enabled: true,
    builtIn: true
  },
  {
    id: "generic-text-log",
    label: "Generic text usage log",
    kind: "text-log",
    description: "Plain text logs with token, model, session, or cost-like usage lines.",
    matchers: [".log", ".txt", ".md"],
    enabled: true,
    builtIn: true
  },
  {
    id: "sqlite-history",
    label: "SQLite usage history",
    kind: "sqlite-history",
    description: "Local SQLite databases with usage-shaped history tables.",
    matchers: [".db", ".sqlite", ".sqlite3"],
    enabled: true,
    builtIn: true
  }
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function normalizeKind(value: unknown): ImportProfile["kind"] {
  if (value === "sqlite-history" || value === "text-log" || value === "jsonl" || value === "cursor-chat") return value;
  return "text-log";
}

function normalizeMatchers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

export function normalizeImportProfiles(value: unknown): ImportProfile[] {
  const custom = Array.isArray(value) ? value : [];
  const builtIns = builtInImportProfiles.map((profile) => {
    const override = custom.find((item) => {
      return item && typeof item === "object" && (item as Record<string, unknown>).id === profile.id;
    }) as Record<string, unknown> | undefined;
    return {
      ...profile,
      enabled: override?.enabled === false ? false : profile.enabled
    };
  });
  const customProfiles = custom
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.id === "string" && !builtInImportProfiles.some((profile) => profile.id === item.id))
    .map((item) => {
      const label = typeof item.label === "string" && item.label.trim() ? item.label.trim().slice(0, 80) : "Custom import profile";
      const matchers = normalizeMatchers(item.matchers);
      const id = typeof item.id === "string" && item.id.startsWith("custom-")
        ? item.id
        : `custom-${slug(label) || "profile"}`;
      return {
        id,
        label,
        kind: normalizeKind(item.kind),
        description:
          typeof item.description === "string" && item.description.trim()
            ? item.description.trim().slice(0, 240)
            : "Custom local log convention.",
        matchers,
        enabled: item.enabled !== false,
        builtIn: false
      };
    })
    .filter((profile) => profile.matchers.length > 0);

  return [...builtIns, ...customProfiles];
}

function matcherMatches(filePath: string, matcher: string) {
  const normalized = matcher.toLowerCase();
  const target = filePath.toLowerCase();
  if (normalized.startsWith(".")) return target.endsWith(normalized);
  return target.includes(normalized);
}

export function enabledImportProfileMatchers(profiles: ImportProfile[]) {
  return profiles
    .filter((profile) => profile.enabled)
    .flatMap((profile) => profile.matchers)
    .filter((matcher) => matcher.startsWith("."));
}

export function importProfileForAdapter(adapterId: string, filePath?: string, profiles = builtInImportProfiles): ImportProfile | null {
  const custom = filePath
    ? profiles.find((profile) => profile.enabled && !profile.builtIn && profile.matchers.some((matcher) => matcherMatches(filePath, matcher)))
    : null;
  if (custom) return custom;
  if (adapterId === "sqlite-history") return profiles.find((profile) => profile.id === "sqlite-history") ?? null;
  if (adapterId === "structured-usage-log") return profiles.find((profile) => profile.id === "structured-usage-log") ?? null;
  if (adapterId === "cursor-chat-export") return profiles.find((profile) => profile.id === "cursor-chat-export") ?? null;
  if (adapterId === "generic-jsonl") return profiles.find((profile) => profile.id === "generic-jsonl") ?? null;
  if (adapterId === "generic-log") return profiles.find((profile) => profile.id === "generic-text-log") ?? null;
  return null;
}
