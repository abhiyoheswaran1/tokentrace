import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { applyMigrations } from "./migrate-core";
import { registerSqliteFunctions } from "./sqlite-functions";
import * as schema from "./schema";

const defaultDbPath = path.join(process.cwd(), ".tokentrace", "tokentrace.db");

function databaseUrlPath(value: string | undefined) {
  if (!value?.startsWith("file:")) return null;
  try {
    return fileURLToPath(value);
  } catch {
    return value.slice("file:".length);
  }
}

const dbPath = process.env.TOKENTRACE_DB ?? databaseUrlPath(process.env.DATABASE_URL) ?? defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const sqlite = new Database(dbPath);
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("foreign_keys = ON");
registerSqliteFunctions(sqlite);
applyMigrations(sqlite);

export const db = drizzle(sqlite, { schema });

export function getDatabasePath() {
  return dbPath;
}
