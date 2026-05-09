import path from "node:path";

const claudeSupportDirectories = new Set(["cache", "plugins", "todos"]);
const codexSupportDirectories = new Set(["cache", "logs", "plugins", "tmp", "todos"]);

function lowerSegments(filePath: string) {
  return path.resolve(filePath).split(path.sep).map((segment) => segment.toLowerCase());
}

function claudeRootIndex(segments: string[]) {
  const dotClaude = segments.lastIndexOf(".claude");
  if (dotClaude !== -1) return dotClaude;

  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index - 1] === ".config" && segments[index] === "claude") return index;
  }

  return -1;
}

function codexRootIndex(segments: string[]) {
  const dotCodex = segments.lastIndexOf(".codex");
  if (dotCodex !== -1) return dotCodex;

  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index - 1] === ".config" && segments[index] === "codex") return index;
  }

  return -1;
}

export function isClaudePath(filePath: string) {
  return claudeRootIndex(lowerSegments(filePath)) !== -1;
}

export function isKnownClaudeSupportPath(filePath: string) {
  const segments = lowerSegments(filePath);
  const rootIndex = claudeRootIndex(segments);
  if (rootIndex === -1) return false;
  return claudeSupportDirectories.has(segments[rootIndex + 1] ?? "");
}

export function isClaudeCodeUsagePath(filePath: string) {
  const segments = lowerSegments(filePath);
  const rootIndex = claudeRootIndex(segments);
  if (rootIndex === -1) return false;

  const projectsIndex = segments.indexOf("projects", rootIndex + 1);
  if (projectsIndex !== rootIndex + 1) return false;
  if (!segments[projectsIndex + 1]) return false;

  return path.extname(filePath).toLowerCase() === ".jsonl";
}

export function isNonUsageClaudePath(filePath: string) {
  return isClaudePath(filePath) && !isClaudeCodeUsagePath(filePath);
}

export function isCodexPath(filePath: string) {
  return codexRootIndex(lowerSegments(filePath)) !== -1;
}

export function isCodexCliUsagePath(filePath: string) {
  const segments = lowerSegments(filePath);
  const rootIndex = codexRootIndex(segments);
  if (rootIndex === -1) return false;

  const extension = path.extname(filePath).toLowerCase();
  if (extension !== ".jsonl" && extension !== ".log") return false;

  const firstChild = segments[rootIndex + 1] ?? "";
  return firstChild === "sessions" || firstChild === "rollouts";
}

export function isNonUsageCodexPath(filePath: string) {
  const segments = lowerSegments(filePath);
  const rootIndex = codexRootIndex(segments);
  if (rootIndex === -1) return false;
  if (isCodexCliUsagePath(filePath)) return false;

  const firstChild = segments[rootIndex + 1] ?? "";
  if (codexSupportDirectories.has(firstChild)) return true;
  return true;
}

export function nonUsageFileReason(filePath: string) {
  if (isNonUsageClaudePath(filePath)) {
    return isKnownClaudeSupportPath(filePath)
      ? "Claude support file outside project transcripts"
      : "Claude file outside project transcripts";
  }

  if (isNonUsageCodexPath(filePath)) {
    return "Codex support file outside session artifacts";
  }

  return null;
}
