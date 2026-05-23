import path from "node:path";
import { sqlite } from "@/src/db/client";

export type ParserOverride = {
  path: string;
  parserId: string | null;
  excluded: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SetParserOverrideInput = {
  path: string;
  parserId?: string;
  excluded?: boolean;
  note?: string | null;
};

type Row = {
  path: string;
  parser_id: string | null;
  excluded: number;
  note: string | null;
  created_at: number;
  updated_at: number;
};

function toOverride(row: Row): ParserOverride {
  return {
    path: row.path,
    parserId: row.parser_id,
    excluded: row.excluded === 1,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function normalizePath(input: string): string {
  return path.resolve(input.trim());
}

export function setParserOverride(input: SetParserOverrideInput): ParserOverride {
  const trimmed = input.path?.trim();
  if (!trimmed) throw new Error("parser override: path is required");
  const normalizedPath = normalizePath(trimmed);

  const excluded = input.excluded === true;
  const parserId = excluded ? null : input.parserId?.trim() || null;

  if (!excluded && !parserId) {
    throw new Error("parser override: parserId or excluded must be provided");
  }
  if (excluded && input.parserId) {
    throw new Error("parser override: parserId must be omitted when excluded is true");
  }

  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO file_parser_overrides (path, parser_id, excluded, note, created_at, updated_at)
       VALUES (@path, @parser_id, @excluded, @note, @now, @now)
       ON CONFLICT(path) DO UPDATE SET
         parser_id = excluded.parser_id,
         excluded = excluded.excluded,
         note = excluded.note,
         updated_at = excluded.updated_at`
    )
    .run({ path: normalizedPath, parser_id: parserId, excluded: excluded ? 1 : 0, note, now });

  const stored = getParserOverride(normalizedPath);
  if (!stored) throw new Error("parser override: persisted row not found after write");
  return stored;
}

export function getParserOverride(filePath: string): ParserOverride | null {
  if (!filePath?.trim()) return null;
  const normalized = normalizePath(filePath);
  const row = sqlite
    .prepare(
      `SELECT path, parser_id, excluded, note, created_at, updated_at
       FROM file_parser_overrides
       WHERE path = ?`
    )
    .get(normalized) as Row | undefined;
  return row ? toOverride(row) : null;
}

export function listParserOverrides(): ParserOverride[] {
  const rows = sqlite
    .prepare(
      `SELECT path, parser_id, excluded, note, created_at, updated_at
       FROM file_parser_overrides
       ORDER BY updated_at DESC, path ASC`
    )
    .all() as Row[];
  return rows.map(toOverride);
}

export function clearParserOverride(filePath: string): boolean {
  if (!filePath?.trim()) return false;
  const normalized = normalizePath(filePath);
  const result = sqlite
    .prepare(`DELETE FROM file_parser_overrides WHERE path = ?`)
    .run(normalized);
  return result.changes > 0;
}
