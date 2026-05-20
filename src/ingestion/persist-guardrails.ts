import type { NormalizedSession } from "./types";

export type ImportPreflightResult = {
  warnings: string[];
};

export type ImportPreflightOptions = {
  replaceSourceFile?: string;
};

function sessionKey(session: NormalizedSession) {
  return [
    session.tool.id,
    session.sourceFile,
    session.externalId ?? session.title ?? "untitled"
  ].join(" / ");
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function preflightImportSessions(
  sessions: NormalizedSession[],
  options: ImportPreflightOptions = {}
): ImportPreflightResult {
  const warnings: string[] = [];
  if (!sessions.length) {
    warnings.push("No normalized sessions were provided for import; check parser warnings or malformed local files.");
    return { warnings };
  }

  const emptySessions = sessions.filter((session) => session.interactions.length === 0);
  if (emptySessions.length) {
    warnings.push(
      `${emptySessions.length.toLocaleString()} normalized session(s) had no interactions; only session shells can be imported.`
    );
  }

  const duplicates = new Map<string, number>();
  for (const session of sessions) {
    const key = sessionKey(session);
    duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
  }
  for (const [key, count] of duplicates.entries()) {
    if (count > 1) {
      warnings.push(
        `Duplicate normalized sessions detected for ${key}; import keeps the first copy and ignores later duplicates.`
      );
    }
  }

  if (options.replaceSourceFile) {
    const parsedFiles = uniqueValues(sessions.map((session) => session.sourceFile));
    if (!parsedFiles.includes(options.replaceSourceFile)) {
      warnings.push(
        `Replace requested for ${options.replaceSourceFile}, but parsed sessions came from ${parsedFiles.join(", ")}. Existing rows for the parsed file will not be purged.`
      );
    }
  }

  return { warnings };
}
