import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expandHome } from "@/src/ingestion/discovery";

/**
 * Containment for endpoints that read a caller-supplied file path (parser
 * previews, import-profile previews).
 *
 * The dashboard's perimeter (see request-guard) already blocks remote and
 * cross-site callers, so the only legitimate caller is the user's own browser.
 * This module is defense-in-depth: even a same-origin request may only read
 * files under directories that could plausibly hold AI usage logs — the user's
 * home directory, the OS temp directory, and any explicitly configured import
 * folders. That keeps the feature usable (CLI logs live under $HOME) while
 * ensuring the dashboard can never be turned into a reader for `/etc/*`,
 * `/root/*`, other users' home directories, or files reached via symlink
 * escapes.
 */

export type PathAccessErrorCode = "invalid" | "not_found" | "forbidden";

export class PathAccessError extends Error {
  readonly code: PathAccessErrorCode;

  constructor(code: PathAccessErrorCode, message: string) {
    super(message);
    this.name = "PathAccessError";
    this.code = code;
  }
}

/** HTTP status that best matches each failure mode. */
export function pathAccessStatus(code: PathAccessErrorCode): number {
  switch (code) {
    case "invalid":
      return 400;
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
  }
}

async function realpathOrNull(target: string): Promise<string | null> {
  try {
    return await fs.realpath(target);
  } catch {
    return null;
  }
}

/** Resolve and de-duplicate the directories the dashboard may read from. */
export async function getAllowedReadRoots(extraRoots: string[] = []): Promise<string[]> {
  const base = [os.homedir(), os.tmpdir(), ...extraRoots.map((root) => expandHome(root.trim()))];
  const resolved = await Promise.all(
    base.filter(Boolean).map((root) => realpathOrNull(path.resolve(root)))
  );
  return Array.from(new Set(resolved.filter((root): root is string => Boolean(root))));
}

function isWithinRoot(target: string, root: string): boolean {
  if (target === root) return true;
  const rel = path.relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Validate a caller-supplied path and return its fully resolved (symlink-free)
 * form. Throws {@link PathAccessError} with a `code` that maps to an HTTP status
 * via {@link pathAccessStatus}.
 */
export async function resolveReadablePath(
  input: unknown,
  options: { extraRoots?: string[] } = {}
): Promise<string> {
  const expanded = typeof input === "string" ? expandHome(input.trim()) : "";
  if (!expanded) {
    throw new PathAccessError("invalid", "A file path is required.");
  }
  if (!path.isAbsolute(expanded)) {
    throw new PathAccessError("invalid", "File path must be absolute.");
  }

  const real = await realpathOrNull(expanded);
  if (!real) {
    throw new PathAccessError("not_found", `File not found: ${expanded}`);
  }

  const roots = await getAllowedReadRoots(options.extraRoots);
  if (!roots.some((root) => isWithinRoot(real, root))) {
    throw new PathAccessError(
      "forbidden",
      "Path is outside the allowed import directories (home, temp, and configured folders)."
    );
  }

  return real;
}
