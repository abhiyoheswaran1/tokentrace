import type Database from "better-sqlite3";
import { sqlite } from "./client";

const cache = new Map<string, Database.Statement>();

export function prepareCached(sql: string): Database.Statement {
  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = sqlite.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

export function clearPreparedCache(): void {
  cache.clear();
}
