import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileCandidate } from "./types";

const supportedExtensions = new Set([
  ".jsonl",
  ".json",
  ".log",
  ".txt",
  ".md",
  ".db",
  ".sqlite",
  ".sqlite3"
]);

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
  const present: string[] = [];
  for (const candidate of unique) {
    if (await exists(candidate)) present.push(candidate);
  }
  return present;
}

async function walkDirectory(root: string, depth: number, maxDepth: number, results: FileCandidate[]) {
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
      await walkDirectory(fullPath, depth + 1, maxDepth, results);
      continue;
    }

    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) continue;

    try {
      const stat = await fs.stat(fullPath);
      if (stat.size <= 0 || stat.size > 25 * 1024 * 1024) continue;
      results.push({
        path: fullPath,
        modifiedTime: stat.mtime,
        sizeBytes: stat.size
      });
    } catch {
      continue;
    }
  }
}

export async function discoverFiles(roots: string[]) {
  const results: FileCandidate[] = [];
  for (const root of roots) {
    const stat = await fs.stat(root).catch(() => null);
    if (!stat) continue;
    if (stat.isFile()) {
      const extension = path.extname(root).toLowerCase();
      if (supportedExtensions.has(extension)) {
        results.push({
          path: root,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size
        });
      }
      continue;
    }
    if (stat.isDirectory()) {
      await walkDirectory(root, 0, 12, results);
    }
  }

  const deduped = new Map<string, FileCandidate>();
  for (const result of results) deduped.set(result.path, result);
  return Array.from(deduped.values()).sort((a, b) => a.path.localeCompare(b.path));
}
