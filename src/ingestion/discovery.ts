import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { builtInImportProfiles, enabledImportProfileMatchers, type ImportProfile } from "@/src/lib/import-profiles";
import { FileCandidate, IgnoredFileCandidate } from "./types";
import { isClaudeCodeUsagePath, isCodexCliUsagePath, nonUsageFileReason } from "./path-classifier";

const supportedExtensions = new Set([".json", ...enabledImportProfileMatchers(builtInImportProfiles)]);

const skippedDirectories = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "out",
  "build",
  "coverage",
  "Library",
  "Applications"
]);

const defaultMaxFileSize = 25 * 1024 * 1024;
const largeSessionMaxFileSize = 512 * 1024 * 1024;

export function expandHome(input: string) {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function getDefaultSearchRoots(customFolders: string[] = []) {
  const home = os.homedir();
  const workingDirectory = process.env.TOKENTRACE_WORKDIR ?? process.cwd();
  const appDataDir = process.env.TOKENTRACE_APP_DATA_DIR;
  const candidates = [
    path.join(home, ".claude"),
    path.join(home, ".config", "claude"),
    path.join(home, ".codex"),
    path.join(home, ".config", "codex"),
    path.join(home, ".openai"),
    path.join(workingDirectory, ".claude"),
    path.join(workingDirectory, ".codex"),
    path.join(workingDirectory, ".openai"),
    path.join(workingDirectory, ".ai"),
    ...(appDataDir ? [path.join(appDataDir, "wrapper-runs")] : []),
    ...customFolders.map(expandHome)
  ];

  const unique = Array.from(new Set(candidates.map((candidate) => path.resolve(candidate))));
  const presence = await Promise.all(unique.map(async (candidate) => ({ candidate, present: await exists(candidate) })));
  return presence.filter((entry) => entry.present).map((entry) => entry.candidate);
}

type DiscoveryBuckets = {
  candidates: FileCandidate[];
  ignored: IgnoredFileCandidate[];
};

function supportedExtensionsFor(profiles: ImportProfile[] = builtInImportProfiles) {
  return new Set([...supportedExtensions, ...enabledImportProfileMatchers(profiles)]);
}

async function addSupportedFile(fullPath: string, buckets: DiscoveryBuckets, extensions: Set<string>) {
  const extension = path.extname(fullPath).toLowerCase();
  if (!extensions.has(extension)) return;

  try {
    const stat = await fs.stat(fullPath);
    const isCodexJsonlSession =
      extension === ".jsonl" && isCodexCliUsagePath(fullPath);
    const isClaudeJsonlSession =
      extension === ".jsonl" && isClaudeCodeUsagePath(fullPath);
    const maxFileSize =
      isCodexJsonlSession || isClaudeJsonlSession ? largeSessionMaxFileSize : defaultMaxFileSize;
    if (stat.size <= 0 || stat.size > maxFileSize) return;

    const ignoreReason = nonUsageFileReason(fullPath);
    if (ignoreReason) {
      buckets.ignored.push({
        path: fullPath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size,
        ignoreReason
      });
      return;
    }

    buckets.candidates.push({
      path: fullPath,
      modifiedTime: stat.mtime,
      sizeBytes: stat.size
    });
  } catch {
    return;
  }
}

async function walkDirectory(root: string, depth: number, maxDepth: number, buckets: DiscoveryBuckets, extensions: Set<string>) {
  if (depth > maxDepth) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) continue;
      await walkDirectory(fullPath, depth + 1, maxDepth, buckets, extensions);
      continue;
    }

    if (!entry.isFile()) continue;
    await addSupportedFile(fullPath, buckets, extensions);
  }
}

export async function discoverFilesWithIgnored(roots: string[], importProfiles?: ImportProfile[]) {
  const buckets: DiscoveryBuckets = {
    candidates: [],
    ignored: []
  };
  const extensions = supportedExtensionsFor(importProfiles);

  for (const root of roots) {
    const stat = await fs.stat(root).catch(() => null);
    if (!stat) continue;
    if (stat.isFile()) {
      await addSupportedFile(root, buckets, extensions);
      continue;
    }
    if (stat.isDirectory()) {
      await walkDirectory(root, 0, 12, buckets, extensions);
    }
  }

  const candidates = new Map<string, FileCandidate>();
  const ignored = new Map<string, IgnoredFileCandidate>();
  for (const result of buckets.candidates) candidates.set(result.path, result);
  for (const result of buckets.ignored) ignored.set(result.path, result);

  return {
    candidates: Array.from(candidates.values()).sort((a, b) => a.path.localeCompare(b.path)),
    ignored: Array.from(ignored.values()).sort((a, b) => a.path.localeCompare(b.path))
  };
}

export async function discoverFiles(roots: string[]) {
  return (await discoverFilesWithIgnored(roots)).candidates;
}
